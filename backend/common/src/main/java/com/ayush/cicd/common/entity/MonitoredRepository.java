package com.ayush.cicd.common.entity;

import com.ayush.cicd.common.enums.PipelineSource;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A CI/CD repository being monitored by this system.
 *
 * WHY a separate entity, not just a column on PipelineRun?
 * - lastSyncedAt lives here — needed for incremental syncs
 *   (only fetch runs newer than this timestamp, not all history)
 * - Alert thresholds are configured per-repo
 * - One repo has thousands of runs. Normalizing avoids repeating
 *   owner/repoName on every single run row in the DB.
 *
 * WHY table name 'monitored_repositories' not 'repository'?
 * 'repository' is a reserved keyword in some SQL dialects.
 * Always use explicit table names to avoid Hibernate generating bad SQL.
 */
@Entity
@Table(
    name = "monitored_repositories",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_repo_owner_name_source",
            columnNames = {"owner", "repo_name", "source"}
        )
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonitoredRepository extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner", nullable = false, length = 100)
    private String owner;

    @Column(name = "repo_name", nullable = false, length = 100)
    private String repoName;

    /**
     * WHY EnumType.STRING not ORDINAL (the default)?
     * ORDINAL stores 0, 1, 2... If you ever reorder enum values,
     * all existing DB rows become silently wrong.
     * STRING stores "GITHUB_ACTIONS" — safe to reorder and human-readable.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30)
    private PipelineSource source;

    @Column(name = "default_branch", length = 100)
    @Builder.Default
    private String defaultBranch = "main";

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * WHY FetchType.LAZY?
     * A repo can have thousands of runs. EAGER would load all of them
     * every single time you load a repo — catastrophic for any list endpoint.
     * LAZY loads runs only when you explicitly call getRuns().
     *
     * WHY cascade PERSIST and MERGE but NOT REMOVE?
     * If a repo is deleted, we want to KEEP the historical run data
     * for analytics. We soft-delete repos (active = false) instead of
     * hard-deleting them. Runs are never orphaned.
     */
    @OneToMany(
        mappedBy = "repository",
        cascade = {CascadeType.PERSIST, CascadeType.MERGE},
        fetch = FetchType.LAZY
    )
    @Builder.Default
    private List<PipelineRun> runs = new ArrayList<>();
}