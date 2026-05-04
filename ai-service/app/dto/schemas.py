from pydantic import BaseModel
from typing import Optional
from enum import Enum


class FailureCategory(str, Enum):
    """
    WHY an enum for categories?
    The Spring Boot side stores this as a VARCHAR and maps it to a Java enum.
    Both sides must agree on exact string values.
    Defining it here makes the contract explicit and prevents typos.
    """
    DEPENDENCY_FAILURE = "DEPENDENCY_FAILURE"
    TEST_FAILURE = "TEST_FAILURE"
    INFRA_TIMEOUT = "INFRA_TIMEOUT"
    CONFIG_ERROR = "CONFIG_ERROR"
    BUILD_COMPILATION = "BUILD_COMPILATION"
    UNKNOWN = "UNKNOWN"


class AnalysisRequest(BaseModel):
    """
    Request body sent by Spring Boot when a failed run needs analysis.

    WHY include both run_id and external_run_id?
    run_id = our DB primary key (used to store result back)
    external_run_id = GitHub's run ID (used to fetch logs from GitHub API)
    """
    run_id: int
    external_run_id: str
    owner: str
    repo_name: str
    workflow_name: str
    branch: str
    status: str
    head_sha: Optional[str] = None
    duration_ms: Optional[int] = None


class AnalysisResponse(BaseModel):
    """
    What we return to Spring Boot after analysis.
    Spring Boot stores this in the run_analysis table.
    """
    run_id: int
    category: FailureCategory
    root_cause_summary: str
    suggested_fix: str
    confidence_score: float  # 0.0 to 1.0
    log_snippet: Optional[str] = None  # the relevant log section we analysed
    analysed_by_model: str


class HealthResponse(BaseModel):
    status: str
    model: str