package com.codeslam.backend.judge;

public record CaseResult(
        int caseIndex,
        String verdict,
        boolean passed,
        String stdout,
        String stderr,
        long runtimeMs,
        double memoryMb) {
}