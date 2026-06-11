package com.codeslam.backend.judge;

import java.util.List;

public record JudgeResult(
                String verdict,
                long runtimeMs,
                double memoryMb,
                int passedCases,
                int totalCases,
                List<CaseResult> caseResults) {
}