package com.codeslam.backend.controller;

import com.codeslam.backend.dto.ArenaPowerUpStateDto;
import com.codeslam.backend.dto.ArenaStateDto;
import com.codeslam.backend.dto.MatchDetailsDto;
import com.codeslam.backend.dto.ProblemSummaryDto;
import com.codeslam.backend.dto.UserAccountDto;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.exception.ResourceNotFoundException;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.service.UserService;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/arena")
public class ArenaController {

        private static final long DEFAULT_ROUND_DURATION_MS = 600_000L;

        private final MatchRepository matchRepository;
        private final UserService userService;
        private final com.codeslam.backend.service.MatchStateService matchStateService;

        public ArenaController(MatchRepository matchRepository, UserService userService,
                        com.codeslam.backend.service.MatchStateService matchStateService) {
                this.matchRepository = matchRepository;
                this.userService = userService;
                this.matchStateService = matchStateService;
        }

        @GetMapping("/{matchId}/state")
        @PreAuthorize("isAuthenticated()")
        @Transactional(readOnly = true)
        public ResponseEntity<ArenaStateDto> getArenaState(@PathVariable UUID matchId, Authentication authentication) {
                String clerkId = (String) authentication.getPrincipal();
                User currentUser = userService.getUserByClerkId(clerkId);
                MatchEntity match = matchRepository.findById(matchId)
                                .orElseThrow(() -> new ResourceNotFoundException("Match not found"));

                boolean isParticipant = currentUser.getId().equals(match.getPlayer1().getId())
                                || currentUser.getId().equals(match.getPlayer2().getId());
                if (!isParticipant) {
                        throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "You are not a participant in this match");
                }

                com.codeslam.backend.service.MatchStateService.MatchState state = matchStateService.loadOrCreate(match);
                long serverEpochMs = System.currentTimeMillis();
                long roundEndsAtEpochMs = resolveRoundEndsAt(match, serverEpochMs);

                MatchDetailsDto matchDetails = MatchDetailsDto.builder()
                                .id(match.getId())
                                .problem(toProblemSummary(match.getProblem()))
                                .player1(toUserAccount(match.getPlayer1()))
                                .player2(toUserAccount(match.getPlayer2()))
                                .winner(match.getWinner() == null ? null : toUserAccount(match.getWinner()))
                                .status(match.getStatus())
                                .player1Hp(match.getPlayer1Hp())
                                .player2Hp(match.getPlayer2Hp())
                                .player1EloSnapshot(match.getPlayer1EloSnapshot())
                                .player2EloSnapshot(match.getPlayer2EloSnapshot())
                                .eloChangeP1(match.getEloChangeP1())
                                .eloChangeP2(match.getEloChangeP2())
                                .startedAt(match.getStartedAt())
                                .endedAt(match.getEndedAt())
                                .createdAt(match.getCreatedAt())
                                .build();

                List<String> playerPowerUps = currentUser.getId().equals(match.getPlayer1().getId())
                                ? state.player1PowerUps()
                                : currentUser.getId().equals(match.getPlayer2().getId()) ? state.player2PowerUps()
                                                : List.of();
                int myPowerUpsApplied = currentUser.getId().equals(match.getPlayer1().getId())
                                ? state.player1PowerUpsApplied()
                                : currentUser.getId().equals(match.getPlayer2().getId())
                                                ? state.player2PowerUpsApplied()
                                                : 0;
                int opponentPowerUpsApplied = currentUser.getId().equals(match.getPlayer1().getId())
                                ? state.player2PowerUpsApplied()
                                : currentUser.getId().equals(match.getPlayer2().getId())
                                                ? state.player1PowerUpsApplied()
                                                : 0;

                ArenaStateDto arenaState = ArenaStateDto.builder()
                                .match(matchDetails)
                                .currentUserId(currentUser.getId())
                                .serverEpochMs(serverEpochMs)
                                .roundEndsAtEpochMs(roundEndsAtEpochMs)
                                .myPowerUpsApplied(myPowerUpsApplied)
                                .opponentPowerUpsApplied(opponentPowerUpsApplied)
                                .blitz(buildPowerUpState("BLUR", "Blur", playerPowerUps))
                                .shield(buildPowerUpState("LOCK_KEYWORD", "Lock Keyword", playerPowerUps))
                                .drain(buildPowerUpState("REVERSE_KEYBOARD", "Reverse Keyboard", playerPowerUps))
                                .build();

                return ResponseEntity.ok(arenaState);
        }

        private ProblemSummaryDto toProblemSummary(Problem problem) {
                if (problem == null) {
                        return null;
                }

                return ProblemSummaryDto.builder()
                                .id(problem.getId())
                                .title(problem.getTitle())
                                .difficulty(problem.getDifficulty())
                                .topics(problem.getTopics())
                                .battleUseCount(problem.getBattleUseCount())
                                .acceptanceRate(null)
                                .attemptedByCurrentUser(Boolean.FALSE)
                                .solvedByCurrentUser(Boolean.FALSE)
                                .timeLimitMs(problem.getTimeLimitMs())
                                .memoryLimitMb(problem.getMemoryLimitMb())
                                .build();
        }

        private UserAccountDto toUserAccount(User user) {
                if (user == null) {
                        return null;
                }

                return UserAccountDto.builder()
                                .id(user.getId())
                                .username(user.getUsername())
                                .eloRating(user.getEloRating())
                                .rank(user.getRank())
                                .plan(user.getPlan())
                                .preferredLanguages(user.getPreferredLanguages())
                                .interests(user.getTopicInterests())
                                .build();
        }

        private ArenaPowerUpStateDto buildPowerUpState(String key, String label, List<String> powerUps) {
                int usesRemaining = (int) powerUps.stream().filter(key::equals).count();
                return ArenaPowerUpStateDto.builder()
                                .key(key)
                                .label(label)
                                .available(usesRemaining > 0)
                                .usesRemaining(usesRemaining)
                                .build();
        }

        private long resolveRoundEndsAt(MatchEntity match, long serverEpochMs) {
                if (match.getEndedAt() != null) {
                        return match.getEndedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
                }

                if (match.getStartedAt() != null) {
                        return match.getStartedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                                        + DEFAULT_ROUND_DURATION_MS;
                }

                return serverEpochMs + DEFAULT_ROUND_DURATION_MS;
        }
}
