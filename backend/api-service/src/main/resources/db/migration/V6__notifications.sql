CREATE TABLE IF NOT EXISTS notifications (

    id              BIGSERIAL PRIMARY KEY,

    user_id         BIGINT NOT NULL,

    title           VARCHAR(200) NOT NULL,

    message         VARCHAR(2000) NOT NULL,

    type            VARCHAR(50) NOT NULL,

    is_read         BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user
    ON notifications(user_id);

CREATE INDEX idx_notifications_read
    ON notifications(is_read);

CREATE INDEX idx_notifications_created
    ON notifications(created_at);