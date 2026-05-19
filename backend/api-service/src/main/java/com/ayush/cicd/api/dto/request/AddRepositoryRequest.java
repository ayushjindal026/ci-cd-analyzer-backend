package com.ayush.cicd.api.dto.request;

import com.ayush.cicd.common.enums.PipelineSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * WHY a DTO and not accepting the entity directly in the controller?
 *
 * Accepting a JPA entity in a controller is a serious anti-pattern:
 * 1. The client could set id, createdAt, active — fields they must never
 * control
 * 2. Validation annotations would mix persistence concerns with API concerns
 * 3. You can't evolve the API shape and the DB schema independently
 *
 * A DTO is the contract between the HTTP client and the application.
 * The entity is the contract between the application and the database.
 * They are different things and should be different classes.
 */
@Data
public class AddRepositoryRequest {

    private Long githubRepoId;

    private String fullName;

    private boolean privateRepo;

    private String htmlUrl;

    @NotBlank(message = "Owner is required")
    @Size(max = 100, message = "Owner must be 100 characters or less")
    private String owner;

    @NotBlank(message = "Repository name is required")
    @Size(max = 100, message = "Repository name must be 100 characters or less")
    private String repoName;

    @NotNull(message = "Source is required. Valid values: GITHUB_ACTIONS, JENKINS")
    private PipelineSource source;

    @Size(max = 100)
    private String defaultBranch = "main";
}