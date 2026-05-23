// ─────────────────────────────────────────────────────────────────────────────
// PATH: backend/ingestion-service/src/main/java/com/ayush/cicd/ingestion/client/dto/GitHubWorkflowRunDto.java
// ─────────────────────────────────────────────────────────────────────────────
package com.ayush.cicd.ingestion.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;

/**
 * Mapped from GitHub's workflow run object.
 * Only fields we actually use — rest ignored.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GitHubWorkflowRunDto {

    @JsonProperty("id")
    private Long id;

    /** We store this as String in PipelineRun.externalRunId */
    public String getExternalId() { return id != null ? id.toString() : null; }

    @JsonProperty("name")
    private String workflowName;

    @JsonProperty("head_branch")
    private String branch;

    @JsonProperty("head_sha")
    private String headSha;

    /**
     * GitHub status: queued | in_progress | completed
     */
    @JsonProperty("status")
    private String status;

    /**
     * GitHub conclusion (only set when status=completed):
     * success | failure | cancelled | skipped | timed_out | action_required
     */
    @JsonProperty("conclusion")
    private String conclusion;

    @JsonProperty("run_number")
    private Integer runNumber;

    @JsonProperty("event")
    private String event;           // push | pull_request | schedule | workflow_dispatch

    @JsonProperty("html_url")
    private String htmlUrl;

    @JsonProperty("created_at")
    private Instant createdAt;

    @JsonProperty("run_started_at")
    private Instant startedAt;

    @JsonProperty("updated_at")
    private Instant completedAt;    // GitHub uses updated_at for completion time

    @JsonProperty("workflow_id")
    private Long workflowId;

    @JsonProperty("actor")
    private Actor actor;

    @JsonProperty("head_commit")
    private HeadCommit headCommit;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Actor {
        @JsonProperty("login") private String login;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HeadCommit {
        @JsonProperty("message") private String message;
        @JsonProperty("author")  private Author author;

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Author {
            @JsonProperty("name") private String name;
        }
    }
}
