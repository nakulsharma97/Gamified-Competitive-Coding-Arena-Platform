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
@Table(name = "spectator_sessions", indexes = {
        @Index(name = "idx_spectator_match", columnList = "match_id"),
        @Index(name = "idx_spectator_session", columnList = "session_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpectatorSession {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "match_id", length = 36, nullable = false)
    private String matchId;

    @Column(name = "session_id", length = 255, nullable = false)
    private String sessionId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public static SpectatorSession create(String matchId, String sessionId) {
        return SpectatorSession.builder()
                .id(UUID.randomUUID().toString())
                .matchId(matchId)
                .sessionId(sessionId)
                .build();
    }
}
