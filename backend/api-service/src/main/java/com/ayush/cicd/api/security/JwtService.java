// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/security/JwtService.java

package com.ayush.cicd.api.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

/**
 * JWT access token service.
 *
 * RESPONSIBILITIES:
 * - Generate short-lived access tokens
 * - Validate JWT integrity/signature
 * - Extract claims
 * - Enforce token type
 *
 * IMPORTANT:
 * Refresh tokens are NOT JWTs.
 * They are opaque random strings persisted in DB.
 *
 * SECURITY MODEL:
 * - Access token: short-lived (~15 min)
 * - Refresh token: long-lived + rotated
 * - Limits impact of stolen access tokens
 */
@Slf4j
@Service
@Getter
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    /**
     * Access token expiration.
     *
     * Default:
     * 15 minutes
     */
    @Value("${jwt.access-token-expiration-ms:900000}")
    private long accessTokenExpirationMs;

    /**
     * Optional issuer validation.
     */
    @Value("${jwt.issuer:cicd-analyzer}")
    private String issuer;

    /**
     * Allowed clock skew in seconds.
     *
     * Prevents failures due to minor server/client time drift.
     */
    @Value("${jwt.clock-skew-seconds:30}")
    private long clockSkewSeconds;

    private Key signingKey;

    private JwtParser jwtParser;

    // ------------------------------------------------------------------------
    // Initialization
    // ------------------------------------------------------------------------

    @PostConstruct
    public void init() {

        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException(
                    "JWT secret must be at least 32 characters long.");
        }

        this.signingKey = Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8));

        this.jwtParser = Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .setAllowedClockSkewSeconds(clockSkewSeconds)
                .requireIssuer(issuer)
                .build();

        log.info("JWT service initialized successfully.");
    }

    // ------------------------------------------------------------------------
    // Token Generation
    // ------------------------------------------------------------------------

    public String generateAccessToken(
            Long userId,
            String username,
            String email) {

        Date now = new Date();

        Date expiry = new Date(
                now.getTime() + accessTokenExpirationMs);

        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .setIssuer(issuer)
                .claim("username", username)
                .claim("email", email != null ? email : "")
                .claim("type", "access")
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    // ------------------------------------------------------------------------
    // Backward Compatibility
    // ------------------------------------------------------------------------

    /**
     * @deprecated Use generateAccessToken()
     */
    @Deprecated
    public String generate(Long userId, String login, String email) {
        return generateAccessToken(userId, login, email);
    }

    public boolean isTokenValid(String token) {
        return isValid(token);
    }

    public Claims validateAndExtractClaims(String token) {
        return validate(token);
    }

    // ------------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------------

    public Claims validate(String token) {

        try {

            Claims claims = jwtParser
                    .parseClaimsJws(token)
                    .getBody();

            validateAccessTokenType(claims);

            return claims;

        } catch (ExpiredJwtException e) {

            log.debug("JWT expired.");

            throw e;

        } catch (UnsupportedJwtException e) {

            log.warn("Unsupported JWT.");

            throw e;

        } catch (MalformedJwtException e) {

            log.warn("Malformed JWT.");

            throw e;

        } catch (SecurityException e) {

            log.warn("Invalid JWT signature.");

            throw e;

        } catch (IllegalArgumentException e) {

            log.warn("JWT token compact string is empty.");

            throw e;
        }
    }

    public boolean isValid(String token) {

        try {

            validate(token);

            return true;

        } catch (JwtException | IllegalArgumentException e) {

            return false;
        }
    }

    // ------------------------------------------------------------------------
    // Claim Extraction
    // ------------------------------------------------------------------------

    public Long getUserId(String token) {
        return Long.parseLong(validate(token).getSubject());
    }

    public String getUsername(String token) {
        return validate(token).get("username", String.class);
    }

    public String getEmail(String token) {
        return validate(token).get("email", String.class);
    }

    public Date getExpiration(String token) {
        return validate(token).getExpiration();
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    private void validateAccessTokenType(Claims claims) {

        String tokenType = claims.get("type", String.class);

        if (!"access".equals(tokenType)) {

            throw new JwtException(
                    "Invalid token type. Expected access token.");
        }
    }
}