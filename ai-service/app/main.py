import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Optional, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from openai import OpenAI
from pydantic import BaseModel

from app.config import settings
from app.dto.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    HealthResponse,
)

from app.routes.analyze import router
from app.services.github_log_fetcher import GitHubLogFetcher

# ─────────────────────────────────────────────────────────────────────────────
# ENV
# ─────────────────────────────────────────────────────────────────────────────

load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(
        logging,
        settings.log_level.upper(),
        logging.INFO
    ),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    stream=sys.stdout,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# LLM CLIENT
# ─────────────────────────────────────────────────────────────────────────────

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv(
        "OPENAI_BASE_URL",
        "https://api.groq.com/openai/v1"
    ),
)

MODEL = os.getenv(
    "OPENAI_MODEL",
    "llama-3.1-8b-instant"
)

# ─────────────────────────────────────────────────────────────────────────────
# LIFECYCLE
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info(
        "AI Service starting — model: %s",
        MODEL
    )

    yield

    logger.info("AI Service shutting down")

# ─────────────────────────────────────────────────────────────────────────────
# FASTAPI
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="PipelineIQ AI Service",
    description="AI-powered CI/CD pipeline failure analyzer",
    version="2.0.0",
    lifespan=lifespan,
)

# Existing routers
app.include_router(router)

# ─────────────────────────────────────────────────────────────────────────────
# SERVICES
# ─────────────────────────────────────────────────────────────────────────────

log_fetcher = GitHubLogFetcher()

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
You are an elite CI/CD failure analysis AI specializing in:

- GitHub Actions
- Docker
- Kubernetes
- Spring Boot
- Maven
- Gradle
- DevOps pipelines
- Cloud-native systems

CRITICAL:
You MUST return ONLY valid raw JSON.
No markdown.
No explanation.
No code fences.

Required JSON schema:

{
  "summary": "brief root cause summary",
  "rootCause": "technical root cause",
  "diagnosis": "detailed diagnosis",
  "recommendation": "main fix recommendation",
  "remediationSteps": ["step1", "step2"],
  "failureCategory": "ENUM_VALUE",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "affectedComponent": "service/file/module",
  "estimatedFixTime": "15 mins",
  "priority": "P1/P2/P3/P4",
  "similarPatterns": ["pattern1", "pattern2"],
  "confidenceScore": 0.0
}

confidenceScore rules:
- 0.90+ → very certain
- 0.70-0.89 → fairly certain
- below 0.70 → uncertain
"""

# ─────────────────────────────────────────────────────────────────────────────
# REQUEST/RESPONSE SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):

    prompt: str

    max_tokens: int = 1000

    temperature: float = 0.1


class AnalyzeResponseV2(BaseModel):

    content: str


class EmbedRequest(BaseModel):

    text: str


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/health",
    response_model=HealthResponse
)
def health():

    return {
        "status": "UP",
        "model": MODEL
    }

# ─────────────────────────────────────────────────────────────────────────────
# MODERN AI ANALYSIS ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/analyze",
    response_model=AnalyzeResponseV2
)
async def analyze(request: AnalyzeRequest):

    """
    New AI analysis endpoint.

    Java service sends:
    - prebuilt prompt
    - structured context
    - local classifier hints

    This service:
    - calls Groq/OpenAI
    - enforces JSON mode
    - validates JSON
    - returns raw JSON string
    """

    try:

        response = client.chat.completions.create(

            model=MODEL,

            max_tokens=request.max_tokens,

            temperature=request.temperature,

            response_format={
                "type": "json_object"
            },

            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": request.prompt
                }
            ]
        )

        content = (
            response
            .choices[0]
            .message
            .content
        )

        # Validate JSON before returning
        json.loads(content)

        return AnalyzeResponseV2(
            content=content
        )

    except json.JSONDecodeError as ex:

        logger.error(
            "LLM returned invalid JSON: %s",
            ex
        )

        raise HTTPException(
            status_code=500,
            detail=f"Invalid JSON returned by model: {ex}"
        )

    except Exception as ex:

        logger.error(
            "AI analysis failed: %s",
            ex
        )

        raise HTTPException(
            status_code=500,
            detail=str(ex)
        )

# ─────────────────────────────────────────────────────────────────────────────
# LEGACY ANALYSIS FLOW (BACKWARD COMPAT)
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/legacy/analyze",
    response_model=AnalysisResponse
)
def legacy_analyze(request: AnalysisRequest):

    """
    Original GitHub-log-fetching analysis flow.

    Kept for backward compatibility
    with older Spring services.
    """

    logger.info(
        "Legacy analysis request: run_id=%d workflow=%s",
        request.run_id,
        request.workflow_name
    )

    if request.status not in (
        "FAILURE",
        "CANCELLED"
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Only FAILURE/CANCELLED "
                "runs can be analyzed"
            )
        )

    # Fetch GitHub logs
    log_content = log_fetcher.fetch_logs(
        owner=request.owner,
        repo_name=request.repo_name,
        external_run_id=request.external_run_id,
    )

    # Build prompt dynamically
    prompt = f"""
    Workflow: {request.workflow_name}
    Branch: {request.branch}
    Status: {request.status}

    Analyze this CI/CD failure:

    {log_content[-4000:]}
    """

    try:

        response = client.chat.completions.create(

            model=MODEL,

            temperature=0.1,

            max_tokens=1000,

            response_format={
                "type": "json_object"
            },

            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        content = (
            response
            .choices[0]
            .message
            .content
        )

        parsed = json.loads(content)

        logger.info(
            "Legacy analysis complete: run_id=%d",
            request.run_id
        )

        return parsed

    except Exception as ex:

        logger.error(
            "Legacy analysis failed: %s",
            ex
        )

        raise HTTPException(
            status_code=500,
            detail=str(ex)
        )

# ─────────────────────────────────────────────────────────────────────────────
# EMBEDDINGS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/embed")
async def embed(payload: EmbedRequest):

    """
    Generate embeddings for:
    - similarity search
    - vector DB
    - semantic clustering
    """

    try:

        response = client.embeddings.create(

            model="text-embedding-ada-002",

            input=payload.text
        )

        return {
            "embedding":
                response.data[0].embedding
        }

    except Exception as ex:

        logger.error(
            "Embedding generation failed: %s",
            ex
        )

        raise HTTPException(
            status_code=500,
            detail=str(ex)
        )

# ─────────────────────────────────────────────────────────────────────────────
# LOCAL CLASSIFICATION ONLY
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/classify")
async def classify(payload: dict):

    """
    Future local-only classification endpoint.

    Can later integrate:
    - regex engine
    - lightweight ML classifier
    - cached patterns

    without LLM cost.
    """

    log_text = payload.get("log", "")

    if not log_text:

        raise HTTPException(
            status_code=400,
            detail="Missing log field"
        )

    return {
        "status": "NOT_IMPLEMENTED",
        "message": (
            "Local classifier endpoint "
            "reserved for future use"
        )
    }