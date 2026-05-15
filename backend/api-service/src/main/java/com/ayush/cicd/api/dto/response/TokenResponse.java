// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/dto/response/TokenResponse.java

package com.ayush.cicd.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

/**
 * Authentication token response.
 *
 * Returned during:
 * - OAuth login
 * - Token refresh
 * - Future password login
 *
 * Includes:
 * - access token
 * - refresh token
 * - expiry metadata
 * - authenticated user metadata
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TokenResponse {

    /**
     * Short-lived JWT access token.
     */
    @JsonProperty("access_token")
    private String accessToken;

    /**
     * Long-lived opaque refresh token.
     */
    @JsonProperty("refresh_token")
    private String refreshToken;

    /**
     * Access token expiry in seconds.
     */
    @JsonProperty("expires_in")
    private long expiresIn;

    /**
     * Token type.
     */
    @Builder.Default
    @JsonProperty("token_type")
    private String tokenType = "Bearer";

    // ------------------------------------------------------------------------
    // User Metadata
    // ------------------------------------------------------------------------

    @JsonProperty("user_id")
    private Long userId;

    private String username;

    private String email;

    @JsonProperty("avatar_url")
    private String avatarUrl;

    /**
     * Optional future RBAC support.
     */
    private List<String> roles;

    /**
     * Optional session metadata.
     */
    @JsonProperty("session_id")
    private String sessionId;
}