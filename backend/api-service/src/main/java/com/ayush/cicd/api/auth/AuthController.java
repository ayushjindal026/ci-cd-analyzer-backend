package com.ayush.cicd.api.auth;

import com.ayush.cicd.api.dto.response.ApiResponse;
import com.ayush.cicd.api.security.JwtService;
import com.ayush.cicd.common.entity.User;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Handles GitHub OAuth2 login flow.
 *
 * Endpoints:
 * GET  /api/v1/auth/github/login    → redirect URL for React frontend
 * GET  /api/v1/auth/github/callback → handles GitHub redirect, returns JWT
 * GET  /api/v1/auth/me              → returns current user from JWT
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final GitHubOAuthService oAuthService;
    private final JwtService jwtService;

    @Value("${github.oauth.client-id}")
    private String clientId;

    /**
     * Returns the GitHub OAuth authorization URL.
     * React calls this to know where to redirect the user for login.
     *
     * WHY return URL instead of doing redirect?
     * A React SPA cannot follow server-side redirects for OAuth.
     * The frontend needs the URL to do window.location = url itself.
     */
    @GetMapping("/github/login")
    public ResponseEntity<ApiResponse<AuthUrlResponse>> getGitHubLoginUrl() {
        String url = "https://github.com/login/oauth/authorize"
                + "?client_id=" + clientId
                + "&scope=repo,user:email"
                + "&allow_signup=true";

        return ResponseEntity.ok(ApiResponse.success(
                AuthUrlResponse.builder().url(url).build(),
                "Redirect user to this URL"
        ));
    }

    /**
     * GitHub redirects here after user approves the OAuth app.
     * Exchanges the code for a token, upserts the user, returns JWT.
     *
     * WHY return the JWT in the response body and not a cookie?
     * HttpOnly cookies are more secure but harder to use with
     * a decoupled React SPA on a different origin.
     * For now we return it in the body — React stores it in
     * memory (not localStorage — that's XSS vulnerable).
     * We add HttpOnly cookie support in Phase 3 (production hardening).
     */
    @GetMapping("/github/callback")
    public ResponseEntity<ApiResponse<AuthResponse>> handleCallback(
            @RequestParam String code) {

        log.info("GitHub OAuth callback received");

        // Step 1: exchange code for GitHub access token
        String githubToken = oAuthService.exchangeCodeForToken(code);

        // Step 2: fetch user profile from GitHub
        GitHubOAuthService.GitHubUserProfile profile =
                oAuthService.fetchGitHubUser(githubToken);

        // Step 3: upsert user in our DB
        User user = oAuthService.upsertUser(profile, githubToken);

        // Step 4: generate our own JWT
        String jwt = jwtService.generateToken(user);

        log.info("User logged in: {}", user.getUsername());

        return ResponseEntity.ok(ApiResponse.success(
                AuthResponse.builder()
                        .token(jwt)
                        .tokenType("Bearer")
                        .userId(user.getId())
                        .username(user.getUsername())
                        .avatarUrl(user.getAvatarUrl())
                        .email(user.getEmail())
                        .build(),
                "Login successful"
        ));
    }

    /**
     * Returns the currently authenticated user's profile.
     * React calls this on startup to restore session state.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getCurrentUser(
            @org.springframework.security.core.annotation.AuthenticationPrincipal
            User user) {
        return ResponseEntity.ok(ApiResponse.success(
                UserProfileResponse.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .avatarUrl(user.getAvatarUrl())
                        .build()
        ));
    }

    // ── Response DTOs ─────────────────────────────────────────────────────────

    @Data @Builder
    public static class AuthUrlResponse {
        private String url;
    }

    @Data @Builder
    public static class AuthResponse {
        private String token;
        private String tokenType;
        private Long userId;
        private String username;
        private String avatarUrl;
        private String email;
    }

    @Data @Builder
    public static class UserProfileResponse {
        private Long id;
        private String username;
        private String email;
        private String avatarUrl;
    }
}