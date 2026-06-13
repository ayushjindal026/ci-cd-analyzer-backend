// ─────────────────────────────────────────────────────────────────────────────
// PATH: backend/common/src/main/java/com/ayush/cicd/common/enums/FailureCategory.java
// ─────────────────────────────────────────────────────────────────────────────

package com.ayush.cicd.common.enums;

/**
 * Granular failure taxonomy used by the AI classification engine.
 *
 * Categories are ordered roughly by frequency in typical CI/CD systems.
 * Each value maps to a display label and severity used by the frontend.
 */
public enum FailureCategory {

    // ─────────────────────────────────────────────────────────────────────
    // BUILD & COMPILATION
    // ─────────────────────────────────────────────────────────────────────
    BUILD_COMPILATION, // javac/tsc/gcc compile error
    BUILD_DEPENDENCY, // maven/npm/pip resolution failure
    BUILD_TOOL, // gradle/maven plugin crash
    BUILD_TIMEOUT, // build exceeded time limit

    // ─────────────────────────────────────────────────────────────────────
    // TESTS
    // ─────────────────────────────────────────────────────────────────────
    TEST_UNIT, // unit test assertion failure
    TEST_INTEGRATION, // integration/contract test failure
    TEST_FLAKY, // intermittently failing test
    TEST_COVERAGE, // coverage threshold not met

    // ─────────────────────────────────────────────────────────────────────
    // DOCKER & CONTAINERS
    // ─────────────────────────────────────────────────────────────────────
    DOCKER_BUILD, // Dockerfile build failure
    DOCKER_PUSH, // registry push authentication/rate limit
    DOCKER_PULL, // base image pull failure
    CONTAINER_OOM, // container killed due to OOM

    // ─────────────────────────────────────────────────────────────────────
    // INFRASTRUCTURE & NETWORK
    // ─────────────────────────────────────────────────────────────────────
    NETWORK_TIMEOUT, // HTTP/TCP timeout
    NETWORK_DNS, // DNS resolution failure
    INFRA_RESOURCE, // runner out of disk/cpu/memory
    INFRA_RUNNER, // CI runner provisioning failure

    // ─────────────────────────────────────────────────────────────────────
    // KUBERNETES & DEPLOYMENT
    // ─────────────────────────────────────────────────────────────────────
    K8S_DEPLOY, // kubectl/helm deployment failure
    K8S_HEALTH_CHECK, // readiness/liveness failure
    K8S_IMAGE_PULL, // ImagePullBackOff
    K8S_CONFIG, // RBAC/config/secret issue

    // ─────────────────────────────────────────────────────────────────────
    // CODE QUALITY & SECURITY
    // ─────────────────────────────────────────────────────────────────────
    LINTING, // eslint/checkstyle/etc.
    STATIC_ANALYSIS, // sonarqube/spotbugs/etc.
    SECURITY_SCAN, // trivy/snyk/dependency-check
    SECRET_DETECTION, // hardcoded credentials detected

    // ─────────────────────────────────────────────────────────────────────
    // AUTHENTICATION & PERMISSIONS
    // ─────────────────────────────────────────────────────────────────────
    AUTH_CREDENTIALS, // expired/missing token
    AUTH_PERMISSIONS, // insufficient IAM/github permissions

    // ─────────────────────────────────────────────────────────────────────
    // CONFIGURATION & ENVIRONMENT
    // ─────────────────────────────────────────────────────────────────────
    CONFIG_MISSING_ENV, // required env variable missing
    CONFIG_INVALID, // malformed yaml/json/properties
    ENV_MISMATCH, // runtime version mismatch

    // ─────────────────────────────────────────────────────────────────────
    // FALLBACK
    // ─────────────────────────────────────────────────────────────────────
    UNKNOWN;

    /**
     * Human-readable label for UI display.
     */
    public String label() {

        return switch (this) {

            // BUILD
            case BUILD_COMPILATION -> "Compilation Error";
            case BUILD_DEPENDENCY -> "Dependency Resolution";
            case BUILD_TOOL -> "Build Tool Crash";
            case BUILD_TIMEOUT -> "Build Timeout";

            // TESTS
            case TEST_UNIT -> "Unit Test Failure";
            case TEST_INTEGRATION -> "Integration Test Failure";
            case TEST_FLAKY -> "Flaky Test";
            case TEST_COVERAGE -> "Coverage Gate";

            // DOCKER
            case DOCKER_BUILD -> "Docker Build";
            case DOCKER_PUSH -> "Docker Push";
            case DOCKER_PULL -> "Docker Pull";
            case CONTAINER_OOM -> "Container OOM";

            // INFRA
            case NETWORK_TIMEOUT -> "Network Timeout";
            case NETWORK_DNS -> "DNS Failure";
            case INFRA_RESOURCE -> "Resource Exhaustion";
            case INFRA_RUNNER -> "Runner Failure";

            // K8S
            case K8S_DEPLOY -> "Kubernetes Deploy";
            case K8S_HEALTH_CHECK -> "K8s Health Check";
            case K8S_IMAGE_PULL -> "K8s Image Pull";
            case K8S_CONFIG -> "K8s Config";

            // QUALITY
            case LINTING -> "Linting";
            case STATIC_ANALYSIS -> "Static Analysis";
            case SECURITY_SCAN -> "Security Scan";
            case SECRET_DETECTION -> "Secret Detected";

            // AUTH
            case AUTH_CREDENTIALS -> "Auth Credentials";
            case AUTH_PERMISSIONS -> "Permission Denied";

            // CONFIG
            case CONFIG_MISSING_ENV -> "Missing Environment Variable";
            case CONFIG_INVALID -> "Invalid Configuration";
            case ENV_MISMATCH -> "Environment Mismatch";

            // UNKNOWN
            case UNKNOWN -> "Unknown";
        };
    }

    /**
     * Default severity used when AI confidence is low
     * or stack traces are unavailable.
     */
    public String defaultSeverity() {

        return switch (this) {

            // CRITICAL
            case CONTAINER_OOM,
                    BUILD_TIMEOUT,
                    INFRA_RESOURCE,
                    INFRA_RUNNER,
                    K8S_DEPLOY,
                    SECURITY_SCAN,
                    SECRET_DETECTION ->
                "CRITICAL";

            // HIGH
            case BUILD_COMPILATION,
                    BUILD_DEPENDENCY,
                    BUILD_TOOL,
                    DOCKER_BUILD,
                    DOCKER_PUSH,
                    DOCKER_PULL,
                    K8S_HEALTH_CHECK,
                    K8S_IMAGE_PULL,
                    K8S_CONFIG,
                    AUTH_CREDENTIALS,
                    AUTH_PERMISSIONS,
                    CONFIG_INVALID ->
                "HIGH";

            // MEDIUM
            case TEST_UNIT,
                    TEST_INTEGRATION,
                    TEST_FLAKY,
                    TEST_COVERAGE,
                    NETWORK_TIMEOUT,
                    NETWORK_DNS,
                    STATIC_ANALYSIS,
                    LINTING,
                    CONFIG_MISSING_ENV,
                    ENV_MISMATCH ->
                "MEDIUM";

            // LOW
            case UNKNOWN -> "LOW";
        };
    }

    /**
     * Helpful for frontend badges/colors.
     */
    public boolean isInfrastructureFailure() {

        return switch (this) {
            case NETWORK_TIMEOUT,
                    NETWORK_DNS,
                    INFRA_RESOURCE,
                    INFRA_RUNNER,
                    K8S_DEPLOY,
                    K8S_HEALTH_CHECK,
                    K8S_IMAGE_PULL,
                    K8S_CONFIG ->
                true;

            default -> false;
        };
    }

    /**
     * Whether the category is likely retryable automatically.
     */
    public boolean retryable() {

        return switch (this) {

            case NETWORK_TIMEOUT,
                    NETWORK_DNS,
                    INFRA_RUNNER,
                    DOCKER_PULL,
                    DOCKER_PUSH,
                    TEST_FLAKY ->
                true;

            default -> false;
        };
    }
}