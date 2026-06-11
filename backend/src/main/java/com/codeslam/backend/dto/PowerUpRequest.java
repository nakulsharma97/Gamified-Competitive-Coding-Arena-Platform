package com.codeslam.backend.dto;

import com.codeslam.backend.enums.PowerUpType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PowerUpRequest(
        @NotBlank String matchId,
        @NotNull PowerUpType type) {
}