package com.codeslam.backend.dto;

import java.util.List;

public record ProblemDto(
        String id,
        String title,
        String description,
        String difficulty,
        List<String> topics,
        String constraintsText,
        int timeLimitMs,
        int memoryLimitMb,
        String optimalTimeComplexity,
        long battleUseCount,
        List<TestCaseDto> visibleTestCases) {
}
