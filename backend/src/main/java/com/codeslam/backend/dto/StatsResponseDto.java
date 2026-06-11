package com.codeslam.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsResponseDto {
    private Long onlinePlayers;
    private Long matchesToday;
    private Long totalProblems;
    private Long totalUsers;
}