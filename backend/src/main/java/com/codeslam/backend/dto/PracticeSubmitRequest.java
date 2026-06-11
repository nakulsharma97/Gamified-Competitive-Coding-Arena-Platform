package com.codeslam.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PracticeSubmitRequest {
    @NotNull
    private UUID problemId;

    @NotBlank
    private String code;

    @NotBlank
    private String language;
}
