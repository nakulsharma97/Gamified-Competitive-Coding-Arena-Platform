package com.codeslam.backend.dto;

import java.util.Map;
import java.util.UUID;

public record SubmissionResultEvent(
        UUID playerId,
        String verdict,
        Map<String, Integer> damage,
        Integer newP1Hp,
        Integer newP2Hp,
        Integer runtimeMs,
        boolean isFirstAc) {
}