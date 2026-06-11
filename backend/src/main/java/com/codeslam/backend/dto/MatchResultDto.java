package com.codeslam.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchResultDto {
    private UUID matchId;
    private UUID winnerId;
    private Integer eloChangeP1;
    private Integer eloChangeP2;
    private Map<String, Integer> damageBreakdown;
    private List<SubmissionDto> submissions;
}
