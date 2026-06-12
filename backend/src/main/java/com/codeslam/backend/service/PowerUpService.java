package com.codeslam.backend.service;

import com.codeslam.backend.dto.PowerUpUsedEventDto;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.MatchEvent;
import com.codeslam.backend.entity.PowerupLock;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.EventType;
import com.codeslam.backend.enums.MatchStatus;
import com.codeslam.backend.enums.PowerUpType;
import com.codeslam.backend.exception.ResourceNotFoundException;
import com.codeslam.backend.repository.MatchEventRepository;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.PowerupLockRepository;
import com.codeslam.backend.repository.UserRepository;
import com.codeslam.backend.websocket.MatchWebSocketPublisher;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PowerUpService {

    private static final List<String> LOCK_KEYWORDS = List.of("for", "while", "if", "return", "def", "class");

    private final MatchStateService matchStateService;
    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final PowerupLockRepository powerupLockRepository;
    private final MatchEventRepository matchEventRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MatchWebSocketPublisher matchWebSocketPublisher;

    public PowerUpService(MatchStateService matchStateService,
            MatchRepository matchRepository, UserRepository userRepository, PowerupLockRepository powerupLockRepository,
            MatchEventRepository matchEventRepository, SimpMessagingTemplate messagingTemplate,
            MatchWebSocketPublisher matchWebSocketPublisher) {
        this.matchStateService = matchStateService;
        this.matchRepository = matchRepository;
        this.userRepository = userRepository;
        this.powerupLockRepository = powerupLockRepository;
        this.matchEventRepository = matchEventRepository;
        this.messagingTemplate = messagingTemplate;
        this.matchWebSocketPublisher = matchWebSocketPublisher;
    }

    @Transactional
    public void usePowerUp(String matchId, String userId, PowerUpType type) {
        UUID matchUuid = parseUuid(matchId, "matchId");
        UUID userUuid = parseUuid(userId, "userId");
        MatchEntity match = matchRepository.findById(matchUuid.toString())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));
        MatchStateService.MatchState state = matchStateService.getMatchState(matchUuid);

        if (match.getStatus() != MatchStatus.ACTIVE || state.completed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Match is not active");
        }

        boolean isPlayer1 = Objects.equals(state.player1Id(), userUuid);
        boolean isPlayer2 = Objects.equals(state.player2Id(), userUuid);
        if (!isPlayer1 && !isPlayer2) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not part of this match");
        }

        List<String> currentPowerUps = new ArrayList<>(isPlayer1 ? state.player1PowerUps() : state.player2PowerUps());
        if (!currentPowerUps.remove(type.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Power-up not available");
        }

        String opponentId = isPlayer1 ? state.player2Id().toString() : state.player1Id().toString();
        String opponentSessionId = resolveOpponentSessionId(matchUuid, opponentId, isPlayer1);
        String userName = userRepository.findById(userUuid.toString())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"))
                .getUsername();

        int player1Applied = state.player1PowerUpsApplied();
        int player2Applied = state.player2PowerUpsApplied();
        MatchStateService.MatchState updatedState = new MatchStateService.MatchState(
                state.matchId(),
                state.player1Id(),
                state.player2Id(),
                state.player1Hp(),
                state.player2Hp(),
                state.player1LastRuntimeMs(),
                state.player2LastRuntimeMs(),
                state.player1LastMemoryMb(),
                state.player2LastMemoryMb(),
                isPlayer1 ? player1Applied + 1 : player1Applied,
                isPlayer2 ? player2Applied + 1 : player2Applied,
                state.player1ComboStreak(),
                state.player2ComboStreak(),
                isPlayer1 ? currentPowerUps : state.player1PowerUps(),
                isPlayer2 ? currentPowerUps : state.player2PowerUps(),
                state.firstAcAwardedUserId(),
                state.status(),
                state.completed());
        matchStateService.save(updatedState);

        Map<String, Object> effectPayload;
        switch (type) {
            case BLUR -> effectPayload = Map.of("type", "BLUR", "durationMs", 5000);
            case DISABLE_AUTOCOMPLETE -> effectPayload = Map.of("type", "DISABLE_AUTOCOMPLETE", "durationMs",
                    10000);
            case LOCK_KEYWORD -> {
                String keyword = LOCK_KEYWORDS.get(ThreadLocalRandom.current().nextInt(LOCK_KEYWORDS.size()));
                // Store powerup lock in database
                PowerupLock lock = PowerupLock.create(matchId, opponentId, keyword, 30000);
                powerupLockRepository.save(lock);
                effectPayload = Map.of("type", "LOCK_KEYWORD", "keyword", keyword, "durationMs", 30000);
            }
            case FORCE_THEME_SWAP -> effectPayload = Map.of("type", "FORCE_THEME_SWAP", "durationMs", 15000);
            case REVERSE_KEYBOARD -> effectPayload = Map.of("type", "REVERSE_KEYBOARD", "durationMs", 3000);
            case HIDE_TESTCASES -> {
                effectPayload = Map.of("type", "HIDE_TESTCASES", "durationMs", 60000);
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported power-up");
        }

        messagingTemplate.convertAndSendToUser(opponentSessionId, "/queue/powerup", effectPayload);

        Map<String, Object> eventPayload = Map.of(
                "type", "powerup_used",
                "usedBy", userName,
                "powerUpType", type.name(),
                "target", "opponent");

        MatchEvent event = MatchEvent.builder()
                .match(match)
                .user(userRepository.findById(userUuid.toString())
                        .orElseThrow(() -> new ResourceNotFoundException("User not found")))
                .eventType(EventType.POWERUP_USED)
                .payload(eventPayload)
                .build();
        matchEventRepository.save(event);

        messagingTemplate.convertAndSend("/topic/matches/" + matchId + "/powerups", effectPayload);
        matchWebSocketPublisher.publishPowerUpUsed(matchId, Map.of(
                "matchId", matchId,
                "userId", userId,
                "powerUpType", type.name(),
                "effect", effectPayload,
                "opponentSessionId", opponentSessionId));
    }

    

    private String resolveOpponentSessionId(UUID matchUuid, String opponentId, boolean isPlayer1) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'resolveOpponentSessionId'");
    }

    private UUID parseUuid(String value, String fieldName) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + fieldName);
        }
    }
}