package com.ayush.cicd.ingestion.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.Instant;

/**
 * Represents one workflow run from the GitHub Actions API.
 * Maps directly from the JSON response of:
 * GET /repos/{owner}/{repo}/actions/runs
 *
 * WHY @JsonIgnoreProperties(ignoreUnknown = true)?
 * The GitHub API returns 80+ fields per run. We only need ~10.
 * Without this annotation, Jackson throws an error on any field
 * in the JSON that doesn't have a matching Java field.
 * This makes the DTO resilient to GitHub adding new fields.
 *
 * WHY a separate DTO and not deserialize directly into the entity?
 * The API response shape is GitHub's contract — it can change.
 * The entity shape is our DB schema — it should be stable.
 * The mapper between them is where we handle the transformation.
 * Mixing them means a GitHub API change breaks your DB schema.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GitHubWorkflowRunDto {

    private Long id;

    private String name;

    /**
     * "queued", "in_progress", "completed"
     * Always present — never null.
     */
    private String status;

    /**
     * "success", "failure", "cancelled", "skipped", "timed_out", "action_required"
     * NULL when status is not "completed" yet.
     */
    private String conclusion;

    @JsonProperty("head_sha")
    private String headSha;

    @JsonProperty("head_branch")
    private String headBranch;

    @JsonProperty("run_number")
    private Integer runNumber;

    /**
     * What triggered this run: "push", "pull_request", "workflow_dispatch", "schedule"
     */
    private String event;

    @JsonProperty("run_started_at")
    private Instant runStartedAt;

    @JsonProperty("updated_at")
    private Instant updatedAt;

    @JsonProperty("html_url")
    private String htmlUrl;

    @JsonProperty("run_attempt")
    private Integer runAttempt;
}