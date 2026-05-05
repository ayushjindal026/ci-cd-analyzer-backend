package com.ayush.cicd.api.security;

import com.ayush.cicd.common.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Handles JWT generation and validation.
 *
 * WHY HMAC-SHA256 (HS256)?
 * Symmetric signing — same key signs and verifies.
 * Sufficient for a single-service architecture where
 * only our backend ever verifies tokens.
 * RS256 (asymmetric) is needed when multiple services
 * verify tokens independently — overkill for now.
 *
 * WHY store userId AND username in the token?
 * userId = database lookup key (never changes)
 * username = display purposes without a DB hit
 * We never store sensitive data (email, token) in JWT —
 * JWTs are base64 encoded, not encrypted. Anyone can decode them.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class JwtService {

    private final JwtProperties jwtProperties;

    public String generateToken(User user) {
        SecretKey key = getSigningKey();
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtProperties.getExpirationMs());

        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("username", user.getUsername())
                .claim("githubId", user.getGithubId())
                .claim("avatarUrl", user.getAvatarUrl())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public Claims validateAndExtractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long extractUserId(String token) {
        return Long.parseLong(validateAndExtractClaims(token).getSubject());
    }

    public boolean isTokenValid(String token) {
        try {
            validateAndExtractClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("JWT token expired");
        } catch (JwtException e) {
            log.warn("JWT token invalid: {}", e.getMessage());
        }
        return false;
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtProperties.getSecret()
                .getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}