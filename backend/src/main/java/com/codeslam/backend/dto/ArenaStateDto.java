package com.codeslam.backend.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArenaStateDto {
    private MatchDetailsDto match;
    private UUID currentUserId;
    private boolean spectator;
    private long serverEpochMs;
    private long roundEndsAtEpochMs;
    private int myPowerUpsApplied;
    private int opponentPowerUpsApplied;
    private ArenaPowerUpStateDto blitz;
    private ArenaPowerUpStateDto shield;
    private ArenaPowerUpStateDto drain;
}
