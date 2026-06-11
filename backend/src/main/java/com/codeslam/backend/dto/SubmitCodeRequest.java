package com.codeslam.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SubmitCodeRequest(
                @NotNull String matchId,
                @NotBlank String code,
                @NotBlank String language) {
}
