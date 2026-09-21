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
public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, Long> {

    /**
     * Find refresh token by token value.
     *
     * The user is fetched together because the rotation flow
     * needs the owning user.
     */
    @EntityGraph(attributePaths = {"user"})
    Optional<RefreshToken> findByToken(String token);

    /**
     * Atomically marks a refresh token as used.
     *
     * This is the critical concurrency protection.
     *
     * Only the first transaction that finds:
     *
     *   used = false
     *   revoked = false
     *   expires_at > now
     *
     * can update the row.
     *
     * A concurrent request receives 0 affected rows and therefore
     * cannot rotate the same refresh token a second time.
     */
    @Modifying(
            clearAutomatically = true,
            flushAutomatically = true
    )
    @Query("""
            UPDATE RefreshToken r
               SET r.used = true
             WHERE r.token = :token
               AND r.used = false
               AND r.revoked = false
               AND r.expiresAt > :now
            """)
    int markAsUsedIfValid(
            @Param("token") String token,
            @Param("now") Instant now
    );

    /**
     * Find all active sessions for a user.
     */
    @Query("""
            SELECT r
            FROM RefreshToken r
            WHERE r.user = :user
              AND r.revoked = false
              AND r.used = false
              AND r.expiresAt > :now
            ORDER BY r.createdAt DESC
            """)
    List<RefreshToken> findAllActiveTokens(
            @Param("user") User user,
            @Param("now") Instant now
    );

    /**
     * Count active valid sessions for a user.
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
            @Param("now") Instant now
    );

    /**
     * Revoke ALL tokens for a user.
     */
    @Modifying(
            clearAutomatically = true,
            flushAutomatically = true
    )
    @Query("""
            UPDATE RefreshToken r
               SET r.revoked = true
             WHERE r.user = :user
               AND r.revoked = false
            """)
    int revokeAllForUser(
            @Param("user") User user
    );

    /**
     * Revoke a specific token.
     */
    @Modifying(
            clearAutomatically = true,
            flushAutomatically = true
    )
    @Query("""
            UPDATE RefreshToken r
               SET r.revoked = true
             WHERE r.token = :token
            """)
    int revokeByToken(
            @Param("token") String token
    );

    /**
     * Delete expired/revoked/used tokens.
     */
    @Modifying(
            clearAutomatically = true,
            flushAutomatically = true
    )
    @Query("""
            DELETE FROM RefreshToken r
             WHERE r.expiresAt < :before
                OR r.revoked = true
                OR r.used = true
            """)
    int deleteExpiredAndInvalidTokens(
            @Param("before") Instant before
    );

    /**
     * Check whether a generated token already exists.
     */
    boolean existsByToken(String token);

    /**
     * Delete all tokens belonging to a user.
     */
    @Modifying(
            clearAutomatically = true,
            flushAutomatically = true
    )
    void deleteByUser(User user);
}