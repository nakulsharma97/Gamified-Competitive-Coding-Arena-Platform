package com.codeslam.backend.dto;

import com.codeslam.backend.enums.MatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchDetailsDto {
    private UUID id;
    private ProblemSummaryDto problem;
    private UserAccountDto player1;
    private UserAccountDto player2;
    private UserAccountDto winner;
    private MatchStatus status;
    private Integer player1Hp;
    private Integer player2Hp;
    private Integer player1EloSnapshot;
    private Integer player2EloSnapshot;
    private Integer eloChangeP1;
    private Integer eloChangeP2;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Instant createdAt;
}