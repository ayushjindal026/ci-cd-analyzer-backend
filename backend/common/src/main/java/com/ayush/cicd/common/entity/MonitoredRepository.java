package com.ayush.cicd.common.entity;

import com.ayush.cicd.common.enums.PipelineSource;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A CI/CD repository monitored by PipelineIQ.
 *
 * Supports:
 * - GitHub Actions
 * - Jenkins
 * - future GitLab CI
 *
 * WHY normalized?
 * One repository can contain thousands of pipeline runs.
 * Repository metadata should not be duplicated on every run.
 */
@Entity
@Table(name = "monitored_repositories", uniqueConstraints = {
        @UniqueConstraint(name = "uq_repo_owner_name_source", columnNames = { "owner", "repo_name", "source" })
}, indexes = {
        @Index(name = "idx_repo_owner", columnList = "owner"),
        @Index(name = "idx_repo_name", columnList = "repo_name"),
        @Index(name = "idx_repo_active", columnList = "is_active")
})

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"runs", "user"})
@EqualsAndHashCode(callSuper = true)
public class MonitoredRepository extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * GitHub/Jenkins organization or username.
     * Example:
     * - ayush
     * - netflix
     * - apache
     */
    @Column(name = "owner", nullable = false, length = 100)
    private String owner;

    /**
     * Repository name only.
     * Example:
     * - cicd-analyzer
     * - spring-framework
     */
    @Column(name = "repo_name", nullable = false, length = 100)
    private String repoName;

    /**
     * Convenience derived property:
     * Example:
     * ayush/cicd-analyzer
     */
    @Transient
    public String getFullName() {
        return owner + "/" + repoName;
    }

    /**
     * GitHub / Jenkins / GitLab
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30)
    private PipelineSource source;

    @Column(name = "default_branch", length = 100)
    @Builder.Default
    private String defaultBranch = "main";

    /**
     * Main language detected from GitHub.
     */
    @Column(name = "language", length = 50)
    private String language;

    /**
     * OAuth / PAT token.
     * Encrypted later in production.
     */
    @Column(name = "access_token", length = 500)
    private String accessToken;

    /**
     * GitHub webhook ID.
     */
    @Column(name = "webhook_id")
    private Long webhookId;

    /**
     * Last successful sync time.
     */
    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    /**
     * Cached analytics for dashboard speed.
     */
    @Column(name = "total_runs")
    @Builder.Default
    private int totalRuns = 0;

    @Column(name = "success_rate")
    @Builder.Default
    private int successRate = 0;

    @Column(name = "last_run_status", length = 20)
    private String lastRunStatus;

    @Column(name = "last_run_at")
    private Instant lastRunAt;

    /**
     * Soft-delete support.
     */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * User who added this repository.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    /**
     * Pipeline runs for this repository.
     */
    @OneToMany(mappedBy = "repository", cascade = { CascadeType.PERSIST, CascadeType.MERGE }, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<PipelineRun> runs = new ArrayList<>();

    /**
     * Helper for UI.
     */
    @Transient
    public boolean isGithub() {
        return source == PipelineSource.GITHUB_ACTIONS;
    }

    /**
     * Helper for UI.
     */
    @Transient
    public boolean isJenkins() {
        return source == PipelineSource.JENKINS;
    }
}