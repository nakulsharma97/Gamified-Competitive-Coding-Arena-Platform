package com.codeslam.backend.service;

import com.codeslam.backend.dto.DamageResult;
import com.codeslam.backend.dto.MatchResultDto;
import com.codeslam.backend.dto.SubmissionDto;
import com.codeslam.backend.dto.SubmissionProcessingResultDto;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.entity.TestCase;
import com.codeslam.backend.enums.Language;
import com.codeslam.backend.enums.Verdict;
import com.codeslam.backend.judge.JudgeResult;
import com.codeslam.backend.judge.JudgeService;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.SubmissionRepository;
import com.codeslam.backend.repository.TestCaseRepository;
import com.codeslam.backend.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubmissionProcessingService {

    private final SubmissionRepository submissionRepository;
    private final MatchRepository matchRepository;
    private final TestCaseRepository testCaseRepository;
    private final JudgeService judgeService;
    private final DamageService damageService;
    private final MatchStateService matchStateService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public SubmissionProcessingService(
            SubmissionRepository submissionRepository,
            MatchRepository matchRepository,
            TestCaseRepository testCaseRepository,
            JudgeService judgeService,
            DamageService damageService,
            MatchStateService matchStateService,
            SimpMessagingTemplate messagingTemplate,
            ObjectMapper objectMapper) {
        this.submissionRepository = submissionRepository;
        this.matchRepository = matchRepository;
        this.testCaseRepository = testCaseRepository;
        this.judgeService = judgeService;
        this.damageService = damageService;
        this.matchStateService = matchStateService;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    @Async("submissionTaskExecutor")
    @Transactional
    public CompletableFuture<Void> processSubmission(UUID submissionId) {
        Submission submission = submissionRepository.findById(submissionId.toString()).orElse(null);
        if (submission == null || submission.getMatch() == null) {
            return CompletableFuture.completedFuture(null);
        }

        MatchEntity match = matchRepository.findById(submission.getMatch().getId().toString()).orElse(null);
        if (match == null) {
            return CompletableFuture.completedFuture(null);
        }

        MatchStateService.MatchState matchState = matchStateService.loadOrCreate(match);
        List<TestCase> testCases = testCaseRepository.findByProblemIdOrderByDisplayOrderAsc(match.getProblem().getId());

        String judgeLanguage = toJudgeLanguage(submission.getLanguage());
        String languageVersion = resolveLanguageVersion(submission.getLanguage());
        JudgeResult judgeResult = judgeService.judge(submission.getCode(), judgeLanguage, languageVersion,
                testCases);

        boolean firstAc = Verdict.AC.name().equals(judgeResult.verdict())
                && matchState.firstAcAwardedUserId() == null;

        submission.setVerdict(Verdict.valueOf(judgeResult.verdict()));
        submission.setRuntimeMs((int) Math.min(Integer.MAX_VALUE, judgeResult.runtimeMs()));
        submission.setMemoryMb(judgeResult.memoryMb());
        submission.setPassedCases(judgeResult.passedCases());
        submission.setTotalCases(judgeResult.totalCases());
        submission.setFirstAc(firstAc);

        submissionRepository.save(submission);

        MatchStateService.MatchState updatedState = matchStateService.recordSubmissionStats(
                match.getId(),
                submission.getUser().getId(),
                submission.getRuntimeMs(),
                submission.getMemoryMb(),
                submission.getVerdict(),
                firstAc);

        DamageResult damageResult = damageService.calculate(
                submission.getVerdict(),
                submission.getRuntimeMs(),
                submission.getMemoryMb(),
                opponentRuntime(updatedState, submission),
                opponentMemory(updatedState, submission),
                firstAc,
                comboStreak(updatedState, submission),
                opponentPowerUpsApplied(updatedState, submission));

        SubmissionProcessingResultDto result = matchStateService.applyDamage(updatedState, submission, damageResult,
                firstAc);
        messagingTemplate.convertAndSend("/topic/matches/" + match.getId(), result);
        return CompletableFuture.completedFuture(null);
    }

    private String resolveLanguageVersion(Language language) {
        if (language == null) {
            return "latest";
        }
        return switch (language) {
            case PYTHON -> "3.11.0";
            case JAVASCRIPT -> "18.15.0";
            case JAVA -> "21.0.2";
            case CPP -> "10.2.0";
        };
    }

    private String toJudgeLanguage(Language language) {
        if (language == null) {
            return "unknown";
        }
        return switch (language) {
            case PYTHON -> "python";
            case JAVASCRIPT -> "javascript";
            case CPP -> "cpp";
            case JAVA -> "java";
        };
    }

    private Integer opponentRuntime(MatchStateService.MatchState state, Submission submission) {
        boolean isPlayer1 = state.player1Id().equals(submission.getUser().getId());
        return isPlayer1 ? state.player2LastRuntimeMs() : state.player1LastRuntimeMs();
    }

    private Double opponentMemory(MatchStateService.MatchState state, Submission submission) {
        boolean isPlayer1 = state.player1Id().equals(submission.getUser().getId());
        return isPlayer1 ? state.player2LastMemoryMb() : state.player1LastMemoryMb();
    }

    private int opponentPowerUpsApplied(MatchStateService.MatchState state, Submission submission) {
        boolean isPlayer1 = state.player1Id().equals(submission.getUser().getId());
        return isPlayer1 ? state.player1PowerUpsApplied() : state.player2PowerUpsApplied();
    }

    private int comboStreak(MatchStateService.MatchState state, Submission submission) {
        boolean isPlayer1 = state.player1Id().equals(submission.getUser().getId());
        return isPlayer1 ? state.player1ComboStreak() : state.player2ComboStreak();
    }
}
