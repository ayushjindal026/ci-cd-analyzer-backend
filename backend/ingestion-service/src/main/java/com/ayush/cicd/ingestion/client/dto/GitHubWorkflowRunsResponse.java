package com.ayush.cicd.ingestion.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * Wrapper for the GitHub Actions runs list API response.
 *
 * GET /repos/{owner}/{repo}/actions/runs returns:
 * {
 *   "total_count": 42,
 *   "workflow_runs": [ { ...run... }, { ...run... } ]
 * }
 *
 * WHY a wrapper class and not deserializing the list directly?
 * The API wraps the array in an object with total_count.
 * We need total_count for logging and future pagination logic.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GitHubWorkflowRunsResponse {

    @JsonProperty("total_count")
    private Integer totalCount;

    @JsonProperty("workflow_runs")
    private List<GitHubWorkflowRunDto> workflowRuns;
}