import json
import logging
from openai import OpenAI
from app.config import settings
from app.dto.schemas import FailureCategory, AnalysisResponse

logger = logging.getLogger(__name__)

# System prompt — this is the most important part of the AI layer.
# It tells the model exactly what role it plays, what format to return,
# and gives one example per category so it understands the taxonomy.
SYSTEM_PROMPT = """You are an expert CI/CD failure analyst with deep knowledge of 
GitHub Actions, build systems, dependency managers, and common pipeline failures.

Your job: analyse a failed CI/CD pipeline run and return a structured JSON diagnosis.

FAILURE CATEGORIES (pick exactly one):
- DEPENDENCY_FAILURE: npm/maven/pip install errors, version conflicts, missing packages
- TEST_FAILURE: unit/integration test assertion failures, test timeouts
- INFRA_TIMEOUT: job exceeded time limit, runner OOM, network timeouts, disk full
- CONFIG_ERROR: missing env var, invalid YAML/JSON, missing secret, wrong file path
- BUILD_COMPILATION: compile errors, syntax errors, lint failures, type errors
- UNKNOWN: cannot determine from available information

RESPONSE FORMAT (JSON only, no markdown, no explanation outside JSON):
{
  "category": "<one of the categories above>",
  "root_cause_summary": "<1-2 sentences, specific and actionable>",
  "suggested_fix": "<concrete steps to fix, 1-3 sentences>",
  "confidence_score": <float 0.0-1.0, how confident you are>
}

RULES:
- Return ONLY valid JSON. No markdown code blocks. No text before or after.
- root_cause_summary must be specific — not "the build failed" but WHY it failed
- suggested_fix must be actionable — tell the developer exactly what to change
- If no logs are available, analyse from workflow name, branch, and duration clues
- confidence_score: 0.9+ if log clearly shows the error, 0.5 if guessing from metadata"""


class LLMAnalyzer:
    """
    Calls OpenAI to classify a CI/CD failure and suggest a fix.

    WHY a class and not a module-level function?
    The OpenAI client is instantiated once and reused across requests.
    A class holds that state cleanly without a global variable.
    Also makes it mockable in tests — inject a fake LLMAnalyzer.
    """

    def __init__(self):
        self.client = OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url   # 🔥 THIS LINE IS MISSING
        )
        self.model = settings.openai_model

    def analyse(
        self,
        run_id: int,
        workflow_name: str,
        branch: str,
        status: str,
        duration_ms: int | None,
        log_content: str,
    ) -> AnalysisResponse:
        """
        Sends run context + logs to the LLM and parses the structured response.
        Falls back to UNKNOWN category if the LLM returns unparseable output.
        """
        user_prompt = self._build_user_prompt(
            workflow_name, branch, status, duration_ms, log_content
        )

        logger.info("Sending run %d to LLM for analysis (log_chars=%d)",
                    run_id, len(log_content))

        try:
            raw_response = self._call_llm(user_prompt)
            return self._parse_response(run_id, raw_response)

        except Exception as e:
            logger.error("LLM analysis failed for run %d: %s", run_id, str(e))
            return self._fallback_response(run_id)

    def _call_llm(self, user_prompt: str) -> str:
        """
        WHY temperature=0.2?
        We want consistent, deterministic output — not creative variation.
        Lower temperature = model sticks closer to the most likely token.
        0.0 is fully deterministic, 0.2 allows slight variation while
        keeping output structured and factual.

        WHY max_tokens=500?
        Our JSON response needs ~150-300 tokens.
        500 is a safe ceiling that prevents runaway responses
        while never truncating a valid answer.
        """
        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0.2,
            max_tokens=500,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_prompt},
            ],
        )
        return response.choices[0].message.content.strip()

    def _build_user_prompt(
        self,
        workflow_name: str,
        branch: str,
        status: str,
        duration_ms: int | None,
        log_content: str,
    ) -> str:
        duration_str = f"{duration_ms / 1000:.1f}s" if duration_ms else "unknown"

        prompt = f"""FAILED PIPELINE RUN:
Workflow: {workflow_name}
Branch: {branch}
Status: {status}
Duration: {duration_str}

"""
        if log_content:
            prompt += f"CONSOLE LOG (last portion):\n{log_content}"
        else:
            prompt += "CONSOLE LOG: Not available. Analyse from metadata only."

        return prompt

    def _parse_response(self, run_id: int, raw: str) -> AnalysisResponse:
        """
        Parses the LLM JSON response into an AnalysisResponse.

        WHY strip markdown fences before parsing?
        Even with explicit instructions, LLMs occasionally wrap
        JSON in ```json ... ``` blocks. Stripping them defensively
        prevents parse failures on valid-but-wrapped responses.
        """
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1])

        data = json.loads(cleaned)

        # Validate category — default to UNKNOWN if unrecognised
        raw_category = data.get("category", "UNKNOWN").upper()
        try:
            category = FailureCategory(raw_category)
        except ValueError:
            logger.warning("LLM returned unknown category: %s", raw_category)
            category = FailureCategory.UNKNOWN

        # Clamp confidence to 0.0-1.0
        confidence = float(data.get("confidence_score", 0.5))
        confidence = max(0.0, min(1.0, confidence))

        return AnalysisResponse(
            run_id=run_id,
            category=category,
            root_cause_summary=data.get("root_cause_summary", "Could not determine root cause."),
            suggested_fix=data.get("suggested_fix", "Review the pipeline logs manually."),
            confidence_score=confidence,
            analysed_by_model=self.model,
        )

    def _fallback_response(self, run_id: int) -> AnalysisResponse:
        """Returned when the LLM call itself fails — never crash the API."""
        return AnalysisResponse(
            run_id=run_id,
            category=FailureCategory.UNKNOWN,
            root_cause_summary="Analysis could not be completed due to a service error.",
            suggested_fix="Review the pipeline logs manually in GitHub Actions.",
            confidence_score=0.0,
            analysed_by_model=self.model,
        )