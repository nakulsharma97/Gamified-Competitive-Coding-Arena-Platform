package com.codeslam.backend.controller;

import com.codeslam.backend.dto.EloHistoryPointDto;
import com.codeslam.backend.dto.BadgeDto;
import com.codeslam.backend.dto.UpdateUserProfileRequest;
import com.codeslam.backend.dto.UserProfileDto;
import com.codeslam.backend.dto.UserStatsDto;
import com.codeslam.backend.dto.UsernameAvailabilityResponse;
import com.codeslam.backend.service.UserService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileDto> getCurrentUser(Authentication authentication) {
        return ResponseEntity.ok(userService.getCurrentUserProfile((String) authentication.getPrincipal()));
    }

    @PatchMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileDto> updateCurrentUser(Authentication authentication,
            @RequestBody UpdateUserProfileRequest request) {
        return ResponseEntity.ok(userService.updateCurrentUser((String) authentication.getPrincipal(), request));
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserProfileDto> getPublicProfile(@PathVariable String username) {
        return ResponseEntity.ok(userService.getPublicUserProfile(username));
    }

    @GetMapping("/{username}/stats")
    public ResponseEntity<UserStatsDto> getPublicProfileStats(@PathVariable String username) {
        return ResponseEntity.ok(userService.getPublicUserStats(username));
    }

    @GetMapping("/{username}/badges")
    public ResponseEntity<List<BadgeDto>> getPublicProfileBadges(@PathVariable String username) {
        return ResponseEntity.ok(userService.getBadgeWall(username));
    }

    @GetMapping("/me/elo-history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EloHistoryPointDto>> getCurrentUserEloHistory(Authentication authentication,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(userService.getEloHistory((String) authentication.getPrincipal(), days));
    }

    @GetMapping("/me/stats")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserStatsDto> getCurrentUserStats(Authentication authentication) {
        return ResponseEntity.ok(userService.getCurrentUserStats((String) authentication.getPrincipal()));
    }

    @GetMapping("/check-username")
    public ResponseEntity<UsernameAvailabilityResponse> checkUsername(@RequestParam("u") String username) {
        return ResponseEntity.ok(new UsernameAvailabilityResponse(userService.isUsernameAvailable(username)));
    }
}