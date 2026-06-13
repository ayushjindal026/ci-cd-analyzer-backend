// src/components/FailureBadge.jsx
// Renders a colour-coded badge for any FailureCategory value.

const CATEGORY_META = {
    // Build
    BUILD_COMPILATION: { label: 'Compilation Error', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    BUILD_DEPENDENCY: { label: 'Dependency Failure', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    BUILD_TOOL: { label: 'Build Tool Crash', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    BUILD_TIMEOUT: { label: 'Build Timeout', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    // Tests
    TEST_UNIT: { label: 'Unit Test Failure', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    TEST_INTEGRATION: { label: 'Integration Test', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    TEST_FLAKY: { label: 'Flaky Test', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    TEST_COVERAGE: { label: 'Coverage Gate', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    // Docker
    DOCKER_BUILD: { label: 'Docker Build', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    DOCKER_PUSH: { label: 'Docker Push', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    DOCKER_PULL: { label: 'Docker Pull', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    CONTAINER_OOM: { label: 'Container OOM', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    // Network
    NETWORK_TIMEOUT: { label: 'Network Timeout', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    NETWORK_DNS: { label: 'DNS Failure', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    // Infra
    INFRA_RESOURCE: { label: 'Resource Exhaustion', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    INFRA_RUNNER: { label: 'Runner Offline', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    // Kubernetes
    K8S_DEPLOY: { label: 'K8s Deploy', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    K8S_HEALTH_CHECK: { label: 'K8s Health Check', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    K8S_IMAGE_PULL: { label: 'K8s Image Pull', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    K8S_CONFIG: { label: 'K8s Config', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    // Quality
    LINTING: { label: 'Linting', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
    STATIC_ANALYSIS: { label: 'Static Analysis', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
    SECURITY_SCAN: { label: 'Security Scan', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    SECRET_DETECTION: { label: '⚠ Secret Detected', color: 'bg-red-600/30 text-red-200 border-red-500/50' },
    // Auth
    AUTH_CREDENTIALS: { label: 'Auth Credentials', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    AUTH_PERMISSIONS: { label: 'Permissions', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    // Config
    CONFIG_MISSING_ENV: { label: 'Missing Env Var', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
    CONFIG_INVALID: { label: 'Invalid Config', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
    ENV_MISMATCH: { label: 'Env Mismatch', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
    UNKNOWN: { label: 'Unknown', color: 'bg-gray-500/20 text-gray-400 border-gray-500/20' },
};

const SEVERITY_COLORS = {
    CRITICAL: 'bg-red-600/30 text-red-200 border-red-500/50',
    HIGH: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    LOW: 'bg-green-500/20 text-green-300 border-green-500/30',
};

export function FailureBadge({ category }) {
    const meta = CATEGORY_META[category] || CATEGORY_META.UNKNOWN;
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>
            {meta.label}
        </span>
    );
}

export function SeverityBadge({ severity }) {
    const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.LOW;
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
            {severity}
        </span>
    );
}