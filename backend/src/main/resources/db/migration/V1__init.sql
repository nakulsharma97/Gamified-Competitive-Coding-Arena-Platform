CREATE TABLE users (
    id CHAR(36) NOT NULL,
    clerk_id VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    elo_rating INT NOT NULL DEFAULT 1000,
    rank_tier VARCHAR(20) NOT NULL DEFAULT 'BRONZE',
    plan VARCHAR(20) NOT NULL DEFAULT 'FREE',
    preferred_languages JSON NULL,
    topic_interests JSON NULL,
    onboarding_complete TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_clerk_id (clerk_id),
    UNIQUE KEY uk_users_username (username),
    UNIQUE KEY uk_users_email (email),
    KEY idx_users_clerk_id (clerk_id),
    KEY idx_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE problems (
    id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(10) NOT NULL,
    topics JSON NULL,
    constraints_text TEXT NULL,
    time_limit_ms INT NOT NULL DEFAULT 2000,
    memory_limit_mb INT NOT NULL DEFAULT 256,
    optimal_time_complexity VARCHAR(50) NULL,
    optimal_space_complexity VARCHAR(50) NULL,
    battle_use_count INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_problems_difficulty (difficulty),
    KEY idx_problems_battle_use_count (battle_use_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE test_cases (
    id CHAR(36) NOT NULL,
    problem_id CHAR(36) NOT NULL,
    input TEXT NULL,
    expected_output TEXT NULL,
    is_hidden TINYINT(1) NOT NULL DEFAULT 0,
    explanation TEXT NULL,
    display_order INT NULL,
    PRIMARY KEY (id),
    KEY idx_test_cases_problem_id (problem_id),
    CONSTRAINT fk_test_cases_problem_id
        FOREIGN KEY (problem_id) REFERENCES problems (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE matches (
    id CHAR(36) NOT NULL,
    problem_id CHAR(36) NULL,
    player1_id CHAR(36) NOT NULL,
    player2_id CHAR(36) NOT NULL,
    winner_id CHAR(36) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    player1_hp INT NOT NULL DEFAULT 100,
    player2_hp INT NOT NULL DEFAULT 100,
    player1_elo_snapshot INT NULL,
    player2_elo_snapshot INT NULL,
    player1_total_damage INT NOT NULL DEFAULT 0,
    player2_total_damage INT NOT NULL DEFAULT 0,
    elo_change_p1 INT NOT NULL DEFAULT 0,
    elo_change_p2 INT NOT NULL DEFAULT 0,
    started_at DATETIME(6) NULL,
    ended_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_matches_problem_id (problem_id),
    KEY idx_matches_player1_id (player1_id),
    KEY idx_matches_player2_id (player2_id),
    KEY idx_matches_winner_id (winner_id),
    KEY idx_matches_status (status),
    CONSTRAINT fk_matches_problem_id
        FOREIGN KEY (problem_id) REFERENCES problems (id),
    CONSTRAINT fk_matches_player1_id
        FOREIGN KEY (player1_id) REFERENCES users (id),
    CONSTRAINT fk_matches_player2_id
        FOREIGN KEY (player2_id) REFERENCES users (id),
    CONSTRAINT fk_matches_winner_id
        FOREIGN KEY (winner_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE submissions (
    id CHAR(36) NOT NULL,
    match_id CHAR(36) NULL,
    user_id CHAR(36) NOT NULL,
    problem_id CHAR(36) NOT NULL,
    code TEXT NOT NULL,
    language VARCHAR(20) NOT NULL,
    verdict VARCHAR(10) NULL,
    runtime_ms INT NULL,
    memory_mb DECIMAL(8,2) NULL,
    passed_cases INT NULL,
    total_cases INT NULL,
    is_first_ac TINYINT(1) NOT NULL DEFAULT 0,
    submitted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_submissions_match_id (match_id),
    KEY idx_submissions_user_id (user_id),
    KEY idx_submissions_problem_id (problem_id),
    CONSTRAINT fk_submissions_match_id
        FOREIGN KEY (match_id) REFERENCES matches (id),
    CONSTRAINT fk_submissions_user_id
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_submissions_problem_id
        FOREIGN KEY (problem_id) REFERENCES problems (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE match_events (
    id CHAR(36) NOT NULL,
    match_id CHAR(36) NOT NULL,
    user_id CHAR(36) NULL,
    event_type VARCHAR(50) NULL,
    payload JSON NULL,
    occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_match_events_match_id (match_id),
    CONSTRAINT fk_match_events_match_id
        FOREIGN KEY (match_id) REFERENCES matches (id),
    CONSTRAINT fk_match_events_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE elo_history (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    elo_before INT NULL,
    elo_after INT NULL,
    match_id CHAR(36) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_elo_history_user_id (user_id),
    KEY idx_elo_history_match_id (match_id),
    CONSTRAINT fk_elo_history_user_id
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_elo_history_match_id
        FOREIGN KEY (match_id) REFERENCES matches (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE badges (
    id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    icon VARCHAR(50) NULL,
    criteria_key VARCHAR(100) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_badges_name (name),
    UNIQUE KEY uk_badges_criteria_key (criteria_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_badges (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    badge_id CHAR(36) NOT NULL,
    earned_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY unique_user_badge (user_id, badge_id),
    CONSTRAINT fk_user_badges_user_id
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_user_badges_badge_id
        FOREIGN KEY (badge_id) REFERENCES badges (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tournaments (
    id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    organizer_id CHAR(36) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    start_date DATETIME(6) NULL,
    prize_description TEXT NULL,
    eligibility_rules TEXT NULL,
    max_participants INT NOT NULL DEFAULT 100,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_tournaments_organizer_id
        FOREIGN KEY (organizer_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tournament_entries (
    id CHAR(36) NOT NULL,
    tournament_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    registered_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY unique_entry (tournament_id, user_id),
    CONSTRAINT fk_tournament_entries_tournament_id
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
    CONSTRAINT fk_tournament_entries_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO badges (id, name, description, icon, criteria_key) VALUES
    ('00000000-0000-0000-0000-000000000001', 'DP_MASTER', 'Master of dynamic programming problems.', 'dp_master', 'dp_master'),
    ('00000000-0000-0000-0000-000000000002', 'SPEED_CODER', 'Consistently solves battles at high speed.', 'speed_coder', 'speed_coder'),
    ('00000000-0000-0000-0000-000000000003', 'GRAPH_WIZARD', 'Excels at graph theory challenges.', 'graph_wizard', 'graph_wizard'),
    ('00000000-0000-0000-0000-000000000004', 'CENTURION', 'Survives and wins a hundred battles.', 'centurion', 'centurion'),
    ('00000000-0000-0000-0000-000000000005', 'IRON_WILL', 'Keeps fighting until the last move.', 'iron_will', 'iron_will'),
    ('00000000-0000-0000-0000-000000000006', 'COMEBACK_KING', 'Wins after being heavily behind.', 'comeback_king', 'comeback_king'),
    ('00000000-0000-0000-0000-000000000007', 'DESTROYER', 'Delivers overwhelming damage in battle.', 'destroyer', 'destroyer'),
    ('00000000-0000-0000-0000-000000000008', 'FIRST_BLOOD', 'Secures the first successful submission.', 'first_blood', 'first_blood'),
    ('00000000-0000-0000-0000-000000000009', 'POWER_PLAYER', 'Shows raw competitive strength.', 'power_player', 'power_player'),
    ('00000000-0000-0000-0000-000000000010', 'SCHOLAR', 'Demonstrates broad algorithmic knowledge.', 'scholar', 'scholar');
