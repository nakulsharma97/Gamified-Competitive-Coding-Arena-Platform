package com.codeslam.backend.controller;

import com.codeslam.backend.dto.LeaderboardResponseDto;
import com.codeslam.backend.dto.StatsResponseDto;
import com.codeslam.backend.service.LeaderboardService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<LeaderboardResponseDto> getLeaderboard(Pageable pageable, Authentication authentication,
            @RequestParam(name = "tier", required = false) String tier) {
        String clerkId = authentication == null ? null : (String) authentication.getPrincipal();
        return ResponseEntity.ok(leaderboardService.getLeaderboard(pageable, clerkId, tier));
    }

    @GetMapping("/stats")
    public ResponseEntity<StatsResponseDto> getStats() {
        return ResponseEntity.ok(leaderboardService.getStats());
    }
}