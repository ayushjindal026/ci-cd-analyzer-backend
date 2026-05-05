package com.ayush.cicd.api.auth;

import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.repository.UserRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * Handles the GitHub OAuth2 Authorization Code flow.
 *
 * Flow:
 * 1. exchangeCodeForToken()  — POST to GitHub with code → get access token
 * 2. fetchGitHubUser()       — GET GitHub user profile with access token
 * 3. upsertUser()            — create or update user in our DB
 *
 * WHY not use Spring Security OAuth2 Client autoconfiguration?
 * Spring's OAuth2 client is designed for server-side session flows.
 * We need a custom flow: exchange code → get token → issue our OWN JWT.
 * Manual implementation gives us full control over every step.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class GitHubOAuthService {

    private final UserRepository userRepository;

    @Value("${github.oauth.client-id}")
    private String clientId;

    @Value("${github.oauth.client-secret}")
    private String clientSecret;

    private final WebClient webClient = WebClient.builder().build();

    /**
     * Exchanges the OAuth authorization code for a GitHub access token.
     * GitHub's token endpoint returns form-encoded or JSON depending on Accept header.
     */
    public String exchangeCodeForToken(String code) {
        log.debug("Exchanging OAuth code for GitHub access token");

        GitHubTokenResponse response = webClient.post()
                .uri("https://github.com/login/oauth/access_token"
                        + "?client_id=" + clientId
                        + "&client_secret=" + clientSecret
                        + "&code=" + code)
                .header("Accept", "application/json")
                .retrieve()
                .bodyToMono(GitHubTokenResponse.class)
                .block();

        if (response == null || response.getAccessToken() == null) {
            throw new RuntimeException("Failed to obtain GitHub access token");
        }

        if (response.getError() != null) {
            throw new RuntimeException(
                    "GitHub OAuth error: " + response.getError()
                            + " — " + response.getErrorDescription());
        }

        return response.getAccessToken();
    }

    /**
     * Fetches the authenticated user's GitHub profile.
     */
    public GitHubUserProfile fetchGitHubUser(String accessToken) {
        log.debug("Fetching GitHub user profile");

        try {
            return webClient.get()
                    .uri("https://api.github.com/user")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .bodyToMono(GitHubUserProfile.class)
                    .block();
        } catch (WebClientResponseException e) {
            throw new RuntimeException(
                    "Failed to fetch GitHub user profile: " + e.getMessage());
        }
    }

    /**
     * Creates a new user or updates an existing one.
     * WHY upsert and not just insert?
     * Users can log in multiple times. On each login we refresh
     * their token, avatar, and email in case they changed on GitHub.
     */
    @Transactional
    public User upsertUser(GitHubUserProfile profile, String accessToken) {
        return userRepository.findByGithubId(profile.getId())
                .map(existingUser -> {
                    // Update mutable fields on every login
                    existingUser.setUsername(profile.getLogin());
                    existingUser.setEmail(profile.getEmail());
                    existingUser.setAvatarUrl(profile.getAvatarUrl());
                    existingUser.setGithubToken(accessToken);
                    User updated = userRepository.save(existingUser);
                    log.info("Updated existing user: {}", updated.getUsername());
                    return updated;
                })
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .githubId(profile.getId())
                            .username(profile.getLogin())
                            .email(profile.getEmail())
                            .avatarUrl(profile.getAvatarUrl())
                            .githubToken(accessToken)
                            .build();
                    User saved = userRepository.save(newUser);
                    log.info("Created new user: {}", saved.getUsername());
                    return saved;
                });
    }

    // ── GitHub API response DTOs ──────────────────────────────────────────────

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GitHubTokenResponse {
        @JsonProperty("access_token")  private String accessToken;
        @JsonProperty("token_type")    private String tokenType;
        @JsonProperty("scope")         private String scope;
        @JsonProperty("error")         private String error;
        @JsonProperty("error_description") private String errorDescription;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GitHubUserProfile {
        @JsonProperty("id")         private Long id;
        @JsonProperty("login")      private String login;
        @JsonProperty("email")      private String email;
        @JsonProperty("avatar_url") private String avatarUrl;
        @JsonProperty("name")       private String name;
    }
}