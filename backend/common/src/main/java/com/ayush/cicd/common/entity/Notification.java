package com.ayush.cicd.common.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notifications_user", columnList = "user_id"),
        @Index(name = "idx_notifications_read", columnList = "is_read"),
        @Index(name = "idx_notifications_created", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ------------------------------------------------------------------------
    // OWNER
    // ------------------------------------------------------------------------

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // ------------------------------------------------------------------------
    // CONTENT
    // ------------------------------------------------------------------------

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(nullable = false, length = 50)
    private String type;
    // INFO | SUCCESS | WARNING | ERROR

    // ------------------------------------------------------------------------
    // STATE
    // ------------------------------------------------------------------------

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean read = false;

    // ------------------------------------------------------------------------
    // TIMESTAMP
    // ------------------------------------------------------------------------

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}