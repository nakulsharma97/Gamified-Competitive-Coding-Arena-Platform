package com.codeslam.backend.matchmaking;

import com.codeslam.backend.dto.ProblemDto;
import com.codeslam.backend.dto.UserProfileDto;

public record MatchFoundEvent(String matchId, ProblemDto problem, UserProfileDto opponent) {
}