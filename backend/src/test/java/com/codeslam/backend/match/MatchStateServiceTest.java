package com.codeslam.backend.match;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import com.codeslam.backend.repository.EloHistoryRepository;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.UserRepository;
import com.codeslam.backend.service.EloService;
import com.codeslam.backend.websocket.MatchWebSocketPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MatchStateServiceTest {

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private HashOperations<String, Object, Object> hashOperations;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EloHistoryRepository eloHistoryRepository;

    @Mock
    private EloService eloService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private MatchWebSocketPublisher matchWebSocketPublisher;

    private MatchStateService matchStateService;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        matchStateService = new MatchStateService(redisTemplate, matchRepository, userRepository,
                eloHistoryRepository, eloService, messagingTemplate, new ObjectMapper(), matchWebSocketPublisher);
    }

    @Test
    void resolveTimerWinnerPrefersHigherTotalDamage() {
        UUID matchId = UUID.randomUUID();
        UUID player1Id = UUID.randomUUID();
        UUID player2Id = UUID.randomUUID();

        stubMatchState(matchId, player1Id, player2Id, 30, 55, 1500, 1400);

        assertEquals(player2Id.toString(), matchStateService.resolveTimerWinner(matchId.toString()));
    }

    @Test
    void resolveTimerWinnerFallsBackToHigherEloSnapshotWhenDamageIsTied() {
        UUID matchId = UUID.randomUUID();
        UUID player1Id = UUID.randomUUID();
        UUID player2Id = UUID.randomUUID();

        stubMatchState(matchId, player1Id, player2Id, 40, 40, 1600, 1500);

        assertEquals(player1Id.toString(), matchStateService.resolveTimerWinner(matchId.toString()));
    }

    private void stubMatchState(UUID matchId, UUID player1Id, UUID player2Id, int p1TotalDamage,
            int p2TotalDamage, int p1Elo, int p2Elo) {
        String key = "match:" + matchId;
        lenient().when(hashOperations.get(key, "p1TotalDamage")).thenReturn(String.valueOf(p1TotalDamage));
        lenient().when(hashOperations.get(key, "p2TotalDamage")).thenReturn(String.valueOf(p2TotalDamage));
        lenient().when(hashOperations.get(key, "p1Id")).thenReturn(player1Id.toString());
        lenient().when(hashOperations.get(key, "p2Id")).thenReturn(player2Id.toString());
        lenient().when(hashOperations.get(key, "p1EloSnapshot")).thenReturn(String.valueOf(p1Elo));
        lenient().when(hashOperations.get(key, "p2EloSnapshot")).thenReturn(String.valueOf(p2Elo));
    }
}
