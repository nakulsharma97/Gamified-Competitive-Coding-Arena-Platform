package com.codeslam.backend.event;

import java.util.UUID;

public record MatchCompletedEvent(UUID matchId, UUID player1Id, UUID player2Id) {
}
