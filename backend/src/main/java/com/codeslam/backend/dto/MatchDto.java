package com.codeslam.backend.dto;

public record MatchDto(
        String id,
        ProblemDto problem,
        UserProfileDto player1,
        UserProfileDto player2,
        String status,
        int player1Hp,
        int player2Hp) {
}
