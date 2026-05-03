package com.ayush.cicd.common.exception;

/**
 * Thrown when a requested entity does not exist in the DB.
 * The GlobalExceptionHandler in api-service maps this to HTTP 404.
 *
 * WHY RuntimeException not checked Exception?
 * Checked exceptions force every method between the repository and
 * the controller to declare "throws ResourceNotFoundException".
 * Spring's convention is unchecked exceptions for data access failures —
 * they bubble up cleanly to the @ExceptionHandler.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resourceName, Long id) {
        super(String.format("%s not found with id: %d", resourceName, id));
    }
}