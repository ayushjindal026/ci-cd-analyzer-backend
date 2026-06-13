// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/controller/AuthController.java

package com.ayush.cicd.api.controller;

import com.ayush.cicd.api.auth.GitHubOAuthService;
import com.ayush.cicd.api.dto.request.LogoutRequest;
import com.ayush.cicd.api.dto.request.RefreshTokenRequest;
import com.ayush.cicd.api.dto.response.TokenResponse;
import com.ayush.cicd.api.security.JwtService;
import com.ayush.cicd.api.service.RefreshTokenService;
import com.ayush.cicd.api.service.RefreshTokenService.TokenInvalidException;
import com.ayush.cicd.api.service.RefreshTokenService.TokenReusedException;
import com.ayush.cicd.common.entity.RefreshToken;
import com.ayush.cicd.common.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Authentication Controller.
 *
 * FEATURES:
 * - GitHub OAuth login
 * - JWT access tokens
 * - Refresh token rotation
 * - Logout/logout-all
 * - Current authenticated user
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "GitHub OAuth + JWT Authentication APIs")
public class AuthController {

        private final GitHubOAuthService gitHubOAuthService;

        private final JwtService jwtService;

        private final RefreshTokenService refreshTokenService;

        @Value("${frontend.url:http://localhost:3000}")
        private String frontendUrl;

        // ------------------------------------------------------------------------
        // GitHub Login Redirect
        // ------------------------------------------------------------------------

        @GetMapping("/github/login")
        @Operation(summary = "Redirect user to GitHub OAuth")
        public ResponseEntity<Void> login() {

                String authorizationUrl = gitHubOAuthService.buildAuthorizationUrl();

                return ResponseEntity.status(HttpStatus.FOUND)
                                .header(HttpHeaders.LOCATION, authorizationUrl)
                                .build();
        }

        // ------------------------------------------------------------------------
        // GitHub OAuth Callback
        // ------------------------------------------------------------------------

        @GetMapping("/github/callback")
        @Operation(summary = "GitHub OAuth callback")
        public ResponseEntity<Void> callback(
                        @RequestParam String code,
                        HttpServletRequest request) {

                try {

                        // ----------------------------------------------------------------
                        // Authenticate GitHub user
                        // ----------------------------------------------------------------

                        User user = gitHubOAuthService.handleCallback(code);

                        // ----------------------------------------------------------------
                        // Generate access token
                        // ----------------------------------------------------------------

                        String accessToken = jwtService.generateAccessToken(
                                        user.getId(),
                                        user.getUsername(),
                                        user.getEmail());

                        // ----------------------------------------------------------------
                        // Issue refresh token
                        // ----------------------------------------------------------------

                        RefreshToken refreshToken = refreshTokenService.issue(
                                        user,
                                        request.getHeader("User-Agent"),
                                        request.getRemoteAddr());

                        // ----------------------------------------------------------------
                        // Encode tokens for redirect safety
                        // ----------------------------------------------------------------

                        String encodedAccessToken = URLEncoder.encode(
                                        accessToken,
                                        StandardCharsets.UTF_8);

                        String encodedRefreshToken = URLEncoder.encode(
                                        refreshToken.getToken(),
                                        StandardCharsets.UTF_8);

                        // ----------------------------------------------------------------
                        // Frontend redirect
                        // ----------------------------------------------------------------

                        String redirectUrl = frontendUrl
                                        + "/oauth-success"
                                        + "?access_token=" + encodedAccessToken
                                        + "&refresh_token=" + encodedRefreshToken;

                        log.info(
                                        "OAuth login successful for user: {}",
                                        user.getUsername());

                        return ResponseEntity.status(HttpStatus.FOUND)
                                        .header(HttpHeaders.LOCATION, redirectUrl)
                                        .build();

                } catch (Exception e) {

                        log.error("OAuth callback failed", e);

                        return ResponseEntity.status(HttpStatus.FOUND)
                                        .header(
                                                        HttpHeaders.LOCATION,
                                                        frontendUrl + "/login?error=oauth_failed")
                                        .build();
                }
        }

        // ------------------------------------------------------------------------
        // Refresh Access Token
        // ------------------------------------------------------------------------

        @PostMapping("/refresh")
        @Operation(summary = "Refresh JWT access token")
        public ResponseEntity<?> refresh(
                        @Valid @RequestBody RefreshTokenRequest requestBody,
                        HttpServletRequest request) {

                try {

                        // ----------------------------------------------------------------
                        // Rotate refresh token
                        // ----------------------------------------------------------------

                        RefreshToken newRefreshToken = refreshTokenService.rotate(
                                        requestBody.getRefreshToken(),
                                        request.getHeader("User-Agent"),
                                        request.getRemoteAddr());

                        User user = newRefreshToken.getUser();

                        // ----------------------------------------------------------------
                        // Generate new access token
                        // ----------------------------------------------------------------

                        String newAccessToken = jwtService.generateAccessToken(
                                        user.getId(),
                                        user.getUsername(),
                                        user.getEmail());

                        // ----------------------------------------------------------------
                        // Return new token pair
                        // ----------------------------------------------------------------

                        TokenResponse response = TokenResponse.builder()
                                        .accessToken(newAccessToken)
                                        .refreshToken(newRefreshToken.getToken())
                                        .expiresIn(
                                                        jwtService
                                                                        .getAccessTokenExpirationMs() / 1000)
                                        .userId(user.getId())
                                        .username(user.getUsername())
                                        .email(user.getEmail())
                                        .avatarUrl(user.getAvatarUrl())
                                        .build();

                        return ResponseEntity.ok(response);

                } catch (TokenReusedException e) {

                        log.warn("Refresh token reuse detected.");

                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                        .body(
                                                        Map.of(
                                                                        "error", "token_reuse_detected",
                                                                        "message",
                                                                        "Security violation detected. Please login again."));

                } catch (TokenInvalidException e) {

                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                        .body(
                                                        Map.of(
                                                                        "error", "invalid_refresh_token",
                                                                        "message", e.getMessage()));
                }
        }

        // ------------------------------------------------------------------------
        // Logout
        // ------------------------------------------------------------------------

        @PostMapping("/logout")
        @Operation(summary = "Logout user session(s)")
        public ResponseEntity<Map<String, String>> logout(
                        @RequestBody(required = false) LogoutRequest requestBody,
                        @AuthenticationPrincipal User user) {

                if (user == null) {

                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                        .body(Map.of("message", "Unauthorized"));
                }

                // --------------------------------------------------------------------
                // Logout all sessions
                // --------------------------------------------------------------------

                if (requestBody != null && requestBody.isLogoutAll()) {

                        refreshTokenService.revokeAll(user);

                        log.info(
                                        "User {} logged out from all sessions",
                                        user.getUsername());

                        return ResponseEntity.ok(
                                        Map.of(
                                                        "message",
                                                        "Logged out from all sessions"));
                }

                // --------------------------------------------------------------------
                // Logout current session only
                // --------------------------------------------------------------------

                if (requestBody != null
                                && requestBody.getRefreshToken() != null) {

                        refreshTokenService.revoke(
                                        requestBody.getRefreshToken());

                        return ResponseEntity.ok(
                                        Map.of(
                                                        "message",
                                                        "Logged out successfully"));
                }

                return ResponseEntity.ok(
                                Map.of(
                                                "message",
                                                "Logout completed"));
        }

        // ------------------------------------------------------------------------
        // Current Authenticated User
        // ------------------------------------------------------------------------

        @GetMapping("/me")
        @Operation(summary = "Get current authenticated user")
        public ResponseEntity<?> me(
                        @AuthenticationPrincipal User user) {

                if (user == null) {

                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                        .body(
                                                        Map.of(
                                                                        "message",
                                                                        "Unauthorized"));
                }

                return ResponseEntity.ok(
                                Map.of(
                                                "id", user.getId(),

                                                "username",
                                                user.getUsername() != null
                                                                ? user.getUsername()
                                                                : "",

                                                "email",
                                                user.getEmail() != null
                                                                ? user.getEmail()
                                                                : "",

                                                "avatarUrl",
                                                user.getAvatarUrl() != null
                                                                ? user.getAvatarUrl()
                                                                : "",

                                                "githubUsername",
                                                user.getGithubUsername() != null
                                                                ? user.getGithubUsername()
                                                                : "",

                                                "plan",
                                                user.getPlan() != null
                                                                ? user.getPlan()
                                                                : "FREE",

                                                "createdAt",
                                                user.getCreatedAt()));
        }
}