-- ================================================================
-- V3 — Add users table and link repositories to users
-- ================================================================

CREATE TABLE users (
    id                BIGSERIAL PRIMARY KEY,
    github_id         BIGINT       NOT NULL UNIQUE,
    username          VARCHAR(100) NOT NULL UNIQUE,
    email             VARCHAR(255),
    avatar_url        VARCHAR(500),
    github_token      TEXT,
    created_at        TIMESTAMPTZ  NOT NULL,
    updated_at        TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_users_github_id ON users(github_id);

-- Link every repository to the user who added it
ALTER TABLE monitored_repositories
    ADD COLUMN user_id BIGINT REFERENCES users(id);

-- Existing rows get NULL user_id — acceptable for seeded test data.
-- All new rows will have user_id enforced at application layer.

CREATE INDEX idx_repos_user_id ON monitored_repositories(user_id);