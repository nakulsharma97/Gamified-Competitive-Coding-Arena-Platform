package com.codeslam.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.codeslam.backend.dto.DamageResult;
import com.codeslam.backend.dto.SubmissionProcessingResultDto;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.Difficulty;
import com.codeslam.backend.enums.Language;
import com.codeslam.backend.enums.MatchStatus;
import com.codeslam.backend.enums.Verdict;
import com.codeslam.backend.match.MatchStateService;
import com.codeslam.backend.match.MatchStateService.MatchDamageResult;
import com.codeslam.backend.repository.EloHistoryRepository;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MatchStateServiceTest {

        @Mock
        private MatchRepository matchRepository;

        @Mock
        private UserRepository userRepository;

        @Mock
        private EloHistoryRepository eloHistoryRepository;

        @Mock
        private SimpMessagingTemplate messagingTemplate;

        private MatchStateService matchStateService;

        @BeforeEach
        void setUp() {
                matchStateService = new MatchStateService(
                                matchRepository,
                                userRepository,
                                eloHistoryRepository,
                                null, // EloService (lazy)
                                messagingTemplate,
                                new ObjectMapper(),
                                null // MatchWebSocketPublisher
                );
        }

        @Test
        void applyDamageReducesOpponentHp() {
                UUID matchId = UUID.randomUUID();
                UUID player1Id = UUID.randomUUID();
                UUID player2Id = UUID.randomUUID();

                MatchEntity match = new MatchEntity();
                match.setId(matchId);
                match.setStatus(MatchStatus.ACTIVE);
                match.setPlayer1Hp(100);
                match.setPlayer2Hp(100);
                match.setPlayer1TotalDamage(0);
                match.setPlayer2TotalDamage(0);

                User player1 = new User();
                player1.setId(player1Id);
                User player2 = new User();
                player2.setId(player2Id);
                match.setPlayer1(player1);
                match.setPlayer2(player2);

                lenient().when(matchRepository.findById(matchId.toString())).thenReturn(Optional.of(match));
                lenient().when(matchRepository.save(match)).thenReturn(match);

                MatchStateService.MatchDamageResult result = matchStateService.applyDamage(matchId.toString(),
                                player1Id.toString(), 20, 0);

                assertEquals(100, result.player1Hp);
                assertEquals(80, result.player2Hp);
        }}

        UUID matchId = UUID.randomUUID();
        UUID player1Id = UUID.randomUUID();
        UUID player2Id = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();

        MatchEntity match = createMatch(matchId, player1Id, player2Id);

        void lenient().when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));

                MatchStateService.MatchState initialState = new MatchStateService.MatchState();

                Submission submission = Submission.builder()
                                .match(match)
                                .user(match.getPlayer1())
                                .problem(match.getProblem())
                                .code("class Main {}")
                                .language(Language.JAVA)
                                .verdict(Verdict.AC)
                                .runtimeMs(100)
                                .memoryMb(32.0)
                                .passedCases(1)
                                .totalCases(1)
                                .firstAc(false)
                                .build();
                submission.setId(submissionId);

                DamageResult damageResult = DamageResult.builder()
                                .damageDealt(10)
                                .selfDamage(10)
                                .breakdown(List.of())
                                .build();

                MatchDamageResult result = matchStateService.applyDamage(initialState, submission,
                                damageResult,
                                false);

                assertEquals(player1Id, result.winnerId());
                assertEquals(0, result.player2Hp());
                assertEquals(0, result.player2Hp());

                ArgumentCaptor<MatchEntity> matchCaptor = ArgumentCaptor.forClass(MatchEntity.class);
                verify(matchRepository).save(matchCaptor.capture());
                MatchEntity savedMatch = matchCaptor.getValue();
                assertEquals(MatchStatus.COMPLETED, savedMatch.getStatus());
                assertEquals(player1Id, savedMatch.getWinner().getId());
                assertNotNull(savedMatch.getEndedAt());
        }

        private MatchEntity createMatch(UUID matchId, UUID player1Id, UUID player2Id) {
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
                match.setPlayer1Hp(1);
                match.setPlayer2Hp(1);
                match.setPlayer1EloSnapshot(1500);
                match.setPlayer2EloSnapshot(1500);
                match.setPlayer1TotalDamage(0);
                match.setPlayer2TotalDamage(0);
                match.setEloChangeP1(0);
                match.setEloChangeP2(0);
                return match;
        }
}
