-- Create submission_queue table
CREATE TABLE IF NOT EXISTS submission_queue (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    submission_id VARCHAR(36) NOT NULL UNIQUE,
    queue_position BIGINT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    INDEX idx_queue_position (queue_position),
    INDEX idx_queue_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create powerup_locks table
CREATE TABLE IF NOT EXISTS powerup_locks (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    match_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_powerup_match_user (match_id, user_id),
    INDEX idx_powerup_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create spectator_sessions table
CREATE TABLE IF NOT EXISTS spectator_sessions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    match_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_spectator_match (match_id),
    INDEX idx_spectator_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
