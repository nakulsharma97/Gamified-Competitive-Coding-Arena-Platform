package com.codeslam.backend.controller;

import com.codeslam.backend.entity.User;
import com.codeslam.backend.matchmaking.MatchmakingService;
import com.codeslam.backend.service.UserService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/queue", "/api/matchmaking"})
public class QueueController {

    private final UserService userService;
    private final MatchmakingService matchmakingService;

    public QueueController(UserService userService, MatchmakingService matchmakingService) {
        this.userService = userService;
        this.matchmakingService = matchmakingService;
    }

    @PostMapping("/join")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> joinQueue(Authentication authentication) {
        String clerkId = (String) authentication.getPrincipal();
        User user = userService.getUserByClerkId(clerkId);
        matchmakingService.joinQueue(clerkId, user.getEloRating(), clerkId);
        return ResponseEntity.ok(Map.of(
                "status", "SEARCHING",
                "queueSize", matchmakingService.getQueueSize()));
    }

    @DeleteMapping("/leave")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> leaveQueue(Authentication authentication) {
        String clerkId = (String) authentication.getPrincipal();
        matchmakingService.leaveQueue(clerkId);
        return ResponseEntity.ok(Map.of(
                "status", "CANCELLED"));
    }

    @PostMapping("/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> cancelSearch(Authentication authentication) {
        String clerkId = (String) authentication.getPrincipal();
        matchmakingService.leaveQueue(clerkId);
        return ResponseEntity.ok(Map.of("status", "CANCELLED"));
    }
}
