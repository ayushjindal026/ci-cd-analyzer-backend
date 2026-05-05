package com.ayush.cicd.api.security;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {

    /**
     * Secret key for signing JWTs.
     * Must be at least 32 characters for HMAC-SHA256.
     * Set via environment variable JWT_SECRET in production.
     * NEVER hardcode this in application.properties committed to git.
     */
    private String secret;

    /**
     * Token expiry in milliseconds.
     * Default: 7 days = 604800000 ms
     */
    private long expirationMs = 604_800_000L;
}