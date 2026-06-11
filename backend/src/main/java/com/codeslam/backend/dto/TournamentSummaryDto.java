package com.codeslam.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TournamentSummaryDto {
    private UUID id;
    private String name;
    private String status;
    private LocalDateTime startDate;
    private Integer maxParticipants;
    private String prizeDescription;
    private Long entryCount;
}
