package com.ayush.cicd.api.websocket;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.entity.RunAnalysis;
import com.ayush.cicd.common.enums.BuildStatus;
import com.ayush.cicd.common.websocket.PipelineEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Centralized WebSocket event publisher for realtime pipeline updates.
 *
 * Topic format:
 * /topic/repository/{repositoryId}
 *
 * Used by:
 * - GitHubIngestionService
 * - WebhookProcessorService
 * - PipelineAnalysisOrchestrator
 * - Future deployment services
 *
 * Design goals:
 * - Never break caller flow
 * - Lightweight realtime notifications
 * - Frontend-friendly payloads
 * - Future Kafka/event-bus extensibility
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PipelineEventPublisher {

        // ─────────────────────────────────────────────────────────────────────
        // CONSTANTS
        // ─────────────────────────────────────────────────────────────────────

        private static final String REPO_TOPIC = "/topic/repository/";

        // ─────────────────────────────────────────────────────────────────────
        // DEPENDENCIES
        // ─────────────────────────────────────────────────────────────────────

        private final SimpMessagingTemplate messaging;

        // ─────────────────────────────────────────────────────────────────────
        // PIPELINE LIFECYCLE EVENTS
        // ─────────────────────────────────────────────────────────────────────

        /**
         * New workflow run detected.
         */
        public void publishQueued(PipelineRun run) {

                publish(buildEvent(
                                run,
                                "PIPELINE_QUEUED"));
        }

        /**
         * Workflow started execution.
         */
        public void publishStarted(PipelineRun run) {

                publish(buildEvent(
                                run,
                                "PIPELINE_STARTED"));
        }

        /**
         * Workflow entered terminal state.
         */
        public void publishCompleted(PipelineRun run) {

                String eventType = run.getStatus() == BuildStatus.FAILED
                                ? "PIPELINE_FAILED"
                                : "PIPELINE_COMPLETED";

                publish(buildEvent(
                                run,
                                eventType));
        }

        /**
         * Stage/job level updates.
         */
        public void publishStageUpdate(
                        PipelineRun run,
                        String stageName,
                        String eventType) {

                PipelineEvent event = buildEvent(run, eventType)
                                .toBuilder()

                                .stageName(stageName)

                                .build();

                publish(event);
        }

        /**
         * AI analysis completed successfully.
         */
        public void publishAnalysisReady(
                        PipelineRun run,
                        RunAnalysis analysis) {

                PipelineEvent event = buildEvent(run, "ANALYSIS_READY")

                                .toBuilder()

                                .aiSummary(
                                                analysis.getSummary())

                                .failureCategory(
                                                analysis.getFailureCategory() != null
                                                                ? analysis.getFailureCategory().name()
                                                                : null)

                                .severity(
                                                analysis.getSeverity())

                                .classificationSource(
                                                analysis.getClassificationSource())

                                .confidenceScore(
                                                analysis.getConfidenceScore())

                                .affectedComponent(
                                                analysis.getAffectedComponent())

                                .build();

                publish(event);
        }

        public void publishNotification(
                        Long userId,
                        Object payload) {

                try {

                        messaging.convertAndSend(
                                        "/topic/notifications/" + userId,
                                        payload);

                } catch (Exception ex) {

                        log.error(
                                        "Failed notification websocket publish",
                                        ex);
                }
        }

        public void publishRepositoryConnected(
                        MonitoredRepository repo) {

                try {

                        messaging.convertAndSend(
                                        "/topic/repository/" + repo.getId(),

                                        PipelineEvent.builder()
                                                        .eventType("REPOSITORY_CONNECTED")
                                                        .repositoryId(repo.getId())
                                                        .repoFullName(
                                                                        repo.getOwner()
                                                                                        + "/"
                                                                                        + repo.getRepoName())
                                                        .build());

                } catch (Exception ex) {

                        log.error(
                                        "Failed repository connected event",
                                        ex);
                }
        }

        // ─────────────────────────────────────────────────────────────────────
        // INTERNALS
        // ─────────────────────────────────────────────────────────────────────

        /**
         * Low-level websocket publish.
         *
         * IMPORTANT:
         * Never propagate websocket exceptions.
         * Realtime notifications should NEVER break
         * pipeline ingestion or AI processing.
         */
        private void publish(PipelineEvent event) {

                String destination = REPO_TOPIC + event.getRepositoryId();

                try {

                        messaging.convertAndSend(
                                        destination,
                                        event);

                        log.debug(
                                        "WS EVENT → topic={} type={} run={} status={}",
                                        destination,
                                        event.getEventType(),
                                        event.getRunId(),
                                        event.getStatus());

                } catch (Exception ex) {

                        log.error(
                                        "Failed to publish websocket event → topic={} error={}",
                                        destination,
                                        ex.getMessage(),
                                        ex);
                }
        }

        /**
         * Shared event builder.
         */
        private PipelineEvent buildEvent(
                        PipelineRun run,
                        String eventType) {

                return PipelineEvent.builder()

                                .eventType(eventType)

                                .repositoryId(
                                                run.getRepository().getId())

                                .repoFullName(
                                                run.getRepository().getOwner()
                                                                + "/"
                                                                + run.getRepository().getRepoName())

                                .runId(run.getId())

                                .status(
                                                run.getStatus())

                                .branch(
                                                run.getBranch())

                                .githubRunId(
                                                run.getGithubRunId())

                                .commitSha(
                                                run.getHeadSha())

                                .commitMessage(
                                                run.getCommitMessage())

                                .build();
        }

}