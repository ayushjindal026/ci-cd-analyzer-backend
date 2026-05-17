-- PATH: backend/api-service/src/main/resources/db/migration/V4__refresh_tokens.sql
-- Flyway migration — creates refresh_tokens table required by RefreshToken entity
-- Run order: after V3__add_users_and_ownership.sql

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGSERIAL       PRIMARY KEY,
    token       VARCHAR(512)    NOT NULL UNIQUE,
    user_id     BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ     NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    used        BOOLEAN         NOT NULL DEFAULT FALSE,
    revoked     BOOLEAN         NOT NULL DEFAULT FALSE,
    user_agent  VARCHAR(500)
);

-- Speed up token lookup (called on every refresh request)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rt_token
    ON refresh_tokens (token);

-- Speed up "revoke all for user" and session count queries
CREATE INDEX IF NOT EXISTS idx_rt_user_id
    ON refresh_tokens (user_id);

-- Speed up cleanup job (deletes expired + revoked rows nightly)
CREATE INDEX IF NOT EXISTS idx_rt_expires_revoked
    ON refresh_tokens (expires_at, revoked);

-- Comment for DBA clarity
COMMENT ON TABLE refresh_tokens IS
    'Persisted refresh tokens — one row per active user session. '
    'Supports token rotation (used=true after single use) and '
    'explicit revocation on logout. Cleaned up nightly by RefreshTokenService.';

COMMENT ON COLUMN refresh_tokens.used IS
    'True once this token has been exchanged for a new token pair. '
    'A used token cannot be reused — reuse attempt triggers full session revocation.';

COMMENT ON COLUMN refresh_tokens.revoked IS
    'True when explicitly invalidated (logout, security event). '
    'Revoked tokens are rejected immediately regardless of expiry.';