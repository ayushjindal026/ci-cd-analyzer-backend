package com.ayush.cicd.common.enums;

/**
 * Identifies which CI/CD system a pipeline run came from.
 *
 * WHY enum not String?
 * Type safety at compile time — no misspellings possible.
 * JPA stores it as VARCHAR using @Enumerated(STRING) so it's
 * human-readable in the DB. Adding a new source forces you to
 * handle it in every switch block — the compiler tells you where.
 */
public enum PipelineSource {
    GITHUB_ACTIONS,
    JENKINS
}