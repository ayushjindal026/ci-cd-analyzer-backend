package com.ayush.cicd.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * Shared audit timestamps inherited by every entity in this project.
 *
 * WHY @MappedSuperclass?
 * Tells JPA: "contribute these columns to child entity tables,
 * but do NOT create a table for this class itself."
 * Every entity that extends BaseEntity gets created_at + updated_at
 * without repeating the fields.
 *
 * WHY Instant and not LocalDateTime?
 * Instant is always UTC. LocalDateTime has no timezone — it gets
 * interpreted based on the JVM's default timezone, which causes
 * silent bugs when the server timezone differs from the DB timezone.
 * Always use Instant for stored timestamps.
 *
 * WHY @EntityListeners(AuditingEntityListener.class)?
 * This listener auto-populates @CreatedDate before INSERT and
 * @LastModifiedDate before UPDATE. It does nothing without
 * @EnableJpaAuditing on the main application class — that's
 * why we add it to CicdAnalyzerApplication.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public abstract class BaseEntity {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}