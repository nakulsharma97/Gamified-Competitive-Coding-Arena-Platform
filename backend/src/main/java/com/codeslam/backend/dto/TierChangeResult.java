package com.codeslam.backend.dto;

import com.codeslam.backend.enums.Rank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TierChangeResult {
    private Rank oldTier;
    private Rank newTier;
    private boolean changed;
}