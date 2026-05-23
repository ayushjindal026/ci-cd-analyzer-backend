package com.ayush.cicd.ingestion.client;

import com.ayush.cicd.ingestion.client.dto.GitHubWorkflowRunDto;
import com.ayush.cicd.ingestion.client.dto.GitHubWorkflowRunsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class GitHubActionsClient {

    private static final String GH_API = "https://api.github.com";

    private final RestTemplate restTemplate;

    // =========================================================================
    // FETCH RECENT RUNS
    // =========================================================================

    public List<GitHubWorkflowRunDto> fetchRecentRuns(
            String owner,
            String repo,
            String token,
            int perPage
    ) {

        if (token == null || token.isBlank()) {
            log.warn("Missing GitHub token for repo {}/{}", owner, repo);
            return List.of();
        }

        String url = UriComponentsBuilder
                .fromHttpUrl(GH_API + "/repos/{owner}/{repo}/actions/runs")
                .queryParam("per_page", perPage)
                .queryParam("exclude_pull_requests", false)
                .buildAndExpand(owner, repo)
                .toUriString();

        try {

            ResponseEntity<GitHubWorkflowRunsResponse> response =
                    restTemplate.exchange(
                            url,
                            HttpMethod.GET,
                            new HttpEntity<>(headers(token)),
                            GitHubWorkflowRunsResponse.class
                    );

            GitHubWorkflowRunsResponse body = response.getBody();

            return body != null
                    ? body.getWorkflowRuns()
                    : List.of();

        } catch (HttpClientErrorException.NotFound e) {

            log.warn(
                    "GitHub repo not found or Actions disabled: {}/{}",
                    owner,
                    repo
            );

            return List.of();

        } catch (HttpClientErrorException.Forbidden e) {

            log.warn(
                    "GitHub API access denied for {}/{} — token scope or rate limit issue",
                    owner,
                    repo
            );

            return List.of();

        } catch (Exception e) {

            log.error(
                    "Unexpected error fetching workflow runs repo={}/{}",
                    owner,
                    repo,
                    e
            );

            return List.of();
        }
    }

    // =========================================================================
    // FETCH SINGLE RUN
    // =========================================================================

    public GitHubWorkflowRunDto fetchSingleRun(
            String owner,
            String repo,
            String runId,
            String token
    ) {

        if (token == null || token.isBlank()) {
            log.warn("Missing GitHub token for run fetch {}", runId);
            return null;
        }

        String url =
                GH_API
                        + "/repos/"
                        + owner
                        + "/"
                        + repo
                        + "/actions/runs/"
                        + runId;

        try {

            ResponseEntity<GitHubWorkflowRunDto> response =
                    restTemplate.exchange(
                            url,
                            HttpMethod.GET,
                            new HttpEntity<>(headers(token)),
                            GitHubWorkflowRunDto.class
                    );

            return response.getBody();

        } catch (HttpClientErrorException.NotFound e) {

            log.debug(
                    "Workflow run {} not found for repo {}/{}",
                    runId,
                    owner,
                    repo
            );

            return null;

        } catch (HttpClientErrorException.Forbidden e) {

            log.warn(
                    "Access denied fetching workflow run {} for repo {}/{}",
                    runId,
                    owner,
                    repo
            );

            return null;

        } catch (Exception e) {

            log.error(
                    "Unexpected error fetching workflow run {}",
                    runId,
                    e
            );

            return null;
        }
    }

    // =========================================================================
    // HEADERS
    // =========================================================================

    private HttpHeaders headers(String token) {

        HttpHeaders headers = new HttpHeaders();

        headers.setBearerAuth(token);

        headers.set(
                "Accept",
                "application/vnd.github+json"
        );

        headers.set(
                "X-GitHub-Api-Version",
                "2022-11-28"
        );

        return headers;
    }
}