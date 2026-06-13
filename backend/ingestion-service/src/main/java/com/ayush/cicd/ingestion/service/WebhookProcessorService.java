package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.enums.BuildStatus;
import com.ayush.cicd.common.enums.PipelineSource;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookProcessorService {

        private final PipelineRunRepository runRepo;

        private final MonitoredRepositoryRepository repoRepo;

        private final GitHubLogFetcherService logFetcher;

        private final ObjectMapper objectMapper;

        @Value("${github.webhook.secret:}")
        private String webhookSecret;

        // =========================================================================
        // PROCESS WEBHOOK
        // =========================================================================

        @Async
        public void process(
                        String event,
                        String signature,
                        Map<String, Object> payload) {

                try {

                        if (!webhookSecret.isBlank()
                                        && !verifySignature(signature, payload)) {

                                log.warn(
                                                "Webhook signature verification failed");

                                return;
                        }

                        switch (event) {

                                case "workflow_run" ->
                                        handleWorkflowRun(payload);

                                case "push" ->
                                        handlePush(payload);

                                default ->
                                        log.debug(
                                                        "Unhandled event type: {}",
                                                        event);
                        }

                } catch (Exception e) {

                        log.error(
                                        "Webhook processing failed",
                                        e);
                }
        }

        // =========================================================================
        // WORKFLOW RUN
        // =========================================================================

        @SuppressWarnings("unchecked")
        private void handleWorkflowRun(
                        Map<String, Object> payload) {

                Map<String, Object> workflowRun = (Map<String, Object>) payload.get("workflow_run");

                Map<String, Object> githubRepo = (Map<String, Object>) payload.get("repository");

                if (workflowRun == null || githubRepo == null) {
                        return;
                }

                String action = (String) payload.get("action");

                String fullName = (String) githubRepo.get("full_name");

                String[] parts = fullName.split("/");

                if (parts.length != 2) {
                        return;
                }

                String owner = parts[0];
                String repoName = parts[1];

                Optional<MonitoredRepository> repoOpt = repoRepo.findByOwnerAndRepoNameAndSource(
                                owner,
                                repoName,
                                PipelineSource.GITHUB_ACTIONS);

                if (repoOpt.isEmpty()) {
                        return;
                }

                MonitoredRepository repo = repoOpt.get();

                Long githubRunId = Long.valueOf(
                                workflowRun.get("id").toString());

                PipelineRun run = runRepo.findByRepository_IdAndExternalRunId(
                                repo.getId(),
                                String.valueOf(githubRunId))
                                .orElseGet(() -> PipelineRun.builder()
                                                .repository(repo)
                                                .externalRunId(
                                                                String.valueOf(
                                                                                githubRunId))
                                                .build());

                run.setWorkflowName(
                                (String) workflowRun.get("name"));

                run.setBranch(
                                (String) workflowRun.get("head_branch"));

                run.setHeadSha(
                                (String) workflowRun.get("head_sha"));

                BuildStatus status = BuildStatus.from(
                                (String) workflowRun.get("conclusion"),
                                (String) workflowRun.get("status"));

                run.setStatus(status);

                if ("queued".equalsIgnoreCase(action)
                                || "requested".equalsIgnoreCase(action)) {

                        if (run.getStartedAt() == null) {
                                run.setStartedAt(Instant.now());
                        }
                }

                if ("in_progress".equalsIgnoreCase(action)) {

                        if (run.getStartedAt() == null) {
                                run.setStartedAt(Instant.now());
                        }
                }

                if ("completed".equalsIgnoreCase(action)) {

                        run.setCompletedAt(Instant.now());

                        if (run.getStartedAt() != null) {

                                long duration = run.getCompletedAt().toEpochMilli()
                                                - run.getStartedAt().toEpochMilli();

                                run.setDurationMs(duration);
                        }
                }

                PipelineRun savedRun = runRepo.save(run);

                // =========================================================================
                // FAILED ANALYSIS
                // =========================================================================

                if ("completed".equalsIgnoreCase(action)
                                && savedRun.getStatus() == BuildStatus.FAILED) {

                        log.info(
                                        "Triggering AI analysis for failed run {}",
                                        savedRun.getId());

                        logFetcher.fetchAndAnalyse(
                                        repo.getId(),
                                        savedRun.getId());
                }
        }

        // =========================================================================
        // PUSH
        // =========================================================================

        @SuppressWarnings("unchecked")
        private void handlePush(
                        Map<String, Object> payload) {

                Map<String, Object> githubRepo = (Map<String, Object>) payload.get("repository");

                if (githubRepo == null) {
                        return;
                }

                String fullName = (String) githubRepo.get("full_name");

                log.info(
                                "Push received for repository {}",
                                fullName);
        }

        // =========================================================================
        // SIGNATURE VERIFY
        // =========================================================================

        private boolean verifySignature(
                        String signature,
                        Map<String, Object> payload) {

                if (signature == null
                                || !signature.startsWith("sha256=")) {

                        return false;
                }

                try {

                        String body = objectMapper.writeValueAsString(payload);

                        Mac mac = Mac.getInstance("HmacSHA256");

                        mac.init(
                                        new SecretKeySpec(
                                                        webhookSecret.getBytes(
                                                                        StandardCharsets.UTF_8),
                                                        "HmacSHA256"));

                        byte[] computed = mac.doFinal(
                                        body.getBytes(
                                                        StandardCharsets.UTF_8));

                        String expected = "sha256="
                                        + HexFormat.of()
                                                        .formatHex(computed);

                        return expected.equals(signature);

                } catch (Exception e) {

                        log.error(
                                        "Signature verification failed",
                                        e);

                        return false;
                }
        }
}