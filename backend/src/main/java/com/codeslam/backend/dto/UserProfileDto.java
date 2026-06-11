package com.codeslam.backend.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record UserProfileDto(
                UUID id,
                String clerkId,
                String username,
                Integer eloRating,
                String rankTier,
                String plan,
                List<String> preferredLanguages,
                List<String> topicInterests,
                List<String> badges,
                Map<String, Integer> topicStrengths) {
}
