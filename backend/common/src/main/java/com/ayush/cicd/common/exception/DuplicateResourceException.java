package com.ayush.cicd.common.exception;

/**
 * Thrown when trying to register a resource that already exists.
 * The GlobalExceptionHandler maps this to HTTP 409 Conflict.
 */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}