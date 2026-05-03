package com.ayush.cicd.ingestion.client;

import com.ayush.cicd.ingestion.client.dto.GitHubWorkflowRunsResponse;
import com.ayush.cicd.ingestion.config.GitHubProperties;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Instant;
import java.time.format.DateTimeFormatter;

// ✅ NEW IMPORTS (SSL FIX)
import io.netty.handler.ssl.SslContext;
import io.netty.handler.ssl.SslContextBuilder;
import io.netty.handler.ssl.SslProvider;
import javax.net.ssl.SSLException;
import reactor.netty.http.client.HttpClient;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;

@Component
@Slf4j
public class GitHubActionsClient {

    private final WebClient webClient;
    private final GitHubProperties properties;

    public GitHubActionsClient(GitHubProperties properties) {
        this.properties = properties;

        // ✅ FIX: Force JDK SSL (Windows fix)
        SslContext sslContext;
        try {
            sslContext = SslContextBuilder
                    .forClient()
                    .sslProvider(SslProvider.JDK)
                    .build();
        } catch (SSLException e) {
            throw new RuntimeException("Failed to create SSL context", e);
        }

        HttpClient httpClient = HttpClient.create()
                .secure(spec -> spec.sslContext(sslContext));

        this.webClient = WebClient.builder()
                .baseUrl(properties.getApiBaseUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader("Authorization", "Bearer " + properties.getToken())
                .defaultHeader("Accept", "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .build();
    }

    public GitHubWorkflowRunsResponse fetchWorkflowRuns(
            String owner, String repoName, Instant since) {

        log.debug("Fetching workflow runs for {}/{}, since={}",
                owner, repoName, since);

        try {
            String uri = buildUri(owner, repoName, since);

            GitHubWorkflowRunsResponse response = webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(GitHubWorkflowRunsResponse.class)
                    .block();

            int count = response != null && response.getWorkflowRuns() != null
                    ? response.getWorkflowRuns().size() : 0;

            log.info("Fetched {} workflow runs for {}/{}",
                    count, owner, repoName);

            return response;

        } catch (WebClientResponseException.Unauthorized e) {
            log.error("GitHub API authentication failed for {}/{}", owner, repoName);
            throw new RuntimeException("GitHub API authentication failed", e);

        } catch (WebClientResponseException.NotFound e) {
            log.error("Repository {}/{} not found", owner, repoName);
            throw new RuntimeException(
                    String.format("Repository %s/%s not found", owner, repoName), e);

        } catch (WebClientResponseException e) {
            log.error("GitHub API error: {}", e.getMessage());
            throw new RuntimeException("GitHub API error: " + e.getMessage(), e);
        }
    }

    private String buildUri(String owner, String repoName, Instant since) {
        StringBuilder uri = new StringBuilder()
                .append("/repos/")
                .append(owner)
                .append("/")
                .append(repoName)
                .append("/actions/runs")
                .append("?per_page=")
                .append(properties.getRunsPerPage());

        if (since != null) {
            String sinceFormatted = DateTimeFormatter.ISO_INSTANT.format(since);
            uri.append("&created=>").append(sinceFormatted);
        }

        return uri.toString();
    }
}