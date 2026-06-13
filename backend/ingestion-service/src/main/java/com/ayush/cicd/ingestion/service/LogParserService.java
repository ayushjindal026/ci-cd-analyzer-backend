package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.enums.FailureCategory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
public class LogParserService {

    // ─────────────────────────────────────────────────────────────────────
    // PATTERNS
    // ─────────────────────────────────────────────────────────────────────

    private static final Pattern ERROR_LINE = Pattern.compile(
            "(?i)(error|exception|fatal|failed|failure|traceback|caused by|exit code \\d+)");

    private static final Pattern JAVA_EXCEPTION = Pattern.compile(
            "^\\s*(?:at\\s+[\\w$.]+\\([\\w$.]+\\.java:\\d+\\)|([\\w$.]+Exception|[\\w$.]+Error):[^\\n]*)",
            Pattern.MULTILINE);

    private static final Pattern JUNIT_FAILURE = Pattern.compile(
            "(?:Tests run:\\s*(\\d+).*?Failures:\\s*(\\d+).*?Errors:\\s*(\\d+)"
                    + "|FAILED\\s+([\\w$.#]+)"
                    + "|\\[ERROR\\]\\s+([\\w$.#]+)\\s+--\\s+Time elapsed)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern NPM_ERROR = Pattern.compile(
            "(?:npm ERR!|yarn error|ENOENT|Cannot find module|SyntaxError:).*",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern DOCKER_ERROR = Pattern.compile(
            "(?:failed to build|dockerfile.*error|COPY failed|RUN.*returned a non-zero code)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern EXIT_CODE = Pattern.compile(
            "exit(?:ed with| code)[:\\s]+(\\d+)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern OOM = Pattern.compile(
            "(?:OutOfMemoryError|out of memory|cannot allocate memory|Killed)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern TIMEOUT = Pattern.compile(
            "(?:timed? ?out|timeout|exceeded.*time|took too long)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern STEP_HEADER = Pattern.compile(
            "##\\[group\\]Run (.+)|^\\[command\\](.+)|^##\\[error\\](.+)",
            Pattern.MULTILINE);

    private static final Pattern TIMESTAMP = Pattern.compile(
            "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d+Z\\s+",
            Pattern.MULTILINE);

    // ─────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────

    public ParsedLog parse(
            String rawLog,
            String stage) {

        if (rawLog == null || rawLog.isBlank()) {
            return ParsedLog.empty(stage);
        }

        String clean = TIMESTAMP.matcher(rawLog)
                .replaceAll("");

        String[] lines = clean.split("\n");

        List<String> errorLines = extractErrorLines(lines);

        List<String> stackTrace = extractStackTrace(clean);

        List<String> failingTests = extractFailingTests(clean);

        FailureCategory category = classify(clean, failingTests);

        String exitCode = extractExitCode(clean);

        String rootCause = pickRootCause(errorLines, stackTrace);

        boolean isOom = OOM.matcher(clean).find();

        boolean isTimeout = TIMEOUT.matcher(clean).find();

        String failingStep = extractFailingStep(clean);

        String condensed = condense(errorLines, stackTrace, 60);

        return ParsedLog.builder()

                .stage(stage)

                .category(category)

                .errorLines(errorLines)

                .stackTrace(stackTrace)

                .failingTests(failingTests)

                .rootCauseLine(rootCause)

                .exitCode(exitCode)

                .isOom(isOom)

                .isTimeout(isTimeout)

                .failingStep(failingStep)

                .condensedLog(condensed)

                .rawLineCount(lines.length)

                .build();
    }

    // ─────────────────────────────────────────────────────────────────────
    // EXTRACTION HELPERS
    // ─────────────────────────────────────────────────────────────────────

    private List<String> extractErrorLines(
            String[] lines) {

        return Arrays.stream(lines)

                .filter(l -> ERROR_LINE.matcher(l).find())

                .map(String::trim)

                .filter(l -> !l.isBlank())

                .distinct()

                .limit(40)

                .collect(Collectors.toList());
    }

    private List<String> extractStackTrace(
            String log) {

        List<String> out = new ArrayList<>();

        Matcher m = JAVA_EXCEPTION.matcher(log);

        while (m.find() && out.size() < 30) {

            out.add(m.group().trim());
        }

        return out;
    }

    private List<String> extractFailingTests(
            String log) {

        List<String> out = new ArrayList<>();

        Matcher m = JUNIT_FAILURE.matcher(log);

        while (m.find()) {

            if (m.group(4) != null) {
                out.add(m.group(4));
            }

            if (m.group(5) != null) {
                out.add(m.group(5));
            }
        }

        return out.stream()

                .distinct()

                .limit(20)

                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────
    // CLASSIFICATION
    // ─────────────────────────────────────────────────────────────────────

    private FailureCategory classify(
            String log,
            List<String> tests) {

        if (OOM.matcher(log).find()) {
            return FailureCategory.CONTAINER_OOM;
        }

        if (TIMEOUT.matcher(log).find()) {
            return FailureCategory.BUILD_TIMEOUT;
        }

        if (!tests.isEmpty()) {
            return FailureCategory.TEST_UNIT;
        }

        if (DOCKER_ERROR.matcher(log).find()) {
            return FailureCategory.DOCKER_BUILD;
        }

        if (NPM_ERROR.matcher(log).find()) {
            return FailureCategory.BUILD_DEPENDENCY;
        }

        if (log.contains("COMPILATION ERROR")
                || log.contains("cannot find symbol")
                || log.contains("error: incompatible types")) {

            return FailureCategory.BUILD_COMPILATION;
        }

        if (log.contains("Permission denied")
                || log.contains("EACCES")) {

            return FailureCategory.AUTH_PERMISSIONS;
        }

        if (log.contains("Connection refused")
                || log.contains("java.net.ConnectException")) {

            return FailureCategory.NETWORK_TIMEOUT;
        }

        if (ERROR_LINE.matcher(log).find()) {
            return FailureCategory.UNKNOWN;
        }

        return FailureCategory.UNKNOWN;
    }

    // ─────────────────────────────────────────────────────────────────────
    // SMALL HELPERS
    // ─────────────────────────────────────────────────────────────────────

    private String extractExitCode(
            String log) {

        Matcher m = EXIT_CODE.matcher(log);

        return m.find()
                ? m.group(1)
                : null;
    }

    private String pickRootCause(
            List<String> errors,
            List<String> stack) {

        return stack.stream()

                .filter(l -> l.startsWith("Caused by"))

                .findFirst()

                .orElse(
                        errors.isEmpty()
                                ? null
                                : errors.get(0));
    }

    private String extractFailingStep(
            String log) {

        Matcher m = STEP_HEADER.matcher(log);

        String last = null;

        while (m.find()) {

            String s = m.group(1) != null
                    ? m.group(1)
                    : m.group(2) != null
                            ? m.group(2)
                            : m.group(3);

            if (s != null) {
                last = s.trim();
            }
        }

        return last;
    }

    private String condense(
            List<String> errors,
            List<String> stack,
            int max) {

        List<String> all = new ArrayList<>(errors);

        all.addAll(stack);

        return all.stream()

                .limit(max)

                .collect(Collectors.joining("\n"));
    }

    // ─────────────────────────────────────────────────────────────────────
    // VALUE OBJECT
    // ─────────────────────────────────────────────────────────────────────

    @lombok.Builder
    @lombok.Data
    public static class ParsedLog {

        private final String stage;

        private final FailureCategory category;

        private final List<String> errorLines;

        private final List<String> stackTrace;

        private final List<String> failingTests;

        private final String rootCauseLine;

        private final String exitCode;

        private final boolean isOom;

        private final boolean isTimeout;

        private final String failingStep;

        private final String condensedLog;

        private final int rawLineCount;

        public static ParsedLog empty(
                String stage) {

            return ParsedLog.builder()

                    .stage(stage)

                    .category(FailureCategory.UNKNOWN)

                    .errorLines(List.of())

                    .stackTrace(List.of())

                    .failingTests(List.of())

                    .build();
        }

        public boolean hasFailure() {

            return category != FailureCategory.UNKNOWN
                    || !errorLines.isEmpty()
                    || !stackTrace.isEmpty();
        }
    }
}