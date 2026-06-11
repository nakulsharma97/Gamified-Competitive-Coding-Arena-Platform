package com.codeslam.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTournamentRequest {
    private String name;
    private LocalDateTime startDate;
    private List<UUID> problemIds;
    private Integer maxParticipants;
    private String eligibilityRules;
}
