package com.ayush.cicd.ingestion.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Type-safe configuration binding for GitHub API settings.
 *
 * WHY @ConfigurationProperties instead of @Value?
 * @Value injects one field at a time with string literals like
 * @Value("${github.token}") — scattered across classes, hard to find.
 * @ConfigurationProperties binds an entire prefix to a typed object.
 * One class = one place to see all GitHub config. Validated at startup.
 * Refactor-safe — rename the field in Java, IDE finds all usages.
 *
 * Requires @EnableConfigurationProperties(GitHubProperties.class)
 * on a @Configuration class, OR adding to application.properties
 * spring.config.import — we handle this in the @Configuration class.
 */
@Data
@ConfigurationProperties(prefix = "github")
public class GitHubProperties {

    /**
     * Personal Access Token with repo + workflow scopes.
     * Set in application.properties as: github.token=ghp_xxx
     * NEVER hardcode this value here.
     */
    private String token;

    /**
     * GitHub API base URL.
     * Configurable so tests can point to a mock server (WireMock).
     */
    private String apiBaseUrl = "https://api.github.com";

    /**
     * How many workflow runs to fetch per API call.
     * GitHub max is 100. We use 50 as a safe default —
     * large enough to catch up after downtime, small enough
     * to avoid rate limit issues on the first sync.
     */
    private int runsPerPage = 50;
}