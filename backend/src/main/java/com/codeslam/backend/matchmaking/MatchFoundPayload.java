package com.codeslam.backend.matchmaking;

public record MatchFoundPayload(String matchId, String opponentUsername, String problemTitle) {
}