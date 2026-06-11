package com.codeslam.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArenaPowerUpStateDto {
    private String key;
    private String label;
    private boolean available;
    private int usesRemaining;
}
