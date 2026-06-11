package com.codeslam.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardResponseDto {
    private List<LeaderboardEntryDto> players;
    private Integer currentUserRank;
    private LeaderboardEntryDto currentUserEntry;
}