package com.codeslam.backend.matchmaking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
import com.codeslam.backend.websocket.MatchWebSocketPublisher;

import java.lang.reflect.Constructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentMap;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MatchmakingServiceTest {

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

        private MatchmakingService matchmakingService;

        @BeforeEach
        @SuppressWarnings("unchecked")
        void setUp() {
                matchmakingService = new MatchmakingService(matchRepository, problemRepository,
                                userRepository, problemMapper, userMapper, messagingTemplate,
                                matchStateService, matchWebSocketPublisher);
                // Scheduling is disabled during unit tests; methods are invoked directly.
                ReflectionTestUtils.setField(matchmakingService, "schedulingEnabled", true);
        }

        @Test
        @SuppressWarnings("unchecked")
        void disconnectStoresGraceKeyNotifiesOpponentAndTimeoutEndsMatch() throws Exception {
                UUID matchId = UUID.randomUUID();
                UUID player1Id = UUID.randomUUID();
                UUID player2Id = UUID.randomUUID();
                String player1SessionId = "session-p1";
                String player2SessionId = "session-p2";

                MatchEntity match = createActiveMatch(matchId, player1Id, player2Id);
                when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));

                seedSession(player1SessionId, player1Id.toString());
                seedSession(player2SessionId, player2Id.toString());
                seedMatchSessions(matchId, player1SessionId, player2SessionId);

                matchmakingService.handleDisconnect(player1SessionId);

                ConcurrentMap<String, Long> expiry = (ConcurrentMap<String, Long>) ReflectionTestUtils
                                .getField(matchmakingService, "disconnectExpiry");
                assertTrue(expiry.containsKey("disconnect:" + matchId + ":" + player1Id));
                assertFalse(expiry.containsKey("disconnect:" + matchId + ":" + player2Id));

                verify(messagingTemplate).convertAndSendToUser(eq(player2SessionId), eq("/queue/match-state"),
                                eq(Map.of("type", "OPPONENT_DISCONNECTED", "reconnectWindowSeconds", 60)));

                // Force the grace key to look expired, then run the timeout sweeper.
                expiry.put("disconnect:" + matchId + ":" + player1Id, 0L);

                matchmakingService.processDisconnectTimeouts();

                verify(matchStateService).endMatch(matchId.toString(), player2Id.toString());
        }

        @Test
        @SuppressWarnings("unchecked")
        void secondDisconnectVoidsMatchWithoutApplyingEloChanges() throws Exception {
                UUID matchId = UUID.randomUUID();
                UUID player1Id = UUID.randomUUID();
                UUID player2Id = UUID.randomUUID();
                String player1SessionId = "session-p1";
                String player2SessionId = "session-p2";

                MatchEntity match = createActiveMatch(matchId, player1Id, player2Id);
                when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));

                seedSession(player1SessionId, player1Id.toString());
                seedSession(player2SessionId, player2Id.toString());
                seedMatchSessions(matchId, player1SessionId, player2SessionId);

                matchmakingService.handleDisconnect(player1SessionId);
                matchmakingService.handleDisconnect(player2SessionId);

                assertEquals(MatchStatus.VOID, match.getStatus());
                assertNotNull(match.getEndedAt());
                verify(matchRepository).save(match);
                verify(matchStateService, never()).endMatch(anyString(), anyString());
        }

        @Test
        @SuppressWarnings("unchecked")
        void reconnectClearsPendingDisconnectStateForActiveMatch() {
                UUID matchId = UUID.randomUUID();
                UUID player1Id = UUID.randomUUID();
                UUID player2Id = UUID.randomUUID();

                MatchEntity match = createActiveMatch(matchId, player1Id, player2Id);
                when(userRepository.findByClerkId(player1Id.toString())).thenReturn(Optional.of(match.getPlayer1()));
                when(matchRepository.findByPlayer1IdOrPlayer2Id(anyString(), anyString()))
                                .thenReturn(List.of(match));

                ConcurrentMap<String, Long> expiry = (ConcurrentMap<String, Long>) ReflectionTestUtils
                                .getField(matchmakingService, "disconnectExpiry");
                expiry.put("disconnect:" + matchId + ":" + player1Id, System.currentTimeMillis() + 60_000L);

                matchmakingService.handleReconnect(player1Id.toString());

                assertFalse(expiry.containsKey("disconnect:" + matchId + ":" + player1Id));
        }

        // --- helpers ---------------------------------------------------------

        @SuppressWarnings("unchecked")
        private void seedSession(String sessionId, String userId) {
                ConcurrentMap<String, String> owners = (ConcurrentMap<String, String>) ReflectionTestUtils
                                .getField(matchmakingService, "sessionOwners");
                owners.put(sessionId, userId);
        }

        @SuppressWarnings("unchecked")
        private void seedMatchSessions(UUID matchId, String p1SessionId, String p2SessionId) throws Exception {
                ConcurrentMap<String, Object> sessions = (ConcurrentMap<String, Object>) ReflectionTestUtils
                                .getField(matchmakingService, "matchSessions");
                Class<?> recordClass = Class.forName(
                                "com.codeslam.backend.matchmaking.MatchmakingService$MatchSessions");
                Constructor<?> ctor = recordClass.getDeclaredConstructors()[0];
                ctor.setAccessible(true);
                Object instance = ctor.newInstance(p1SessionId, p2SessionId);
                sessions.put(matchId.toString(), instance);
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
