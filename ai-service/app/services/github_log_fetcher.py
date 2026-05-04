import httpx
import zipfile
import io
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class GitHubLogFetcher:
    """
    Fetches console logs for a GitHub Actions workflow run.

    WHY fetch logs here in Python and not in Spring Boot?
    The log fetch + truncation + LLM call is one logical operation.
    Doing it in the same service keeps the AI pipeline self-contained.
    Spring Boot only needs to send the run metadata — this service
    handles everything needed to produce the analysis.

    GitHub log flow:
    1. GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs
       → returns 302 redirect to a zip file URL
    2. Download the zip
    3. Extract text files (one per job/step)
    4. Concatenate and truncate to max_log_tokens chars
    """

    BASE_URL = "https://api.github.com"

    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {settings.github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def fetch_logs(self, owner: str, repo_name: str, external_run_id: str) -> str:
        """
        Returns the last N characters of the combined log for a run.
        Returns a placeholder message if logs cannot be fetched.
        """
        try:
            log_content = self._download_logs(owner, repo_name, external_run_id)
            return self._truncate_to_last_n_chars(log_content, settings.max_log_tokens * 4)
        except Exception as e:
            logger.warning(
                "Could not fetch logs for run %s/%s#%s: %s",
                owner, repo_name, external_run_id, str(e)
            )
            # Return empty string — LLM will analyse from metadata only
            return ""

    def _download_logs(self, owner: str, repo_name: str, run_id: str) -> str:
        url = f"{self.BASE_URL}/repos/{owner}/{repo_name}/actions/runs/{run_id}/logs"

        # follow_redirects=True handles the 302 → zip URL redirect automatically
        with httpx.Client(headers=self.headers, follow_redirects=True, timeout=30) as client:
            response = client.get(url)
            response.raise_for_status()

            # Response is a zip file in memory
            zip_bytes = io.BytesIO(response.content)
            return self._extract_text_from_zip(zip_bytes)

    def _extract_text_from_zip(self, zip_bytes: io.BytesIO) -> str:
        """
        Extracts all .txt log files from the zip and concatenates them.
        GitHub packages each job's log as a separate .txt file in the zip.
        """
        combined = []
        with zipfile.ZipFile(zip_bytes) as zf:
            for name in zf.namelist():
                if name.endswith(".txt"):
                    try:
                        content = zf.read(name).decode("utf-8", errors="replace")
                        combined.append(f"=== {name} ===\n{content}")
                    except Exception as e:
                        logger.warning("Could not read zip entry %s: %s", name, e)

        return "\n".join(combined)

    def _truncate_to_last_n_chars(self, text: str, n: int) -> str:
        """
        WHY truncate from the END, not the beginning?
        Build logs follow a pattern: setup at the top, actual error at the bottom.
        The failure is almost always in the last few hundred lines.
        Keeping the end maximises the signal sent to the LLM.
        """
        if len(text) <= n:
            return text
        return "...[truncated]...\n" + text[-n:]