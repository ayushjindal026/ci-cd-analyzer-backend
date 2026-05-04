import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from app.config import settings
from app.dto.schemas import AnalysisRequest, AnalysisResponse, HealthResponse
from app.services.github_log_fetcher import GitHubLogFetcher
from app.services.llm_analyzer import LLMAnalyzer
from app.routes.analyze import router

# Configure logging once at startup
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    WHY lifespan instead of @app.on_event("startup")?
    @app.on_event is deprecated in FastAPI 0.95+.
    Lifespan is the current pattern — runs setup before yield,
    teardown after yield. Cleaner and supports async context managers.
    """
    logger.info("AI Service starting — model: %s", settings.openai_model)
    yield
    logger.info("AI Service shutting down")


app = FastAPI(
    title="CI/CD Analyzer — AI Service",
    description="Classifies CI/CD failures and suggests fixes using LLM",
    version="1.0.0",
    lifespan=lifespan,
)

# Instantiate once — shared across all requests
log_fetcher = GitHubLogFetcher()
llm_analyzer = LLMAnalyzer()
app.include_router(router)

@app.get("/health", response_model=HealthResponse)
def health():
    """
    Called by Spring Boot before every analysis request
    to verify the AI service is reachable.
    Also used by Docker health checks.
    """
    return {
        "status": "UP",
        "model": "llama-3.1-8b-instant"
    }


@app.post("/analyze", response_model=AnalysisResponse)
def analyze(request: AnalysisRequest):
    """
    Main endpoint — called by Spring Boot for every failed run.

    Flow:
    1. Fetch console logs from GitHub API
    2. Send logs + metadata to LLM
    3. Return structured analysis

    WHY synchronous (def not async def)?
    The GitHub log fetch and OpenAI call are both blocking HTTP calls.
    Making them async here would require async httpx and async OpenAI client.
    For our load (one analysis per failed run, not concurrent thousands),
    synchronous is simpler and perfectly adequate.
    FastAPI runs sync endpoints in a thread pool automatically.
    """
    logger.info(
        "Analysis request: run_id=%d, workflow=%s, status=%s",
        request.run_id, request.workflow_name, request.status
    )

    # Only analyse failed runs — guard against misconfigured callers
    if request.status not in ("FAILURE", "CANCELLED"):
        raise HTTPException(
            status_code=400,
            detail=f"Only FAILURE/CANCELLED runs need analysis. Got: {request.status}"
        )

    # Step 1 — fetch real logs from GitHub
    log_content = log_fetcher.fetch_logs(
        owner=request.owner,
        repo_name=request.repo_name,
        external_run_id=request.external_run_id,
    )

    # Step 2 — analyse with LLM
    result = llm_analyzer.analyse(
        run_id=request.run_id,
        workflow_name=request.workflow_name,
        branch=request.branch,
        status=request.status,
        duration_ms=request.duration_ms,
        log_content=log_content,
    )

    logger.info(
        "Analysis complete: run_id=%d, category=%s, confidence=%.2f",
        request.run_id, result.category, result.confidence_score
    )

    return result