// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/dto/request/RefreshTokenRequest.java

package com.ayush.cicd.api.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Refresh token request payload.
 *
 * Used by:
 * POST /auth/refresh
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class RefreshTokenRequest {

    /**
     * Opaque refresh token.
     */
    @NotBlank(message = "Refresh token is required")
    @Size(max = 1024, message = "Refresh token too large")
    @JsonProperty("refresh_token")
    private String refreshToken;
}