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
public class ProblemDetailsDto {
    private UUID id;
    private String title;
    private String description;
    private Difficulty difficulty;
    private List<String> topics;
    private String constraints;
    private Integer battleUseCount;
    private List<TestCaseDto> visibleTestCases;
    private Integer timeLimitMs;
    private Integer memoryLimitMb;
    private String optimalTimeComplexity;
    private String optimalSpaceComplexity;
}