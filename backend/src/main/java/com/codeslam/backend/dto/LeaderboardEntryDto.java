package com.codeslam.backend.dto;

public record LeaderboardEntryDto(
        int rank,
        String userId,
        String username,
        int eloRating,
        String tier,
        double winRate,
        int totalMatches) {
}