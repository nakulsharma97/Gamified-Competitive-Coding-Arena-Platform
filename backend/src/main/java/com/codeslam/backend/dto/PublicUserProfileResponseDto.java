package com.codeslam.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicUserProfileResponseDto {
    private UserAccountDto profile;
    private List<BadgeDto> badges;
    private Map<String, Integer> topicStrengths;
    private List<EloHistoryPointDto> eloHistory;
    private List<MatchSummaryDto> recentMatches;
}