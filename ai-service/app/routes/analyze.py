from fastapi import APIRouter
from app.dto.schemas import AnalysisRequest, AnalysisResponse
from app.services.llm_analyzer import LLMAnalyzer

router = APIRouter()
analyzer = LLMAnalyzer()


@router.post("/analyze", response_model=AnalysisResponse)
def analyze(request: AnalysisRequest):
    """
    Main endpoint called by Spring Boot.
    """

    # 🔥 TEMP: since GitHub logs not integrated yet
    # later we replace this with real log fetch
    fake_log = "ERROR: Failed to resolve dependency org.springframework.boot"

    result = analyzer.analyse(
        run_id=request.run_id,
        workflow_name=request.workflow_name,
        branch=request.branch,
        status=request.status,
        duration_ms=request.duration_ms,
        log_content=fake_log
    )

    return result