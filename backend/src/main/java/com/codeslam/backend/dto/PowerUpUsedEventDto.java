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
public class PowerUpUsedEventDto {
    private String eventType;
    private UUID matchId;
    private UUID userId;
    private String powerUpKey;
    private int player1PowerUpsApplied;
    private int player2PowerUpsApplied;
    private long serverEpochMs;
}
