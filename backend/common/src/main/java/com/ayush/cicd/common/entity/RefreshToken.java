// PATH: backend/common/src/main/java/com/ayush/cicd/common/entity/RefreshToken.java

package com.ayush.cicd.common.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Persisted refresh token entity.
 *
 * WHY persist refresh tokens?
 * Stateless JWT access tokens cannot be individually revoked before expiry.
 *
 * Persisting refresh tokens provides:
 * 1. Logout invalidation
 * 2. Refresh token rotation
 * 3. Session tracking
 * 4. Per-device session management
 * 5. Compromised token detection
 *
 * SECURITY FLOW:
 * - Client receives short-lived access token + long-lived refresh token
 * - Access token expires quickly
 * - Refresh token issues a new access token
 * - Refresh token gets rotated after every use
 * - Old token becomes invalid immediately
 */
@Entity
@Table(name = "refresh_tokens", indexes = {
        @Index(name = "idx_refresh_token_token", columnList = "token", unique = true),
        @Index(name = "idx_refresh_token_user_id", columnList = "user_id"),
        @Index(name = "idx_refresh_token_expires_at", columnList = "expires_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "user")
@EqualsAndHashCode(of = "id")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Cryptographically secure random token.
     *
     * NOTE:
     * - Prefer storing SHA-256 hash in production systems
     * - Plain token storage acceptable for MVP/staging
     */
    @Column(nullable = false, unique = true, length = 512)
    private String token;

    /**
     * Owning user/session owner.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Absolute expiry timestamp.
     */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /**
     * Token creation timestamp.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    /**
     * True once token has been used for refresh rotation.
     *
     * Prevents replay attacks:
     * - old refresh token cannot be reused
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean used = false;

    /**
     * Explicit invalidation flag.
     *
     * Used during:
     * - logout
     * - admin revocation
     * - suspicious activity
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    /**
     * Optional client/device metadata.
     *
     * Example:
     * - Chrome on Windows
     * - Safari on iPhone
     */
    @Column(name = "user_agent", length = 500)
    private String userAgent;

    /**
     * Optional IP address tracking.
     *
     * Useful for:
     * - audit logs
     * - suspicious login detection
     * - security monitoring
     */
    @Column(name = "ip_address", length = 100)
    private String ipAddress;

    /**
     * Optimistic locking for concurrent refresh attempts.
     */
    @Version
    private Long version;

    // ------------------------------------------------------------------------
    // Helper Methods
    // ------------------------------------------------------------------------

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isValid() {
        return !used && !revoked && !isExpired();
    }

    public void revoke() {
        this.revoked = true;
    }

    public void markAsUsed() {
        this.used = true;
    }
}