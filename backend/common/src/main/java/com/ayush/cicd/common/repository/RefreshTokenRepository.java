// PATH: backend/common/src/main/java/com/ayush/cicd/common/repository/RefreshTokenRepository.java

package com.ayush.cicd.common.repository;

import com.ayush.cicd.common.entity.RefreshToken;
import com.ayush.cicd.common.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /**
     * Find refresh token by token value.
     *
     * EntityGraph avoids lazy-loading issues when accessing user later.
     */
    @EntityGraph(attributePaths = { "user" })
    Optional<RefreshToken> findByToken(String token);

    /**
     * Find all active sessions for a user.
     *
     * Useful for:
     * - session management UI
     * - security dashboard
     * - revoke specific session
     */
    @Query("""
                SELECT r FROM RefreshToken r
                WHERE r.user = :user
                  AND r.revoked = false
                  AND r.used = false
                  AND r.expiresAt > :now
                ORDER BY r.createdAt DESC
            """)
    List<RefreshToken> findAllActiveTokens(
            @Param("user") User user,
            @Param("now") Instant now);

    /**
     * Count active valid sessions for a user.
     *
     * Can be used to:
     * - limit max concurrent logins
     * - security monitoring
     */
    @Query("""
                SELECT COUNT(r)
                FROM RefreshToken r
                WHERE r.user = :user
                  AND r.revoked = false
                  AND r.used = false
                  AND r.expiresAt > :now
            """)
    long countActiveSessions(
            @Param("user") User user,
            @Param("now") Instant now);

    /**
     * Revoke ALL active tokens for a user.
     *
     * Used during:
     * - logout all sessions
     * - password reset
     * - suspicious activity
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
                UPDATE RefreshToken r
                SET r.revoked = true
                WHERE r.user = :user
                  AND r.revoked = false
            """)
    int revokeAllForUser(@Param("user") User user);

    /**
     * Revoke a specific token.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
                UPDATE RefreshToken r
                SET r.revoked = true
                WHERE r.token = :token
            """)
    int revokeByToken(@Param("token") String token);

    /**
     * Delete expired/revoked tokens.
     *
     * Recommended:
     * - run daily scheduled cleanup
     * - prevents table bloat
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
                DELETE FROM RefreshToken r
                WHERE r.expiresAt < :before
                   OR r.revoked = true
                   OR r.used = true
            """)
    int deleteExpiredAndInvalidTokens(@Param("before") Instant before);

    /**
     * Check whether token already exists.
     *
     * Extremely unlikely collision,
     * but useful for defensive coding.
     */
    boolean existsByToken(String token);

    /**
     * Delete all tokens belonging to a user.
     *
     * Useful for:
     * - account deletion
     * - GDPR cleanup
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByUser(User user);
}