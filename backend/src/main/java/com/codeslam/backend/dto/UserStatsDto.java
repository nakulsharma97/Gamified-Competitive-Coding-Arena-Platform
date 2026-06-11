package com.codeslam.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatsDto {
    private Long matchesPlayed;
    private Long wins;
    private Long losses;
    private Long badgesEarned;
    private Integer rankPosition;
}