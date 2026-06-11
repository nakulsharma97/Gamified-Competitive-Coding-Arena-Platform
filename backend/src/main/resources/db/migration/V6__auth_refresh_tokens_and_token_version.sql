ALTER TABLE auth_users
    ADD COLUMN token_version BIGINT NOT NULL DEFAULT 0 AFTER enabled;

CREATE TABLE auth_refresh_tokens (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    token_version BIGINT NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    revoked_at DATETIME(6) NULL,
    replaced_by_token_id CHAR(36) NULL,
    last_used_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_auth_refresh_tokens_token_hash (token_hash),
    KEY idx_auth_refresh_tokens_user_id (user_id),
    KEY idx_auth_refresh_tokens_expires_at (expires_at),
    CONSTRAINT fk_auth_refresh_tokens_user_id
        FOREIGN KEY (user_id) REFERENCES auth_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auth_access_token_blacklist (
    id CHAR(36) NOT NULL,
    jti VARCHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    revoked_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_auth_access_token_blacklist_jti (jti),
    KEY idx_auth_access_token_blacklist_user_id (user_id),
    KEY idx_auth_access_token_blacklist_expires_at (expires_at),
    CONSTRAINT fk_auth_access_token_blacklist_user_id
        FOREIGN KEY (user_id) REFERENCES auth_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
