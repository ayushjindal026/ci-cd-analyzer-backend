package com.ayush.cicd.common.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "user_preferences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnore
    private User user;

    @Builder.Default
    @Column(name = "dark_mode")
    private boolean darkMode = true;

    @Builder.Default
    @Column(name = "email_notifications")
    private boolean emailNotifications = true;

    @Builder.Default
    @Column(name = "slack_notifications")
    private boolean slackNotifications = false;

    @Builder.Default
    @Column(name = "ai_insights")
    private boolean aiInsights = true;

    @Builder.Default
    @Column(name = "realtime_updates")
    private boolean realtimeUpdates = true;

    @Column(name = "slack_webhook_url")
    private String slackWebhookUrl;

    @Builder.Default
    @Column(name = "flaky_threshold")
    private Integer flakyThreshold = 3;

    @Builder.Default
    @Column(name = "failure_threshold")
    private Integer failureThreshold = 5;

    @Builder.Default
    @Column(name = "success_rate_threshold")
    private Integer successRateThreshold = 80;

    @Column(name = "updated_at")
    private Instant updatedAt;
}