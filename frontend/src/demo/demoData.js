// ─────────────────────────────────────────────────────────────────────────────
// src/demo/demoData.js
// Single source of truth for all demo/guest mode data.
// Nothing here ever hits the network.
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────
const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString()
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// ── Repositories ──────────────────────────────────────────────────────────────
export const DEMO_REPOS = [
    {
        id: 1,
        owner: 'acme-corp',
        repoName: 'api-gateway',
        fullName: 'acme-corp/api-gateway',
        language: 'Java',
        defaultBranch: 'main',
        successRate: 82,
        totalRuns: 247,
        lastRunStatus: 'success',
        lastRunAt: ago(14),
        active: true,
    },
    {
        id: 2,
        owner: 'acme-corp',
        repoName: 'frontend-app',
        fullName: 'acme-corp/frontend-app',
        language: 'TypeScript',
        defaultBranch: 'main',
        successRate: 91,
        totalRuns: 189,
        lastRunStatus: 'running',
        lastRunAt: ago(3),
        active: true,
    },
    {
        id: 3,
        owner: 'acme-corp',
        repoName: 'ml-pipeline',
        fullName: 'acme-corp/ml-pipeline',
        language: 'Python',
        defaultBranch: 'develop',
        successRate: 58,
        totalRuns: 94,
        lastRunStatus: 'failed',
        lastRunAt: ago(47),
        active: true,
    },
    {
        id: 4,
        owner: 'acme-corp',
        repoName: 'infra-terraform',
        fullName: 'acme-corp/infra-terraform',
        language: 'HCL',
        defaultBranch: 'main',
        successRate: 96,
        totalRuns: 61,
        lastRunStatus: 'success',
        lastRunAt: ago(120),
        active: true,
    },
]

// ── Pipeline runs ─────────────────────────────────────────────────────────────
export const DEMO_RUNS = [
    {
        id: 101,
        buildNumber: 247,
        repositoryId: 1,
        repoName: 'api-gateway',
        workflowName: 'CI / Build & Test',
        branch: 'main',
        headSha: 'a3f82bc',
        commitMessage: 'fix: resolve connection pool timeout',
        triggeredBy: 'push',
        status: 'success',
        durationMs: 312_000,
        startedAt: ago(14),
        stages: [
            { name: 'Checkout', status: 'SUCCESS', durationMs: 8_000 },
            { name: 'Build', status: 'SUCCESS', durationMs: 120_000 },
            { name: 'Test', status: 'SUCCESS', durationMs: 145_000 },
            { name: 'Docker', status: 'SUCCESS', durationMs: 39_000 },
        ],
    },
    {
        id: 102,
        buildNumber: 190,
        repositoryId: 2,
        repoName: 'frontend-app',
        workflowName: 'CI / Lint · Build · Deploy',
        branch: 'feature/dark-mode',
        headSha: 'c9d14ef',
        commitMessage: 'feat: add dark mode toggle',
        triggeredBy: 'push',
        status: 'running',
        durationMs: null,
        startedAt: ago(3),
        stages: [
            { name: 'Install', status: 'SUCCESS', durationMs: 45_000 },
            { name: 'Lint', status: 'SUCCESS', durationMs: 18_000 },
            { name: 'Build', status: 'RUNNING', durationMs: null },
            { name: 'Deploy', status: 'PENDING', durationMs: null },
        ],
    },
    {
        id: 103,
        buildNumber: 94,
        repositoryId: 3,
        repoName: 'ml-pipeline',
        workflowName: 'ML / Train & Evaluate',
        branch: 'experiment/transformer-v2',
        headSha: 'f7a23dd',
        commitMessage: 'chore: bump pytorch version',
        triggeredBy: 'push',
        status: 'failed',
        durationMs: 872_000,
        startedAt: ago(47),
        stages: [
            { name: 'Checkout', status: 'SUCCESS', durationMs: 6_000 },
            { name: 'Install', status: 'SUCCESS', durationMs: 240_000 },
            { name: 'Train', status: 'FAILED', durationMs: 600_000 },
            { name: 'Evaluate', status: 'SKIPPED', durationMs: null },
        ],
        failureReason: 'CUDA out of memory. Tried to allocate 2.50 GiB on device 0 with 1.94 GiB total capacity.',
    },
    {
        id: 104,
        buildNumber: 246,
        repositoryId: 1,
        repoName: 'api-gateway',
        workflowName: 'CI / Build & Test',
        branch: 'fix/auth-token-refresh',
        headSha: 'b2e91ca',
        commitMessage: 'fix: refresh token rotation on 401',
        triggeredBy: 'pull_request',
        status: 'success',
        durationMs: 298_000,
        startedAt: ago(95),
        stages: [
            { name: 'Checkout', status: 'SUCCESS', durationMs: 7_000 },
            { name: 'Build', status: 'SUCCESS', durationMs: 115_000 },
            { name: 'Test', status: 'SUCCESS', durationMs: 138_000 },
            { name: 'Docker', status: 'SUCCESS', durationMs: 38_000 },
        ],
    },
    {
        id: 105,
        buildNumber: 245,
        repositoryId: 1,
        repoName: 'api-gateway',
        workflowName: 'CI / Build & Test',
        branch: 'feature/rate-limiting',
        headSha: 'd5f30ba',
        commitMessage: 'feat: add Redis-based rate limiting',
        triggeredBy: 'push',
        status: 'failed',
        durationMs: 187_000,
        startedAt: ago(180),
        stages: [
            { name: 'Checkout', status: 'SUCCESS', durationMs: 8_000 },
            { name: 'Build', status: 'SUCCESS', durationMs: 118_000 },
            { name: 'Test', status: 'FAILED', durationMs: 61_000 },
            { name: 'Docker', status: 'SKIPPED', durationMs: null },
        ],
        failureReason: 'RateLimiterServiceTest.testBurstLimit — expected 429 but was 200. Redis not available in test env.',
    },
    {
        id: 106,
        buildNumber: 62,
        repositoryId: 4,
        repoName: 'infra-terraform',
        workflowName: 'Infra / Plan & Apply',
        branch: 'main',
        headSha: 'e8c44fa',
        commitMessage: 'chore: update ECS task definition',
        triggeredBy: 'push',
        status: 'success',
        durationMs: 145_000,
        startedAt: ago(120),
        stages: [
            { name: 'Init', status: 'SUCCESS', durationMs: 25_000 },
            { name: 'Plan', status: 'SUCCESS', durationMs: 48_000 },
            { name: 'Apply', status: 'SUCCESS', durationMs: 72_000 },
        ],
    },
    {
        id: 107,
        buildNumber: 93,
        repositoryId: 3,
        repoName: 'ml-pipeline',
        workflowName: 'ML / Train & Evaluate',
        branch: 'develop',
        headSha: 'a1b2c3d',
        commitMessage: 'perf: optimize data loader batch size',
        triggeredBy: 'schedule',
        status: 'failed',
        durationMs: 1_200_000,
        startedAt: ago(340),
        stages: [
            { name: 'Checkout', status: 'SUCCESS', durationMs: 5_000 },
            { name: 'Install', status: 'SUCCESS', durationMs: 230_000 },
            { name: 'Train', status: 'FAILED', durationMs: 960_000 },
            { name: 'Evaluate', status: 'SKIPPED', durationMs: null },
        ],
    },
    {
        id: 108,
        buildNumber: 189,
        repositoryId: 2,
        repoName: 'frontend-app',
        workflowName: 'CI / Lint · Build · Deploy',
        branch: 'main',
        headSha: '7f3d2e1',
        commitMessage: 'release: v2.4.1',
        triggeredBy: 'push',
        status: 'success',
        durationMs: 195_000,
        startedAt: ago(420),
        stages: [
            { name: 'Install', status: 'SUCCESS', durationMs: 42_000 },
            { name: 'Lint', status: 'SUCCESS', durationMs: 16_000 },
            { name: 'Build', status: 'SUCCESS', durationMs: 98_000 },
            { name: 'Deploy', status: 'SUCCESS', durationMs: 39_000 },
        ],
    },
]

// ── Analytics / metrics ───────────────────────────────────────────────────────
const buildTrend = () =>
    Array.from({ length: 14 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (13 - i))
        const f = Math.round(8 + Math.sin(i * 0.9) * 10 + rand(0, 8))
        return {
            date: d.toISOString().split('T')[0],
            failureRate: f,
            successRate: 100 - f,
        }
    })

export const DEMO_METRICS = {
    totalRuns: 591,
    successfulRuns: 471,
    failedRuns: 97,
    runningRuns: 1,
    pendingRuns: 22,
    successRate: 80,
    failureRate: 16,
    avgDuration: 287,          // seconds
    flakyTestCount: 4,
    windowDays: 14,
    failureRateTrend: buildTrend(),
    stageDurations: [
        { stage: 'Checkout', avgDuration: 7, maxDuration: 18 },
        { stage: 'Build', avgDuration: 118, maxDuration: 275 },
        { stage: 'Test', avgDuration: 198, maxDuration: 460 },
        { stage: 'Docker', avgDuration: 57, maxDuration: 128 },
        { stage: 'Deploy', avgDuration: 41, maxDuration: 89 },
    ],
    statusBreakdown: [
        { name: 'Success', value: 471 },
        { name: 'Failed', value: 97 },
        { name: 'Running', value: 1 },
        { name: 'Pending', value: 22 },
    ],
}

// ── AI Insights ───────────────────────────────────────────────────────────────
export const DEMO_INSIGHTS = [
    {
        id: 'i1',
        runId: 103,
        repoName: 'ml-pipeline',
        severity: 'critical',
        stage: 'Train',
        priority: 'P1',
        title: 'GPU Out-of-Memory — Recurring on PyTorch Upgrade',
        summary: 'CUDA OOM on 3 of last 4 runs after pytorch bump to 2.3.0.',
        diagnosis: `The pytorch 2.3.0 upgrade increased the default memory pre-allocation strategy.
The Train stage allocates a 2.50 GiB tensor but the runner only has 1.94 GiB available.
This pattern appears on every push to experiment/* branches since commit f7a23dd.`,
        rootCause: 'pytorch 2.3.0 changed CUDA memory allocator defaults — pre-allocates more memory upfront than 2.2.x.',
        recommendation: 'Pin pytorch to 2.2.2 or set PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True.',
        remediationSteps: [
            'Pin pytorch==2.2.2 in requirements.txt until memory profiling is done.',
            'Add PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True to your workflow env.',
            'Reduce batch size from 128 → 64 in train_config.yaml as a short-term fix.',
            'Upgrade runner from t3.medium to g4dn.xlarge for long-term resolution.',
        ],
        flakinessScore: 0.15,
        isFlaky: false,
        estimatedFixTime: '30 minutes',
        analysedAt: ago(40),
        modelUsed: 'gpt-4o-mini',
    },
    {
        id: 'i2',
        runId: 105,
        repoName: 'api-gateway',
        severity: 'warning',
        stage: 'Test',
        priority: 'P2',
        title: 'Flaky Integration Test — Redis Not Available in CI',
        summary: 'RateLimiterServiceTest fails intermittently when Redis container is slow to start.',
        diagnosis: `The test RateLimiterServiceTest.testBurstLimit depends on a Redis Testcontainer
that sometimes isn't ready within the 5s await timeout. The test passes locally
because Redis is already running. In CI, cold-start latency causes ~40% failure rate.`,
        rootCause: 'Testcontainer Redis readiness check too short (5s) for cold CI runners.',
        recommendation: 'Increase Testcontainer wait strategy to 30s or use WaitStrategy.forListeningPort().',
        remediationSteps: [
            'Replace fixed 5s wait with: wait.forListeningPort().withStartupTimeout(Duration.ofSeconds(30))',
            'Add @Retryable(3) on the test method as a short-term guard.',
            'Consider using an embedded Redis (testredis) instead of Testcontainer for unit tests.',
        ],
        flakinessScore: 0.72,
        isFlaky: true,
        estimatedFixTime: '15 minutes',
        analysedAt: ago(170),
        modelUsed: 'gpt-4o-mini',
    },
    {
        id: 'i3',
        runId: 107,
        repoName: 'ml-pipeline',
        severity: 'warning',
        stage: 'Train',
        priority: 'P2',
        title: 'Training Timeout Exceeding 20-Minute CI Limit',
        summary: 'Scheduled training job runs over 20 minutes and is killed by GitHub Actions timeout.',
        diagnosis: `The nightly scheduled run trains on the full dataset (120K samples) but the
workflow timeout is set to 20 minutes. Actual training takes 21-25 minutes.
The job is killed mid-epoch, leaving no model artifact and causing downstream evaluate stage to skip.`,
        rootCause: 'CI timeout (20m) shorter than actual training duration (21-25m) on full dataset.',
        recommendation: 'Increase workflow timeout to 35m or switch nightly runs to a self-hosted runner.',
        remediationSteps: [
            'In .github/workflows/ml-pipeline.yml add: timeout-minutes: 35',
            'Use TRAIN_SUBSET=0.1 env var for PR runs, full dataset only on schedule.',
            'Add model checkpoint saving every 5 epochs so partial runs produce usable artifacts.',
        ],
        flakinessScore: 0.1,
        isFlaky: false,
        estimatedFixTime: '10 minutes',
        analysedAt: ago(320),
        modelUsed: 'gpt-4o-mini',
    },
    {
        id: 'i4',
        runId: null,
        repoName: 'api-gateway',
        severity: 'info',
        stage: 'Build',
        priority: 'P3',
        title: 'Build Time Trending Up — Maven Cache Stale',
        summary: 'Average build time increased 31% over past 7 days (90s → 118s).',
        diagnosis: `Maven dependency resolution is hitting the remote repository on ~60% of builds.
The GitHub Actions cache key includes the full pom.xml hash. Any change to pom.xml
(even formatting) invalidates the entire ~/.m2 cache, forcing a full re-download.`,
        rootCause: 'Cache key too sensitive — invalidates on any pom.xml change including non-dependency edits.',
        recommendation: "Change cache key to hash only the <dependencies> section, not the full pom.xml.",
        remediationSteps: [
            "Use hashFiles('**/pom.xml') but add a restore-keys fallback for partial cache hits.",
            'Split cache into layers: dependencies (rare change) vs plugins (frequent change).',
            'Add -Dmaven.artifact.threads=8 to speed up parallel artifact download.',
        ],
        flakinessScore: 0.05,
        isFlaky: false,
        estimatedFixTime: '20 minutes',
        analysedAt: ago(60),
        modelUsed: 'gpt-4o-mini',
    },
]

// ── Notifications ─────────────────────────────────────────────────────────────
export const DEMO_NOTIFICATIONS = [
    { id: 1, type: 'failure', title: 'ml-pipeline #94 failed', body: 'Train stage: CUDA out of memory', time: ago(47), read: false, link: '/runs' },
    { id: 2, type: 'ai', title: 'AI analysis ready — run #94', body: 'P1: GPU OOM after pytorch upgrade', time: ago(40), read: false, link: '/insights' },
    { id: 3, type: 'warning', title: 'Build time alert — api-gateway', body: 'Avg build time up 31% this week', time: ago(60), read: false, link: '/repos' },
    { id: 4, type: 'success', title: 'api-gateway #247 deployed', body: 'All 4 stages passed in 5m 12s', time: ago(14), read: true, link: '/runs' },
    { id: 5, type: 'failure', title: 'api-gateway #245 failed', body: 'Test: RateLimiterServiceTest.testBurstLimit', time: ago(180), read: true, link: '/runs' },
]