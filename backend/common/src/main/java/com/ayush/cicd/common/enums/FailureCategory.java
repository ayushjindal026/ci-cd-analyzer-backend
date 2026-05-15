// ─────────────────────────────────────────────────────────────────────────────
// PATH: backend/common/src/main/java/com/ayush/cicd/common/enums/FailureCategory.java
package com.ayush.cicd.common.enums;

/**
 * Semantic failure category derived by LogParserService.
 * Used for grouping, filtering, and AI prompt context.
 */
public enum FailureCategory {

    TEST_FAILURE, // JUnit/TestNG test(s) failed
    COMPILATION_ERROR, // javac / maven compile phase failed
    BUILD_ERROR, // docker build, gradle assemble, etc.
    DEPENDENCY_ERROR, // missing/unresolvable dependency
    RUNTIME_ERROR, // process crashed at runtime (non-test)
    OOM, // OutOfMemoryError / killed by OOM killer
    TIMEOUT, // step exceeded configured timeout
    NETWORK_ERROR, // connection refused, DNS failure, etc.
    PERMISSION_ERROR, // EACCES, permission denied
    UNKNOWN; // could not classify

    /** Human-readable label for UI display. */
    public String label() {
        return switch (this) {
            case TEST_FAILURE -> "Test Failure";
            case COMPILATION_ERROR -> "Compilation Error";
            case BUILD_ERROR -> "Build Error";
            case DEPENDENCY_ERROR -> "Dependency Error";
            case RUNTIME_ERROR -> "Runtime Error";
            case OOM -> "Out of Memory";
            case TIMEOUT -> "Timeout";
            case NETWORK_ERROR -> "Network Error";
            case PERMISSION_ERROR -> "Permission Error";
            case UNKNOWN -> "Unknown";
        };
    }

    /** Severity hint — used when no stack trace is available. */
    public String defaultSeverity() {
        return switch (this) {
            case OOM, TIMEOUT -> "CRITICAL";
            case COMPILATION_ERROR,
                    BUILD_ERROR ->
                "HIGH";
            case TEST_FAILURE,
                    RUNTIME_ERROR,
                    DEPENDENCY_ERROR ->
                "MEDIUM";
            default -> "LOW";
        };
    }
}