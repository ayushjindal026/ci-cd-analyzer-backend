-- ============================================================================
-- USER PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT UNIQUE NOT NULL,

    dark_mode BOOLEAN DEFAULT TRUE,

    email_notifications BOOLEAN DEFAULT TRUE,

    slack_notifications BOOLEAN DEFAULT FALSE,

    ai_insights BOOLEAN DEFAULT TRUE,

    realtime_updates BOOLEAN DEFAULT TRUE,

    slack_webhook_url TEXT,

    flaky_threshold INTEGER DEFAULT 3,

    failure_threshold INTEGER DEFAULT 5,

    success_rate_threshold INTEGER DEFAULT 80,

    updated_at TIMESTAMP,

    CONSTRAINT fk_user_preferences_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    severity VARCHAR(20) DEFAULT 'INFO',

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_read
    ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON notifications(created_at DESC);