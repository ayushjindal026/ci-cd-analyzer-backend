// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/dto/request/LogoutRequest.java

package com.ayush.cicd.api.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

/**
 * Logout request payload.
 *
 * Supports:
 * - single-session logout
 * - logout all sessions
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class LogoutRequest {

    /**
     * Optional refresh token.
     *
     * If provided:
     * - revoke specific session
     *
     * If absent + logoutAll=true:
     * - revoke all sessions
     */
    @JsonProperty("refresh_token")
    private String refreshToken;

    /**
     * Logout all active sessions.
     */
    @Builder.Default
    @JsonProperty("logout_all")
    private boolean logoutAll = false;

    /**
     * Optional future session identifier.
     *
     * Useful for:
     * - device-specific logout
     * - session management UI
     */
    @JsonProperty("session_id")
    private String sessionId;
}