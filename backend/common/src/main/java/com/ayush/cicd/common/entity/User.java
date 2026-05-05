package com.ayush.cicd.common.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a user who authenticated via GitHub OAuth.
 *
 * WHY store githubToken?
 * The GitHub token the user authenticates with is different from
 * our app's PAT. Storing it allows us to make GitHub API calls
 * ON BEHALF of the user — accessing their private repos,
 * fetching logs they have access to. This is the foundation
 * for multi-repo support beyond just public repos.
 *
 * WHY githubId as Long not String?
 * GitHub user IDs are stable numeric integers. They never change
 * even if the username changes. Always identify users by githubId
 * internally — usernames are mutable and cannot be used as keys.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "github_id", nullable = false, unique = true)
    private Long githubId;

    @Column(name = "username", nullable = false, unique = true, length = 100)
    private String username;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    /**
     * WHY store the GitHub OAuth token?
     * Allows us to call GitHub API as this user — access private repos,
     * fetch workflow logs they have permission to see.
     * Store encrypted in production (add @Convert with encryption in Phase 3).
     */
    @Column(name = "github_token", columnDefinition = "TEXT")
    private String githubToken;

    @OneToMany(
        mappedBy = "user",
        cascade = {CascadeType.PERSIST, CascadeType.MERGE},
        fetch = FetchType.LAZY
    )
    @Builder.Default
    private List<MonitoredRepository> repositories = new ArrayList<>();
}