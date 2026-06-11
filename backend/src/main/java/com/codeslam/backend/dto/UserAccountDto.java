package com.codeslam.backend.dto;

import com.codeslam.backend.enums.Plan;
import com.codeslam.backend.enums.Rank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAccountDto {
    private UUID id;
    private String username;
    private Integer eloRating;
    private Rank rank;
    private Plan plan;
    private List<String> preferredLanguages;
    private List<String> interests;
}