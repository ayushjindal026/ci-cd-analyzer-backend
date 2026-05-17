// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/exception/GlobalExceptionHandler.java

package com.ayush.cicd.api.exception;

import com.ayush.cicd.api.dto.response.ApiResponse;
import com.ayush.cicd.api.service.RefreshTokenService.TokenInvalidException;
import com.ayush.cicd.api.service.RefreshTokenService.TokenReusedException;
import com.ayush.cicd.common.exception.DuplicateResourceException;
import com.ayush.cicd.common.exception.ResourceNotFoundException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global exception handler.
 *
 * RESPONSIBILITIES:
 * - Convert exceptions into consistent API responses
 * - Prevent internal stacktrace leakage
 * - Centralize error logging
 * - Improve frontend error handling consistency
 *
 * STANDARD RESPONSE:
 * {
 * "success": false,
 * "message": "...",
 * "error": "ERROR_CODE"
 * }
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

        // ------------------------------------------------------------------------
        // 404 - Resource Not Found
        // ------------------------------------------------------------------------

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<ApiResponse<?>> handleResourceNotFound(
                        ResourceNotFoundException ex,
                        HttpServletRequest request) {

                log.debug(
                                "Resource not found [{}]: {}",
                                request.getRequestURI(),
                                ex.getMessage());

                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(
                                                ApiResponse.error(
                                                                ex.getMessage(),
                                                                "RESOURCE_NOT_FOUND"));
        }

        // ------------------------------------------------------------------------
        // 409 - Duplicate Resource
        // ------------------------------------------------------------------------

        @ExceptionHandler(DuplicateResourceException.class)
        public ResponseEntity<ApiResponse<?>> handleDuplicateResource(
                        DuplicateResourceException ex,
                        HttpServletRequest request) {

                log.debug(
                                "Duplicate resource [{}]: {}",
                                request.getRequestURI(),
                                ex.getMessage());

                return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(
                                                ApiResponse.error(
                                                                ex.getMessage(),
                                                                "DUPLICATE_RESOURCE"));
        }

        // ------------------------------------------------------------------------
        // 401 - Invalid Refresh Token
        // ------------------------------------------------------------------------

        @ExceptionHandler(TokenInvalidException.class)
        public ResponseEntity<ApiResponse<?>> handleTokenInvalid(
                        TokenInvalidException ex,
                        HttpServletRequest request) {

                log.debug(
                                "Invalid refresh token [{}]: {}",
                                request.getRequestURI(),
                                ex.getMessage());

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body(
                                                ApiResponse.error(
                                                                ex.getMessage(),
                                                                "INVALID_TOKEN"));
        }

        // ------------------------------------------------------------------------
        // 401 - Refresh Token Reuse Detected
        // ------------------------------------------------------------------------

        @ExceptionHandler(TokenReusedException.class)
        public ResponseEntity<ApiResponse<?>> handleTokenReuse(
                        TokenReusedException ex,
                        HttpServletRequest request) {

                log.warn(
                                "SECURITY: Refresh token reuse detected [{}]: {}",
                                request.getRequestURI(),
                                ex.getMessage());

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body(
                                                ApiResponse.error(
                                                                "Security violation detected. All sessions have been revoked. Please log in again.",
                                                                "TOKEN_REUSE_DETECTED"));
        }

        // ------------------------------------------------------------------------
        // 401 - Authentication Failed
        // ------------------------------------------------------------------------

        @ExceptionHandler(AuthenticationException.class)
        public ResponseEntity<ApiResponse<?>> handleAuthentication(
                        AuthenticationException ex,
                        HttpServletRequest request) {

                log.warn(
                                "Authentication failed [{}]: {}",
                                request.getRequestURI(),
                                ex.getMessage());

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body(
                                                ApiResponse.error(
                                                                "Authentication failed",
                                                                "AUTHENTICATION_FAILED"));
        }

        // ------------------------------------------------------------------------
        // 401 - Invalid JWT
        // ------------------------------------------------------------------------

        @ExceptionHandler(JwtException.class)
        public ResponseEntity<ApiResponse<?>> handleJwtException(
                        JwtException ex,
                        HttpServletRequest request) {

                log.debug(
                                "JWT exception [{}]: {}",
                                request.getRequestURI(),
                                ex.getMessage());

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body(
                                                ApiResponse.error(
                                                                "Invalid JWT token",
                                                                "INVALID_JWT"));
        }

        // ------------------------------------------------------------------------
        // 403 - Access Denied
        // ------------------------------------------------------------------------

        @ExceptionHandler(AccessDeniedException.class)
        public ResponseEntity<ApiResponse<?>> handleAccessDenied(
                        AccessDeniedException ex,
                        HttpServletRequest request) {

                log.warn(
                                "Access denied [{}]: {}",
                                request.getRequestURI(),
                                ex.getMessage());

                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(
                                                ApiResponse.error(
                                                                "Access denied",
                                                                "ACCESS_DENIED"));
        }

        // ------------------------------------------------------------------------
        // 400 - Validation Errors
        // ------------------------------------------------------------------------

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ApiResponse<?>> handleValidation(
                        MethodArgumentNotValidException ex,
                        HttpServletRequest request) {

                Map<String, String> fieldErrors = ex.getBindingResult()
                                .getFieldErrors()
                                .stream()
                                .collect(
                                                Collectors.toMap(
                                                                FieldError::getField,
                                                                error -> error.getDefaultMessage() != null
                                                                                ? error.getDefaultMessage()
                                                                                : "Invalid value",
                                                                (first, second) -> first));

                log.debug(
                                "Validation failed [{}]: {}",
                                request.getRequestURI(),
                                fieldErrors);

                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(
                                                ApiResponse.validationError(
                                                                "Validation failed",
                                                                fieldErrors));
        }

        // ------------------------------------------------------------------------
        // 400 - Missing Request Parameter
        // ------------------------------------------------------------------------

        @ExceptionHandler(MissingServletRequestParameterException.class)
        public ResponseEntity<ApiResponse<?>> handleMissingParameter(
                        MissingServletRequestParameterException ex,
                        HttpServletRequest request) {

                String message = "Missing required parameter: "
                                + ex.getParameterName();

                log.debug(
                                "Missing parameter [{}]: {}",
                                request.getRequestURI(),
                                message);

                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(
                                                ApiResponse.error(
                                                                message,
                                                                "MISSING_PARAMETER"));
        }

        // ------------------------------------------------------------------------
        // 400 - Type Mismatch
        // ------------------------------------------------------------------------

        @ExceptionHandler(MethodArgumentTypeMismatchException.class)
        public ResponseEntity<ApiResponse<?>> handleTypeMismatch(
                        MethodArgumentTypeMismatchException ex,
                        HttpServletRequest request) {

                String message = String.format(
                                "Invalid value '%s' for parameter '%s'",
                                ex.getValue(),
                                ex.getName());

                log.debug(
                                "Type mismatch [{}]: {}",
                                request.getRequestURI(),
                                message);

                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(
                                                ApiResponse.error(
                                                                message,
                                                                "TYPE_MISMATCH"));
        }

        // ------------------------------------------------------------------------
        // 400 - Illegal Argument
        // ------------------------------------------------------------------------

        @ExceptionHandler(IllegalArgumentException.class)
        public ResponseEntity<ApiResponse<?>> handleIllegalArgument(
                        IllegalArgumentException ex,
                        HttpServletRequest request) {

                log.debug(
                                "Illegal argument [{}]: {}",
                                request.getRequestURI(),
                                ex.getMessage());

                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(
                                                ApiResponse.error(
                                                                ex.getMessage(),
                                                                "ILLEGAL_ARGUMENT"));
        }

        // ------------------------------------------------------------------------
        // 500 - Unexpected Error
        // ------------------------------------------------------------------------

        @ExceptionHandler(Exception.class)
        public ResponseEntity<ApiResponse<?>> handleUnexpectedException(
                        Exception ex,
                        HttpServletRequest request) {

                log.error(
                                "Unhandled exception [{}]: {}",
                                request.getRequestURI(),
                                ex.getMessage(),
                                ex);

                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(
                                                ApiResponse.error(
                                                                "An unexpected error occurred. Please try again.",
                                                                "INTERNAL_SERVER_ERROR"));
        }
}