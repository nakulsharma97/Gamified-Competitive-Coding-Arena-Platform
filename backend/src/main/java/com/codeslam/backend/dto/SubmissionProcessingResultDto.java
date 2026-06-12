package com.codeslam.backend.dto;

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
        int player1Hp,
        int player2Hp,
        UUID winnerId,
        Map<String, Integer> damageBreakdown,
        List<SubmissionDto> submissions) {

    public SubmissionProcessingResultDto(String id, UUID matchId2, String name, Integer runtimeMs2, Double memoryMb2,
            Integer passedCases2, Integer totalCases2, int updatedPlayer1Hp, int updatedPlayer2Hp, UUID winnerId2,
            Map<String> of, List<SubmissionDto> of2) {
        //TODO Auto-generated constructor stub
    }

    public SubmissionProcessingResultDto(String id, UUID matchId2, String name, Integer runtimeMs2, Double memoryMb2,
            Integer passedCases2, Integer totalCases2, int updatedPlayer1Hp, int updatedPlayer2Hp, UUID winnerId2) {
        //TODO Auto-generated constructor stub
    }
}