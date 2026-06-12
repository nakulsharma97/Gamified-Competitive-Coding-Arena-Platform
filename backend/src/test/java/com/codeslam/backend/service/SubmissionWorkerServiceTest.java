package com.codeslam.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.codeslam.backend.dto.DamageResult;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.entity.SubmissionQueue;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.Difficulty;
import com.codeslam.backend.enums.Language;
import com.codeslam.backend.enums.MatchStatus;
import com.codeslam.backend.enums.Verdict;
import com.codeslam.backend.judge.JudgeService;
import com.codeslam.backend.repository.MatchEventRepository;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.ProblemRepository;
import com.codeslam.backend.repository.SubmissionQueueRepository;
import com.codeslam.backend.repository.SubmissionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletionException;
import java.net.SocketTimeoutException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.client.RestClientException;
import com.codeslam.backend.websocket.MatchWebSocketPublisher;

@ExtendWith(MockitoExtension.class)
class SubmissionWorkerServiceTest {

        @Mock
        private SubmissionQueueRepository submissionQueueRepository;

        @Mock
        private SubmissionRepository submissionRepository;

        @Mock
        private MatchRepository matchRepository;

        @Mock
        private ProblemRepository problemRepository;

        @Mock
        private MatchStateService matchStateService;

        @Mock
        private JudgeService judgeService;

        @Mock
        private DamageService damageService;

        @Mock
        private MatchEventRepository matchEventRepository;

        @Mock
        private SimpMessagingTemplate messagingTemplate;

        @Mock
        private MatchWebSocketPublisher matchWebSocketPublisher;

        private final ObjectMapper objectMapper = new ObjectMapper();
        private SubmissionWorkerService submissionWorkerService;

        @BeforeEach
        void setUp() {
                submissionWorkerService = new SubmissionWorkerService(submissionQueueRepository, submissionRepository,
                                matchRepository,
                                problemRepository, matchStateService, judgeService, damageService, matchEventRepository,
                                messagingTemplate, objectMapper, matchWebSocketPublisher);
        }

        @Test
        void judgeTimeoutMarksSubmissionErrorAndSkipsDamageApplication() {
                UUID matchId = UUID.randomUUID();
                UUID submissionId = UUID.randomUUID();
                UUID userId = UUID.randomUUID();
                UUID problemId = UUID.randomUUID();

                MatchEntity match = createMatch(matchId, userId);
                Submission submission = createSubmission(submissionId, match, userId, problemId);
                SubmissionQueue queuedSubmission = SubmissionQueue.create(submissionId.toString(), 1L);

                when(submissionQueueRepository.findNextUnprocessed())
                                .thenReturn(Optional.of(queuedSubmission));
                when(submissionRepository.findById(submissionId.toString())).thenReturn(Optional.of(submission));
                when(matchRepository.findById(matchId.toString())).thenReturn(Optional.of(match));
                when(judgeService.judge(anyString(), any(), anyString()))
                                .thenThrow(new RestClientException("timeout",
                                                new SocketTimeoutException("Read timed out")));

                submissionWorkerService.processQueue();

                ArgumentCaptor<Submission> submissionCaptor = ArgumentCaptor.forClass(Submission.class);
                verify(submissionRepository).save(submissionCaptor.capture());
                Submission savedSubmission = submissionCaptor.getValue();
                assertEquals(Verdict.ERROR, savedSubmission.getVerdict());
                assertNull(savedSubmission.getRuntimeMs());
                assertNull(savedSubmission.getMemoryMb());
                assertEquals(0, savedSubmission.getPassedCases());
                assertEquals(0, savedSubmission.getTotalCases());
                assertEquals(false, savedSubmission.getFirstAc());

                verify(messagingTemplate).convertAndSendToUser(eq(userId.toString()), eq("/queue/errors"),
                                eq(Map.of("type", "JUDGE_ERROR", "message", "Execution failed, you may resubmit")));
                verify(damageService, never()).calculateDamage(any(), anyInt(), anyDouble(), any(), any(), anyBoolean(),
                                anyList());
                verify(matchStateService, never()).applyDamage(any(), any(), any());
                verify(messagingTemplate, never()).convertAndSend(eq("/topic/match." + matchId), any(Object.class));
        }

        private MatchEntity createMatch(UUID matchId, UUID userId) {
                User player1 = new User();
                player1.setId(userId);
                player1.setUsername("player1");
                player1.setEmail("player1@example.com");
                player1.setEloRating(1500);

                User player2 = new User();
                player2.setId(UUID.randomUUID());
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
                return match;
        }

        private Submission createSubmission(UUID submissionId, MatchEntity match, UUID userId, UUID problemId) {
                User user = new User();
                user.setId(userId);
                user.setUsername("player1");
                user.setEmail("player1@example.com");
                user.setEloRating(1500);

                Problem problem = new Problem();
                problem.setId(problemId);
                problem.setTitle("Problem");
                problem.setDescription("Description");
                problem.setDifficulty(Difficulty.EASY);

                Submission submission = Submission.builder()
                                .match(match)
                                .user(user)
                                .problem(problem)
                                .code("class Main {}")
                                .language(Language.JAVA)
                                .verdict(Verdict.PENDING)
                                .runtimeMs(null)
                                .memoryMb(null)
                                .passedCases(0)
                                .totalCases(0)
                                .firstAc(false)
                                .build();
                submission.setId(submissionId);
                return submission;
        }
}
