package com.ayush.cicd.api.service;

import com.ayush.cicd.common.entity.RefreshToken;
import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

/**
 * Refresh token lifecycle manager.
 *
 * Responsibilities:
 * - Issue refresh tokens
 * - Rotate refresh tokens
 * - Detect token reuse attacks
 * - Revoke sessions
 * - Cleanup expired tokens
 *
 * Security model:
 * - Refresh tokens are single-use
 * - Rotation invalidates the previous token atomically
 * - Reuse detection revokes all sessions
 * - Maximum concurrent sessions are enforced
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final SessionRevocationService sessionRevocationService;

    /**
     * Default refresh-token lifetime:
     * 7 days.
     */
    @Value("${jwt.refresh-token-expiration-ms:604800000}")
    private long refreshTokenExpirationMs;

    /**
     * Maximum concurrent active sessions per user.
     */
    @Value("${jwt.max-sessions-per-user:5}")
    private int maxSessionsPerUser;

    /**
     * Cryptographically secure random generator.
     */
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    // ------------------------------------------------------------------------
    // Token Issue
    // ------------------------------------------------------------------------

    /**
     * Creates a new refresh-token session.
     */
    public RefreshToken issue(
            User user,
            String userAgent,
            String ipAddress) {

        enforceSessionLimit(user);

        Instant now = Instant.now();

        RefreshToken refreshToken = RefreshToken.builder()
                .token(generateSecureToken())
                .user(user)
                .expiresAt(
                        now.plusMillis(refreshTokenExpirationMs))
                .userAgent(userAgent)
                .ipAddress(ipAddress)
                .build();

        RefreshToken savedToken =
                refreshTokenRepository.save(refreshToken);

        log.info(
                "Issued refresh token for user: {}",
                user.getUsername());

        return savedToken;
    }

    // ------------------------------------------------------------------------
    // Token Rotation
    // ------------------------------------------------------------------------

    /**
     * Rotates a refresh token.
     *
     * The old token is consumed using an atomic database UPDATE.
     *
     * This prevents two concurrent requests from successfully
     * rotating the same refresh token.
     */
    public RefreshToken rotate(
            String tokenValue,
            String userAgent,
            String ipAddress) {

        RefreshToken existingToken =
                validateRefreshToken(tokenValue);

        User user = existingToken.getUser();

        Instant now = Instant.now();

        // --------------------------------------------------------------------
        // Atomically consume the existing refresh token.
        // --------------------------------------------------------------------

        int updated =
                refreshTokenRepository.markAsUsedIfValid(
                        tokenValue,
                        now);

        /*
         * Exactly one concurrent request should successfully update
         * the token.
         *
         * If zero rows were updated, the token was already consumed,
         * revoked, or became invalid between validation and the
         * atomic update.
         */
        if (updated != 1) {

            log.error(
                    "SECURITY ALERT: Refresh token reuse or concurrent "
                            + "rotation detected for user: {}",
                    user.getUsername());

            /*
             * Revoke all sessions in a separate transaction.
             *
             * This is important because TokenReusedException causes
             * the current transaction to roll back.
             */
            sessionRevocationService.revokeAllSessions(user);

            throw new TokenReusedException(
                    "Refresh token reuse detected. "
                            + "All sessions revoked.");
        }

        // --------------------------------------------------------------------
        // Issue replacement refresh token.
        // --------------------------------------------------------------------

        RefreshToken newRefreshToken = RefreshToken.builder()
                .token(generateSecureToken())
                .user(user)
                .expiresAt(
                        now.plusMillis(refreshTokenExpirationMs))
                .userAgent(userAgent)
                .ipAddress(ipAddress)
                .build();

        RefreshToken savedToken =
                refreshTokenRepository.save(newRefreshToken);

        log.info(
                "Rotated refresh token for user: {}",
                user.getUsername());

        return savedToken;
    }

    // ------------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------------

    /**
     * Validates refresh-token existence and state.
     *
     * Used tokens are intentionally not rejected here.
     *
     * The actual single-use guarantee is enforced atomically inside
     * rotate() using markAsUsedIfValid().
     */
    @Transactional(readOnly = true)
    public RefreshToken validateRefreshToken(String tokenValue) {

        if (tokenValue == null || tokenValue.isBlank()) {
            throw new TokenInvalidException(
                    "Refresh token is required");
        }

        RefreshToken token =
                refreshTokenRepository.findByToken(tokenValue)
                        .orElseThrow(() ->
                                new TokenInvalidException(
                                        "Refresh token not found"));

        if (token.isRevoked()) {
            throw new TokenInvalidException(
                    "Refresh token revoked");
        }

        if (token.isExpired()) {
            throw new TokenInvalidException(
                    "Refresh token expired");
        }

        return token;
    }

    // ------------------------------------------------------------------------
    // Revocation
    // ------------------------------------------------------------------------

    /**
     * Logout current session.
     */
    public void revoke(String tokenValue) {

        if (tokenValue == null || tokenValue.isBlank()) {
            return;
        }

        int updated =
                refreshTokenRepository.revokeByToken(tokenValue);

        if (updated > 0) {
            log.info("Refresh token revoked.");
        }
    }

    /**
     * Logout all sessions for a user.
     */
    public void revokeAll(User user) {

        if (user == null) {
            return;
        }

        int revokedCount =
                refreshTokenRepository.revokeAllForUser(user);

        log.info(
                "Revoked {} sessions for user: {}",
                revokedCount,
                user.getUsername());
    }

    // ------------------------------------------------------------------------
    // Session Management
    // ------------------------------------------------------------------------

    /**
     * Returns all active sessions for a user.
     */
    @Transactional(readOnly = true)
    public List<RefreshToken> getActiveSessions(User user) {

        return refreshTokenRepository.findAllActiveTokens(
                user,
                Instant.now());
    }

    /**
     * Returns the number of active sessions for a user.
     */
    @Transactional(readOnly = true)
    public long getActiveSessionCount(User user) {

        return refreshTokenRepository.countActiveSessions(
                user,
                Instant.now());
    }

    /**
     * Enforces the maximum number of active sessions.
     *
     * Current policy:
     * When the maximum is reached, all existing sessions are revoked
     * before creating the new session.
     */
    private void enforceSessionLimit(User user) {

        long activeSessions =
                refreshTokenRepository.countActiveSessions(
                        user,
                        Instant.now());

        if (activeSessions >= maxSessionsPerUser) {

            log.warn(
                    "User {} reached maximum session limit ({})",
                    user.getUsername(),
                    maxSessionsPerUser);

            refreshTokenRepository.revokeAllForUser(user);
        }
    }

    // ------------------------------------------------------------------------
    // Cleanup Scheduler
    // ------------------------------------------------------------------------

    /**
     * Daily cleanup job.
     *
     * Removes:
     * - expired tokens
     * - revoked tokens
     * - used tokens
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void cleanupExpiredTokens() {

        try {

            int deleted =
                    refreshTokenRepository
                            .deleteExpiredAndInvalidTokens(
                                    Instant.now());

            log.info(
                    "Refresh token cleanup completed. "
                            + "Deleted {} tokens.",
                    deleted);

        } catch (Exception e) {

            log.error(
                    "Refresh token cleanup failed.",
                    e);
        }
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    /**
     * Generates a cryptographically secure opaque refresh token.
     *
     * 48 bytes = 384 bits of entropy.
     */
    private String generateSecureToken() {

        byte[] randomBytes = new byte[48];

        SECURE_RANDOM.nextBytes(randomBytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);
    }

    // ------------------------------------------------------------------------
    // Exceptions
    // ------------------------------------------------------------------------

    /**
     * Thrown when a refresh token is missing, invalid,
     * revoked or expired.
     */
    public static class TokenInvalidException
            extends RuntimeException {

        public TokenInvalidException(String message) {
            super(message);
        }
    }

    /**
     * Thrown when a previously issued refresh token
     * is reused.
     */
    public static class TokenReusedException
            extends RuntimeException {

        public TokenReusedException(String message) {
            super(message);
        }
    }
}