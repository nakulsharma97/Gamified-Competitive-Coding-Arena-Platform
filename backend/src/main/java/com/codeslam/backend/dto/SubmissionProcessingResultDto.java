package com.codeslam.backend.dto;

import java.util.List;
import java.util.Map;
import java.util.List;
import java.util.UUID;

public record SubmissionProcessingResultDto(
        UUID submissionId,
        UUID matchId,
        String verdict,
        Integer runtimeMs,
        Double memoryMb,
        Integer passedCases,
        Integer totalCases,
        int player1Hp,
        int player2Hp,
        UUID winnerId,
        Map<String, Integer> damageBreakdown,
        List<SubmissionDto> submissions) {

<<<<<<< HEAD
    public SubmissionProcessingResultDto(
            String id,
            UUID matchId,
            String verdict,
            Integer runtimeMs,
            Double memoryMb,
            Integer passedCases,
            Integer totalCases,
            int player1Hp,
            int player2Hp,
            UUID winnerId,
            Map<String, Integer> damageBreakdown,
            List<SubmissionDto> submissions) {

        this(
                UUID.fromString(id),
                matchId,
                verdict,
                runtimeMs,
                memoryMb,
                passedCases,
                totalCases,
                player1Hp,
                player2Hp,
                winnerId,
                damageBreakdown,
                submissions);
    }
=======
>>>>>>> 69d97fb (Dess)
}