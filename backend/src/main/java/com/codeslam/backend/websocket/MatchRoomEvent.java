package com.codeslam.backend.websocket;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record MatchRoomEvent(
        UUID matchId,
        MatchRoomEventType type,
        Instant occurredAt,
        Map<String, Object> payload) {
}
