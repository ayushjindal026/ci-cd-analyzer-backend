// PATH: backend/src/main/java/com/pipelineiq/analyzer/service/GitHubLogFetcherService.java
package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.enums.BuildStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.zip.*;

/**
 * Fetches GitHub Actions workflow run logs via the REST API.
 *
 * GitHub returns logs as a ZIP archive containing one text file per job/step.
 * We unzip, concatenate per stage, and hand off to the analysis pipeline.
 *
 * Scheduled to auto-fetch logs for any failed run that hasn't been fetched yet.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubLogFetcherService {

    private final RestTemplate restTemplate;
    private final PipelineRunRepository runRepo;
    private final MonitoredRepositoryRepository repoRepo;
    private final PipelineAnalysisOrchestrator orchestrator;

    @Value("${github.token:}")
    private String defaultToken;

    private static final String GH_API = "https://api.github.com";
    private static final int MAX_LOG_BYTES = 500_000; // 500 KB cap per run

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Fetch logs for a specific run and trigger analysis immediately.
     * Called when user clicks "AI Diagnosis" in the UI.
     */
    public void fetchAndAnalyse(Long repositoryId, Long runId) {
        PipelineRun run = runRepo.findById(runId)
                .orElseThrow(() -> new IllegalArgumentException("Run not found: " + runId));

        MonitoredRepository repo = repoRepo.findById(repositoryId)
                .orElseThrow(() -> new IllegalArgumentException("Repo not found: " + repositoryId));

        if (run.getExternalRunId() == null) {
            log.warn("Run {} has no githubRunId — cannot fetch logs", runId);
            return;
        }

        // Parse the String externalRunId to Long for the GitHub API call
        Long githubRunId;
        try {
            githubRunId = Long.parseLong(run.getExternalRunId());
        } catch (NumberFormatException ex) {
            log.warn("Run {} has non-numeric externalRunId '{}' — cannot fetch logs", runId, run.getExternalRunId());
            return;
        }

        Map<String, String> stageLogs = fetchLogs(repo, githubRunId);
        if (stageLogs.isEmpty()) {
            log.warn("No logs retrieved for run {} (githubRunId={})", runId, githubRunId);
            return;
        }

        log.info("Logs fetched for run {}, triggering analysis", runId);
        runRepo.save(run);

        orchestrator.orchestrate(run, repo, stageLogs);
    }

    /**
     * Scheduled: every 5 minutes, pick up failed runs that haven't had logs fetched
     * yet.
     * Processes up to 5 per cycle to avoid hammering GitHub API rate limits.
     */
    @Scheduled(fixedDelay = 300_000)
    public void autoFetchPendingLogs() {
        List<MonitoredRepository> repos = repoRepo.findAll();
        for (MonitoredRepository repo : repos) {
            // Find failed runs for this repo and try to fetch logs
            List<PipelineRun> pending = runRepo
                    .findByRepository_IdAndStatusAndStartedAtAfter(
                            repo.getId(),
                            BuildStatus.FAILED,
                            Instant.now().minusSeconds(86400));

            pending.stream().limit(5).forEach(run -> {
                try {
                    if (run.getExternalRunId() != null) {
                        fetchAndAnalyse(repo.getId(), run.getId());
                    }
                } catch (Exception e) {
                    log.error("Auto-fetch failed for run {}: {}", run.getId(), e.getMessage());
                }
            });
        }
    }

    // ── Core log fetch ────────────────────────────────────────────────────────

    /**
     * Downloads the ZIP log archive from GitHub and returns a map of
     * { stageName → logText }.
     */
    public Map<String, String> fetchLogs(MonitoredRepository repo, Long githubRunId) {
        String token = resolveToken(repo);
        String url = GH_API + "/repos/" + repo.getFullName()
                + "/actions/runs/" + githubRunId + "/logs";

        HttpHeaders headers = buildHeaders(token);
        // GitHub redirects to a presigned S3 URL — follow it
        headers.set("Accept", "application/vnd.github+json");

        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    URI.create(url), HttpMethod.GET,
                    new HttpEntity<>(headers), byte[].class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return unzipLogs(response.getBody());
            }

        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Logs not found for githubRunId {} (run may be too old or deleted)", githubRunId);
        } catch (HttpClientErrorException.Forbidden e) {
            log.warn("Access denied fetching logs for {} — check token scopes", githubRunId);
        } catch (Exception e) {
            log.error("Log fetch error for githubRunId {}: {}", githubRunId, e.getMessage());
        }

        return Map.of();
    }

    /**
     * Fetches the list of jobs for a workflow run.
     * Used to map job → stage name.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> fetchJobs(MonitoredRepository repo, Long githubRunId) {
        String token = resolveToken(repo);
        String url = GH_API + "/repos/" + repo.getFullName()
                + "/actions/runs/" + githubRunId + "/jobs";

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    URI.create(url), HttpMethod.GET,
                    new HttpEntity<>(buildHeaders(token)), Map.class);

            if (response.getBody() != null) {
                return (List<Map<String, Object>>) response.getBody().get("jobs");
            }
        } catch (Exception e) {
            log.error("Job fetch error for run {}: {}", githubRunId, e.getMessage());
        }
        return List.of();
    }

    // ── ZIP parsing ───────────────────────────────────────────────────────────

    /**
     * Unzips the GitHub log archive.
     * File structure: {jobNumber}_{JobName}/{stepNumber}_{StepName}.txt
     * We group by job name → concatenated step logs = one "stage" log.
     */
    private Map<String, String> unzipLogs(byte[] zipBytes) {
        Map<String, StringBuilder> stageBuilders = new LinkedHashMap<>();
        int totalBytes = 0;

        try (ZipInputStream zis = new ZipInputStream(
                new ByteArrayInputStream(zipBytes))) {

            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.isDirectory())
                    continue;

                String name = entry.getName(); // e.g. "1_Build/2_Run Maven.txt"
                String stage = extractStageName(name);
                byte[] buf = new byte[4096];
                StringBuilder sb = stageBuilders.computeIfAbsent(stage, k -> new StringBuilder());

                int read;
                while ((read = zis.read(buf)) != -1) {
                    if (totalBytes + read > MAX_LOG_BYTES)
                        break;
                    sb.append(new String(buf, 0, read, StandardCharsets.UTF_8));
                    totalBytes += read;
                }
                zis.closeEntry();

                if (totalBytes >= MAX_LOG_BYTES) {
                    log.debug("Log size cap reached at {} bytes", MAX_LOG_BYTES);
                    break;
                }
            }
        } catch (IOException e) {
            log.error("ZIP parse error: {}", e.getMessage());
        }

        // Convert builders → strings
        Map<String, String> result = new LinkedHashMap<>();
        stageBuilders.forEach((k, v) -> result.put(k, v.toString()));
        return result;
    }

    /**
     * Extracts a human-readable stage name from a ZIP path.
     * "1_Build/2_Run Maven.txt" → "Build"
     * "2_Test/1_Run Tests.txt" → "Test"
     */
    private String extractStageName(String zipPath) {
        String[] parts = zipPath.split("/");
        if (parts.length < 1)
            return "Unknown";
        // Strip leading number and underscore "1_Build" → "Build"
        return parts[0].replaceFirst("^\\d+_", "").trim();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String resolveToken(MonitoredRepository repo) {

        if (repo.getUser() != null && repo.getUser().getGithubToken() != null
                && !repo.getUser().getGithubToken().isBlank()) {
            return repo.getUser().getGithubToken();
        }
        return defaultToken;
    }

    private HttpHeaders buildHeaders(String token) {
        HttpHeaders h = new HttpHeaders();
        h.set("Authorization", "token " + token);
        h.set("X-GitHub-Api-Version", "2022-11-28");
        return h;
    }
}