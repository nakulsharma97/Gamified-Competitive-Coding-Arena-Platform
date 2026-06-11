package com.codeslam.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatRequest(
        @NotBlank String matchId,
        @NotBlank String message) {
}