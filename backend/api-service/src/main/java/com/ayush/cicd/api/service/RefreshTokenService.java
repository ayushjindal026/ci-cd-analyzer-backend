// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/service/RefreshTokenService.java

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
 * RESPONSIBILITIES:
 * - Issue refresh tokens
 * - Rotate refresh tokens
 * - Detect token reuse attacks
 * - Revoke sessions
 * - Cleanup expired tokens
 *
 * SECURITY MODEL:
 * - Refresh tokens are single-use
 * - Rotation invalidates previous token
 * - Reuse detection revokes all sessions
 * - Limits impact of stolen refresh tokens
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    /**
     * Default:
     * 7 days
     */
    @Value("${jwt.refresh-token-expiration-ms:604800000}")
    private long refreshTokenExpirationMs;

    /**
     * Maximum concurrent active sessions per user.
     */
    @Value("${jwt.max-sessions-per-user:5}")
    private int maxSessionsPerUser;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    // ------------------------------------------------------------------------
    // Token Issue
    // ------------------------------------------------------------------------

    /**
     * Creates a new refresh token session.
     */
    public RefreshToken issue(
            User user,
            String userAgent,
            String ipAddress) {

        enforceSessionLimit(user);

        RefreshToken refreshToken = RefreshToken.builder()
                .token(generateSecureToken())
                .user(user)
                .expiresAt(
                        Instant.now().plusMillis(refreshTokenExpirationMs))
                .userAgent(userAgent)
                .ipAddress(ipAddress)
                .build();

        RefreshToken savedToken = refreshTokenRepository.save(refreshToken);

        log.info(
                "Issued refresh token for user: {}",
                user.getUsername());

        return savedToken;
    }

    // ------------------------------------------------------------------------
    // Token Rotation
    // ------------------------------------------------------------------------

    /**
     * Rotates refresh token.
     *
     * SECURITY FLOW:
     * 1. Validate token
     * 2. Detect replay attacks
     * 3. Mark old token as used
     * 4. Issue new token
     */
    public RefreshToken rotate(
            String tokenValue,
            String userAgent,
            String ipAddress) {

        RefreshToken existingToken = validateRefreshToken(tokenValue);

        // --------------------------------------------------------------------
        // Replay attack detection
        // --------------------------------------------------------------------

        if (existingToken.isUsed()) {

            log.error(
                    "SECURITY ALERT: Refresh token reuse detected for user: {}",
                    existingToken.getUser().getUsername());

            refreshTokenRepository
                    .revokeAllForUser(existingToken.getUser());

            throw new TokenReusedException(
                    "Refresh token reuse detected. " +
                            "All sessions revoked.");
        }

        // --------------------------------------------------------------------
        // Invalidate old token
        // --------------------------------------------------------------------

        existingToken.markAsUsed();

        refreshTokenRepository.save(existingToken);

        // --------------------------------------------------------------------
        // Issue new token
        // --------------------------------------------------------------------

        RefreshToken newRefreshToken = RefreshToken.builder()
                .token(generateSecureToken())
                .user(existingToken.getUser())
                .expiresAt(
                        Instant.now()
                                .plusMillis(
                                        refreshTokenExpirationMs))
                .userAgent(userAgent)
                .ipAddress(ipAddress)
                .build();

        RefreshToken savedToken = refreshTokenRepository.save(newRefreshToken);

        log.info(
                "Rotated refresh token for user: {}",
                existingToken.getUser().getUsername());

        return savedToken;
    }

    // ------------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------------

    /**
     * Validates refresh token existence and state.
     */
    @Transactional(readOnly = true)
    public RefreshToken validateRefreshToken(String tokenValue) {

        RefreshToken token = refreshTokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new TokenInvalidException(
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

        int updated = refreshTokenRepository.revokeByToken(tokenValue);

        if (updated > 0) {

            log.info("Refresh token revoked.");
        }
    }

    /**
     * Logout all sessions.
     */
    public void revokeAll(User user) {

        int revokedCount = refreshTokenRepository.revokeAllForUser(user);

        log.info(
                "Revoked {} sessions for user: {}",
                revokedCount,
                user.getUsername());
    }

    // ------------------------------------------------------------------------
    // Session Management
    // ------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<RefreshToken> getActiveSessions(User user) {

        return refreshTokenRepository.findAllActiveTokens(
                user,
                Instant.now());
    }

    @Transactional(readOnly = true)
    public long getActiveSessionCount(User user) {

        return refreshTokenRepository.countActiveSessions(
                user,
                Instant.now());
    }

    private void enforceSessionLimit(User user) {

        long activeSessions = refreshTokenRepository.countActiveSessions(
                user,
                Instant.now());

        if (activeSessions >= maxSessionsPerUser) {

            log.warn(
                    "User {} exceeded max sessions limit ({})",
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

            int deleted = refreshTokenRepository
                    .deleteExpiredAndInvalidTokens(
                            Instant.now());

            log.info(
                    "Refresh token cleanup completed. Deleted {} tokens.",
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
     * Generates cryptographically secure opaque token.
     *
     * 48 bytes = 384 bits entropy.
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

    public static class TokenInvalidException
            extends RuntimeException {

        public TokenInvalidException(String message) {
            super(message);
        }
    }

    public static class TokenReusedException
            extends RuntimeException {

        public TokenReusedException(String message) {
            super(message);
        }
    }
}   