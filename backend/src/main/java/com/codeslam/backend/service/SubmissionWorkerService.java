package com.codeslam.backend.service;

import com.codeslam.backend.dto.DamageResult;
import com.codeslam.backend.dto.SubmissionResultEvent;
import com.codeslam.backend.entity.MatchEvent;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.enums.EventType;
import com.codeslam.backend.enums.Verdict;
import com.codeslam.backend.judge.JudgeResult;
import com.codeslam.backend.judge.JudgeService;
import com.codeslam.backend.repository.MatchEventRepository;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.ProblemRepository;
import com.codeslam.backend.repository.SubmissionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletionException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import com.codeslam.backend.websocket.MatchWebSocketPublisher;

@Service
public class SubmissionWorkerService {

    private static final String QUEUE_KEY = "queue:submissions";

    @Value("${scheduling.enabled:true}")
    private boolean schedulingEnabled;

    private final StringRedisTemplate redisTemplate;
    private final SubmissionRepository submissionRepository;
    private final MatchRepository matchRepository;
    private final ProblemRepository problemRepository;
    private final MatchStateService matchStateService;
    private final JudgeService judgeService;
    private final DamageService damageService;
    private final MatchEventRepository matchEventRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final MatchWebSocketPublisher matchWebSocketPublisher;

    public SubmissionWorkerService(StringRedisTemplate redisTemplate, SubmissionRepository submissionRepository,
            MatchRepository matchRepository, ProblemRepository problemRepository,
            MatchStateService matchStateService, JudgeService judgeService, DamageService damageService,
            MatchEventRepository matchEventRepository, SimpMessagingTemplate messagingTemplate,
            ObjectMapper objectMapper, MatchWebSocketPublisher matchWebSocketPublisher) {
        this.redisTemplate = redisTemplate;
        this.submissionRepository = submissionRepository;
        this.matchRepository = matchRepository;
        this.problemRepository = problemRepository;
        this.matchStateService = matchStateService;
        this.judgeService = judgeService;
        this.damageService = damageService;
        this.matchEventRepository = matchEventRepository;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
        this.matchWebSocketPublisher = matchWebSocketPublisher;
    }

    @Scheduled(fixedDelay = 100)
    @Transactional
    public void processQueue() {
        // Check at runtime since @ConditionalOnProperty doesn't apply to methods
        if (!schedulingEnabled) {
            return;
        }
        String submissionIdValue = redisTemplate.opsForList().rightPop(QUEUE_KEY, Duration.ofMillis(100));
        if (submissionIdValue == null || submissionIdValue.isBlank()) {
            return;
        }

        UUID submissionId = UUID.fromString(submissionIdValue.trim());
        Submission submission = submissionRepository.findById(submissionId.toString()).orElse(null);
        if (submission == null || submission.getMatch() == null || submission.getProblem() == null) {
            return;
        }

        MatchEntity match = matchRepository.findById(submission.getMatch().getId().toString()).orElse(null);
        if (match == null) {
            return;
        }

        JudgeResult judgeResult;
        try {
            judgeResult = judgeService.judge(
                    submission.getCode(),
                    submission.getLanguage(),
                    submission.getProblem().getId().toString());
        } catch (RestClientException | CompletionException exception) {
            submission.setVerdict(Verdict.ERROR);
            submission.setRuntimeMs(null);
            submission.setMemoryMb(null);
            submission.setPassedCases(0);
            submission.setTotalCases(0);
            submission.setFirstAc(false);
            submissionRepository.save(submission);

            messagingTemplate.convertAndSendToUser(submission.getUser().getId().toString(), "/queue/errors",
                    Map.of("type", "JUDGE_ERROR", "message", "Execution failed, you may resubmit"));
            return;
        }

        submission.setVerdict(Verdict.valueOf(judgeResult.verdict()));
        submission.setRuntimeMs((int) Math.min(Integer.MAX_VALUE, judgeResult.runtimeMs()));
        submission.setMemoryMb(judgeResult.memoryMb());
        submission.setPassedCases(judgeResult.passedCases());
        submission.setTotalCases(judgeResult.totalCases());

        boolean isFirstAc = submission.getVerdict() == Verdict.AC
                && submissionRepository.countByMatchIdAndVerdict(match.getId(), Verdict.AC) == 0;
        submission.setFirstAc(isFirstAc);
        submissionRepository.save(submission);

        MatchStateService.MatchState state = matchStateService.recordSubmissionStats(
                match.getId(),
                submission.getUser().getId(),
                submission.getRuntimeMs(),
                submission.getMemoryMb(),
                submission.getVerdict(),
                isFirstAc);

        DamageResult damageResult = damageService.calculateDamage(
                submission.getVerdict(),
                submission.getRuntimeMs() == null ? 0 : submission.getRuntimeMs(),
                submission.getMemoryMb() == null ? 0.0d : submission.getMemoryMb(),
                opponentRuntime(state, submission),
                opponentMemory(state, submission),
                isFirstAc,
                comboStreak(state, submission),
                List.of());

        MatchStateService.MatchState updatedState = matchStateService.applyDamage(
                match.getId(),
                submission.getUser().getId(),
                damageResult);

        SubmissionResultEvent submissionResultEvent = new SubmissionResultEvent(
                submission.getUser().getId(),
                submission.getVerdict().name(),
                Map.of(
                        "damageDealt", damageResult.getDamageDealt(),
                        "selfDamage", damageResult.getSelfDamage()),
                updatedState.player1Hp(),
                updatedState.player2Hp(),
                submission.getRuntimeMs(),
                isFirstAc);

        messagingTemplate.convertAndSend("/topic/match." + match.getId(), submissionResultEvent);
        matchWebSocketPublisher.publishCodeSubmitted(match.getId().toString(), Map.of(
                "matchId", match.getId().toString(),
                "submissionId", submission.getId().toString(),
                "userId", submission.getUser().getId().toString(),
                "verdict", submission.getVerdict().name(),
                "damageDealt", damageResult.getDamageDealt(),
                "selfDamage", damageResult.getSelfDamage(),
                "player1Hp", updatedState.player1Hp(),
                "player2Hp", updatedState.player2Hp()));

        try {
            String payloadJson = objectMapper.writeValueAsString(submissionResultEvent);
            MatchEvent matchEvent = MatchEvent.builder()
                    .match(match)
                    .user(submission.getUser())
                    .eventType(EventType.SUBMISSION)
                    .payload(Map.of("json", payloadJson))
                    .build();
            matchEventRepository.save(matchEvent);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to persist match submission event", exception);
        }

        problemRepository.incrementBattleUseCount(submission.getProblem().getId());
    }

    private Integer opponentRuntime(MatchStateService.MatchState state, Submission submission) {
        boolean isPlayer1 = state.player1Id().equals(submission.getUser().getId());
        return isPlayer1 ? state.player2LastRuntimeMs() : state.player1LastRuntimeMs();
    }

    private Double opponentMemory(MatchStateService.MatchState state, Submission submission) {
        boolean isPlayer1 = state.player1Id().equals(submission.getUser().getId());
        return isPlayer1 ? state.player2LastMemoryMb() : state.player1LastMemoryMb();
    }

    private int comboStreak(MatchStateService.MatchState state, Submission submission) {
        boolean isPlayer1 = state.player1Id().equals(submission.getUser().getId());
        return isPlayer1 ? state.player1ComboStreak() : state.player2ComboStreak();
    }
}