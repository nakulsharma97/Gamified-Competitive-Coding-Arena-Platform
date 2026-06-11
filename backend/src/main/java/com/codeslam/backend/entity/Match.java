package com.codeslam.backend.entity;

import com.codeslam.backend.enums.MatchStatus;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MappedSuperclass;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@MappedSuperclass
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Match {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id")
    private Problem problem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player1_id", nullable = false)
    private User player1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player2_id", nullable = false)
    private User player2;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private User winner;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MatchStatus status;

    @Column(name = "player1_hp", nullable = false)
    private Integer player1Hp;

    @Column(name = "player2_hp", nullable = false)
    private Integer player2Hp;

    @Column(name = "player1_elo_snapshot")
    private Integer player1EloSnapshot;

    @Column(name = "player2_elo_snapshot")
    private Integer player2EloSnapshot;

    @Column(name = "player1_total_damage", nullable = false)
    private Integer player1TotalDamage;

    @Column(name = "player2_total_damage", nullable = false)
    private Integer player2TotalDamage;

    @Column(name = "elo_change_p1", nullable = false)
    private Integer eloChangeP1;

    @Column(name = "elo_change_p2", nullable = false)
    private Integer eloChangeP2;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    public UUID getId() {
        return id == null ? null : UUID.fromString(id);
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setId(UUID id) {
        this.id = id == null ? null : id.toString();
    }
}
