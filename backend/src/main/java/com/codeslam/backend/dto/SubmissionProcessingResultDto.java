package com.codeslam.backend.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SubmissionProcessingResultDto(
        UUID submissionId,
        UUID matchId,
        String verdict,
        Integer runtimeMs,
        Double memoryMb,
        Integer passedCases,
        Integer totalCases,
        Integer player1Hp,
        Integer player2Hp,
        UUID winnerId,
        Map<String, Integer> damageBreakdown,
        List<SubmissionDto> submissions) {
}