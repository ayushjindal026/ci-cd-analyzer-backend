package com.ayush.cicd.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Standard envelope for every API response in this project.
 *
 * WHY a standard envelope?
 * Without it, different endpoints return bare objects, arrays, error strings —
 * unpredictable for any client. With it, clients always know:
 * - Was this successful? → success field
 * - Where is the data? → data field
 * - What went wrong? → error field
 * - When did this happen? → timestamp field
 *
 * WHY @JsonInclude(NON_NULL)?
 * Error responses have no 'data'. Success responses have no 'error'.
 * NON_NULL omits those fields from the JSON entirely instead of
 * returning "data": null or "error": null.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;
    private String error;

    @Builder.Default
    private Instant timestamp = Instant.now();

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> error(String errorMessage) {
        return ApiResponse.<T>builder()
                .success(false)
                .error(errorMessage)
                .build();
    }
}