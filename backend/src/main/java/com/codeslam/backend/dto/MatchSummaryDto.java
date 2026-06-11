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
public class MatchSummaryDto {
    private UUID id;
    private ProblemSummaryDto problem;
    private String opponentUsername;
    private String result;
    private MatchStatus status;
    private Integer player1Hp;
    private Integer player2Hp;
    private Integer eloChange;
    private LocalDateTime startedAt;
    private Instant createdAt;
}