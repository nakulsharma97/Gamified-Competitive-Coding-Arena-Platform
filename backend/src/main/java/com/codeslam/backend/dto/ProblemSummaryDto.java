package com.codeslam.backend.dto;

import com.codeslam.backend.enums.Difficulty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProblemSummaryDto {
    private UUID id;
    private String title;
    private Difficulty difficulty;
    private List<String> topics;
    private Integer battleUseCount;
    private Double acceptanceRate;
    private Boolean attemptedByCurrentUser;
    private Boolean solvedByCurrentUser;
    private Integer timeLimitMs;
    private Integer memoryLimitMb;
}