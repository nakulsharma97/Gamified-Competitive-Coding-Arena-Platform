package com.codeslam.backend.match;

import java.util.UUID;

public record MatchEndEvent(
        UUID winnerId,
        int eloChangeP1,
        int eloChangeP2,
        int finalP1Hp,
        int finalP2Hp) {
}