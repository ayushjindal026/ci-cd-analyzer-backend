// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/dto/response/ApiResponse.java

package com.ayush.cicd.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.Instant;
import java.util.Map;

/**
 * Standard API response wrapper.
 *
 * SUCCESS:
 * {
 * "success": true,
 * "message": "Repository added successfully",
 * "data": {...},
 * "timestamp": "2026-05-17T12:00:00Z"
 * }
 *
 * ERROR:
 * {
 * "success": false,
 * "message": "Validation failed",
 * "error": "VALIDATION_ERROR",
 * "timestamp": "2026-05-17T12:00:00Z"
 * }
 *
 * VALIDATION:
 * {
 * "success": false,
 * "message": "Validation failed",
 * "error": "VALIDATION_ERROR",
 * "fieldErrors": {
 * "email": "Email is required"
 * }
 * }
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    // ------------------------------------------------------------------------
    // Core Fields
    // ------------------------------------------------------------------------

    private boolean success;

    private String message;

    /**
     * Optional response payload.
     */
    private T data;

    /**
     * Optional machine-readable error code.
     */
    private String error;

    /**
     * Validation field-level errors.
     */
    private Map<String, String> fieldErrors;

    /**
     * Response creation timestamp.
     */
    @Builder.Default
    private Instant timestamp = Instant.now();

    // ------------------------------------------------------------------------
    // Success Responses
    // ------------------------------------------------------------------------

    public static <T> ApiResponse<T> success(T data) {

        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> success(
            T data,
            String message) {

        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> success(
            String message) {

        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .build();
    }

    // ------------------------------------------------------------------------
    // Error Responses
    // ------------------------------------------------------------------------

    public static <T> ApiResponse<T> error(
            String message) {

        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .build();
    }

    public static <T> ApiResponse<T> error(
            String message,
            String errorCode) {

        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .error(errorCode)
                .build();
    }

    // ------------------------------------------------------------------------
    // Validation Error Responses
    // ------------------------------------------------------------------------

    public static <T> ApiResponse<T> validationError(
            String message,
            Map<String, String> fieldErrors) {

        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .error("VALIDATION_ERROR")
                .fieldErrors(fieldErrors)
                .build();
    }
}