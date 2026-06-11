package com.codeslam.backend.dto;

import com.codeslam.backend.enums.EventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchEventDto {
    private UUID id;
    private UUID matchId;
    private UUID userId;
    private EventType eventType;
    private Map<String, Object> payload;
    private Instant occurredAt;
}
