package com.codeslam.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.codeslam.backend.dto.SubmitCodeRequest;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.MatchStatus;
import com.codeslam.backend.matchmaking.MatchmakingService;
import com.codeslam.backend.repository.PowerupLockRepository;
import com.codeslam.backend.repository.SpectatorSessionRepository;
import com.codeslam.backend.repository.SubmissionQueueRepository;
import com.codeslam.backend.service.MatchStateService;
import com.codeslam.backend.service.PowerUpService;
import com.codeslam.backend.service.UserService;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.SubmissionRepository;
import com.codeslam.backend.websocket.MatchWebSocketPublisher;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class MatchWebSocketControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private MatchmakingService matchmakingService;

    @Mock
    private MatchStateService matchStateService;

    @Mock
    private PowerUpService powerUpService;

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private SubmissionQueueRepository submissionQueueRepository;

    @Mock
    private PowerupLockRepository powerupLockRepository;

    @Mock
    private SpectatorSessionRepository spectatorSessionRepository;

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private MatchWebSocketPublisher matchWebSocketPublisher;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    private MatchWebSocketController controller;

    @BeforeEach
    void setUp() {
        controller = new MatchWebSocketController(userService, matchmakingService, matchStateService, powerUpService,
                submissionRepository, submissionQueueRepository, powerupLockRepository, spectatorSessionRepository,
                matchRepository, messagingTemplate, matchWebSocketPublisher);
    }

    @Test
    void handleSubmitRejectsSubmissionsAfterMatchEndsBeforePersisting() {
        UUID matchId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Principal principal = () -> userId.toString();
        User user = new User();
        user.setId(userId);
        when(userService.getUserByClerkId(userId.toString())).thenReturn(user);

        MatchStateService.MatchState endedState = new MatchStateService.MatchState(
                matchId,
                userId,
                UUID.randomUUID(),
                100,
                100,
                null,
                null,
                null,
                null,
                0,
                0,
                0,
                0,
                List.of(),
                List.of(),
                null,
                MatchStatus.COMPLETED,
                true);
        when(matchStateService.getMatchState(matchId.toString())).thenReturn(endedState);
        when(powerupLockRepository.findActiveLock(anyString(), anyString(), any())).thenReturn(Optional.empty());

        controller.handleSubmit(new SubmitCodeRequest(matchId.toString(), "class Main {}", "java"), principal);

        verify(messagingTemplate).convertAndSendToUser(eq(userId.toString()), eq("/queue/errors"),
                eq(Map.of("type", "MATCH_ENDED")));
        verify(submissionRepository, never()).save(any());
        // verify(redisTemplate, never()).opsForList();
        verify(matchStateService, never()).isActiveParticipant(anyString(), anyString());
    }
}
