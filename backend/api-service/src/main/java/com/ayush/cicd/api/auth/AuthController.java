package com.ayush.cicd.api.auth;

import com.ayush.cicd.api.dto.response.ApiResponse;
import com.ayush.cicd.api.security.JwtService;
import com.ayush.cicd.common.entity.User;

import jakarta.servlet.http.HttpServletResponse;

import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final GitHubOAuthService oAuthService;

    private final JwtService jwtService;

    @Value("${github.oauth.client-id}")
    private String clientId;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1
    // FRONTEND CALLS THIS
    // REDIRECTS TO GITHUB OAUTH
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/github/login")
    public void getGitHubLoginUrl(
            HttpServletResponse response) throws IOException {

        String url = "https://github.com/login/oauth/authorize"
                + "?client_id=" + clientId
                + "&scope=repo,user:email"
                + "&allow_signup=true";

        response.sendRedirect(url);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2
    // GITHUB REDIRECTS HERE
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/github/callback")
    public void handleCallback(
            @RequestParam String code,
            HttpServletResponse response) throws IOException {

        log.info("GitHub OAuth callback received");

        // STEP 1
        // Exchange code for GitHub token

        String githubToken = oAuthService.exchangeCodeForToken(code);

        // STEP 2
        // Fetch GitHub user profile

        GitHubOAuthService.GitHubUserProfile profile = oAuthService.fetchGitHubUser(githubToken);

        // STEP 3
        // Create/update user in DB

        User user = oAuthService.upsertUser(
                profile,
                githubToken);

        // STEP 4
        // Generate JWT

        String jwt = jwtService.generateToken(user);

        log.info(
                "User logged in successfully: {}",
                user.getUsername());

        // STEP 5
        // Redirect frontend with token

        String redirectUrl = "http://localhost:3000/oauth-success?token="
                + jwt;

        response.sendRedirect(redirectUrl);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3
    // CURRENT USER
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            Authentication authentication) {

        if (authentication == null) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(
                            ApiResponse.error(
                                    "Unauthorized"));
        }

        User user = (User) authentication.getPrincipal();

        return ResponseEntity.ok(
                ApiResponse.success(
                        AuthResponse.builder()
                                .userId(user.getId())
                                .username(user.getEmail())
                                .avatarUrl(user.getAvatarUrl())
                                .email(user.getEmail())
                                .build(),
                        "Current authenticated user"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RESPONSE DTOs
    // ─────────────────────────────────────────────────────────────────────────

    @Data
    @Builder
    public static class AuthUrlResponse {

        private String url;
    }

    @Data
    @Builder
    public static class AuthResponse {

        private String token;

        private String tokenType;

        private Long userId;

        private String username;

        private String avatarUrl;

        private String email;
    }
}