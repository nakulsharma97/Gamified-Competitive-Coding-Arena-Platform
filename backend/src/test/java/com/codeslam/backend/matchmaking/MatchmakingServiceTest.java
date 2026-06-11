package com.codeslam.backend.matchmaking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.Difficulty;
import com.codeslam.backend.enums.MatchStatus;
import com.codeslam.backend.mapper.ProblemMapper;
import com.codeslam.backend.mapper.UserMapper;
import com.codeslam.backend.match.MatchStateService;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.ProblemRepository;
import com.codeslam.backend.repository.UserRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.codeslam.backend.websocket.MatchWebSocketPublisher;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MatchmakingServiceTest {

        @Mock
        private RedisTemplate<String, String> redisTemplate;

        @Mock
        private MatchRepository matchRepository;

        @Mock
        private ProblemRepository problemRepository;

        @Mock
        private UserRepository userRepository;

        @Mock
        private ProblemMapper problemMapper;

        @Mock
        private UserMapper userMapper;

        @Mock
        private SimpMessagingTemplate messagingTemplate;

        @Mock
        private MatchStateService matchStateService;

        @Mock
        private MatchWebSocketPublisher matchWebSocketPublisher;

        @Mock
        private HashOperations<String, Object, Object> hashOperations;

        @Mock
        private ZSetOperations<String, String> zSetOperations;

        @Mock
        private ValueOperations<String, String> valueOperations;

        private MatchmakingService matchmakingService;

        @BeforeEach
        void setUp() {
                lenient().when(redisTemplate.opsForHash()).thenReturn(hashOperations);
                lenient().when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
                lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
                matchmakingService = new MatchmakingService(redisTemplate, matchRepository, problemRepository,
                                userRepository,
                                problemMapper, userMapper, messagingTemplate, matchStateService,
                                matchWebSocketPublisher);
        }

        @Test
        void disconnectStoresGraceKeyNotifiesOpponentAndTimeoutEndsMatch() {
                UUID matchId = UUID.randomUUID();
                UUID player1Id = UUID.randomUUID();
                UUID player2Id = UUID.randomUUID();
                String player1SessionId = "session-p1";
                String player2SessionId = "session-p2";

                MatchEntity match = createActiveMatch(matchId, player1Id, player2Id);
                when(redisTemplate.keys("queue:meta:*")).thenReturn(Set.of("queue:meta:other"));
                when(hashOperations.entries("queue:meta:other")).thenReturn(Map.of("sessionId", "other-session"));
                when(redisTemplate.keys("match:sessions:*")).thenReturn(Set.of("match:sessions:" + matchId));
                when(hashOperations.entries("match:sessions:" + matchId)).thenReturn(Map.of(
                                "p1SessionId", player1SessionId,
                                "p2SessionId", player2SessionId));
                when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
                when(redisTemplate.hasKey("disconnect:" + matchId + ":" + player2Id)).thenReturn(false);

                matchmakingService.handleDisconnect(player1SessionId);

                verify(valueOperations).set(eq("disconnect:" + matchId + ":" + player1Id), eq("1"),
                                eq(Duration.ofSeconds(60)));
                verify(messagingTemplate).convertAndSendToUser(eq(player2SessionId), eq("/queue/match-state"),
                                eq(Map.of("type", "OPPONENT_DISCONNECTED", "reconnectWindowSeconds", 60)));

                when(zSetOperations.rangeByScore(eq("disconnect:index"), anyDouble(), anyDouble()))
                                .thenReturn(Set.of("disconnect:" + matchId + ":" + player1Id));

                matchmakingService.processDisconnectTimeouts();

                verify(matchStateService).endMatch(matchId.toString(), player2Id.toString());
        }

        @Test
        void secondDisconnectVoidsMatchWithoutApplyingEloChanges() {
                UUID matchId = UUID.randomUUID();
                UUID player1Id = UUID.randomUUID();
                UUID player2Id = UUID.randomUUID();
                String player1SessionId = "session-p1";
                String player2SessionId = "session-p2";

                MatchEntity match = createActiveMatch(matchId, player1Id, player2Id);
                when(redisTemplate.keys("queue:meta:*")).thenReturn(Set.of("queue:meta:other"));
                when(hashOperations.entries("queue:meta:other")).thenReturn(Map.of("sessionId", "other-session"));
                when(redisTemplate.keys("match:sessions:*")).thenReturn(Set.of("match:sessions:" + matchId));
                when(hashOperations.entries("match:sessions:" + matchId)).thenReturn(Map.of(
                                "p1SessionId", player1SessionId,
                                "p2SessionId", player2SessionId));
                when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
                when(redisTemplate.hasKey("disconnect:" + matchId + ":" + player2Id)).thenReturn(false);
                when(redisTemplate.hasKey("disconnect:" + matchId + ":" + player1Id)).thenReturn(true);

                matchmakingService.handleDisconnect(player1SessionId);
                matchmakingService.handleDisconnect(player2SessionId);

                assertEquals(MatchStatus.VOID, match.getStatus());
                assertNotNull(match.getEndedAt());
                verify(matchRepository).save(match);
                verify(matchStateService, never()).endMatch(anyString(), anyString());
        }

        @Test
        void reconnectClearsPendingDisconnectStateForActiveMatch() {
                UUID matchId = UUID.randomUUID();
                UUID player1Id = UUID.randomUUID();
                UUID player2Id = UUID.randomUUID();

                MatchEntity match = createActiveMatch(matchId, player1Id, player2Id);
                when(userRepository.findByClerkId(player1Id.toString())).thenReturn(Optional.of(match.getPlayer1()));
                when(matchRepository.findByPlayer1IdOrPlayer2Id(anyString(), anyString()))
                                .thenReturn(List.of(match));

                matchmakingService.handleReconnect(player1Id.toString());

                verify(redisTemplate).delete("disconnect:" + matchId + ":" + player1Id);
                verify(zSetOperations).remove("disconnect:index", "disconnect:" + matchId + ":" + player1Id);
        }

        private MatchEntity createActiveMatch(UUID matchId, UUID player1Id, UUID player2Id) {
                User player1 = new User();
                player1.setId(player1Id);
                player1.setUsername("player1");
                player1.setEmail("player1@example.com");
                player1.setEloRating(1500);

                User player2 = new User();
                player2.setId(player2Id);
                player2.setUsername("player2");
                player2.setEmail("player2@example.com");
                player2.setEloRating(1500);

                Problem problem = new Problem();
                problem.setId(UUID.randomUUID());
                problem.setTitle("Problem");
                problem.setDescription("Description");
                problem.setDifficulty(Difficulty.EASY);

                MatchEntity match = new MatchEntity();
                match.setId(matchId);
                match.setPlayer1(player1);
                match.setPlayer2(player2);
                match.setProblem(problem);
                match.setStatus(MatchStatus.ACTIVE);
                match.setPlayer1Hp(100);
                match.setPlayer2Hp(100);
                match.setPlayer1EloSnapshot(1500);
                match.setPlayer2EloSnapshot(1500);
                match.setPlayer1TotalDamage(0);
                match.setPlayer2TotalDamage(0);
                match.setEloChangeP1(0);
                match.setEloChangeP2(0);
                match.setStartedAt(LocalDateTime.now());
                return match;
        }
}
