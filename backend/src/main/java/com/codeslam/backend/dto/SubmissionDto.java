package com.codeslam.backend.dto;

public record SubmissionDto(
        String id,
        String matchId,
        String userId,
        String verdict,
        int runtimeMs,
        int passedCases,
        int totalCases,
        boolean isFirstAc,
        String submittedAt) {
}
