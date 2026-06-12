package com.codeslam.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "powerup_locks", indexes = {
        @Index(name = "idx_powerup_match_user", columnList = "match_id,user_id"),
        @Index(name = "idx_powerup_expires_at", columnList = "expires_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PowerupLock {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "match_id", length = 36, nullable = false)
    private String matchId;

    @Column(name = "user_id", length = 36, nullable = false)
    private String userId;

    @Column(name = "keyword", nullable = false)
    private String keyword;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public static PowerupLock create(String matchId, String userId, String keyword, long durationMs) {
        Instant now = Instant.now();
        return PowerupLock.builder()
                .id(UUID.randomUUID().toString())
                .matchId(matchId)
                .userId(userId)
                .keyword(keyword)
                .expiresAt(now.plusMillis(durationMs))
                .build();
    }
}
