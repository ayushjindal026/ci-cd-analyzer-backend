package com.ayush.cicd.api.dto.response;

import com.ayush.cicd.common.enums.PipelineSource;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class RepositoryResponse {
    private Long id;
    private String owner;
    private String repoName;
    private PipelineSource source;
    private String defaultBranch;
    private Instant lastSyncedAt;
    private Instant createdAt;
    private boolean active;
    private int totalRuns;
    private String lastRunStatus;
    private Instant lastRunAt;
}