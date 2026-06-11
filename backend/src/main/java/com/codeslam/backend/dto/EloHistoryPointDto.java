package com.codeslam.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EloHistoryPointDto {
    private UUID id;
    private Instant createdAt;
    private Integer eloBefore;
    private Integer eloAfter;
    private UUID matchId;
}