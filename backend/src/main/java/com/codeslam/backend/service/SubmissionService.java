package com.codeslam.backend.service;

import com.codeslam.backend.dto.PracticeSubmitRequest;
import com.codeslam.backend.dto.SubmissionJobResponse;
import com.codeslam.backend.dto.SubmitCodeRequest;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.entity.SubmissionQueue;
import com.codeslam.backend.entity.TestCase;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.Language;
import com.codeslam.backend.enums.Verdict;
import com.codeslam.backend.exception.ResourceNotFoundException;
import com.codeslam.backend.judge.JudgeResult;
import com.codeslam.backend.judge.JudgeService;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.ProblemRepository;
import com.codeslam.backend.repository.SubmissionQueueRepository;
import com.codeslam.backend.repository.SubmissionRepository;
import com.codeslam.backend.repository.TestCaseRepository;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final MatchRepository matchRepository;
    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
    private final UserService userService;
    private final SubmissionQueueRepository submissionQueueRepository;
    private final JudgeService judgeService;

    public SubmissionService(SubmissionRepository submissionRepository, MatchRepository matchRepository,
            ProblemRepository problemRepository, TestCaseRepository testCaseRepository, UserService userService,
            SubmissionQueueRepository submissionQueueRepository, JudgeService judgeService) {
        this.submissionRepository = submissionRepository;
        this.matchRepository = matchRepository;
        this.problemRepository = problemRepository;
        this.testCaseRepository = testCaseRepository;
        this.userService = userService;
        this.submissionQueueRepository = submissionQueueRepository;
        this.judgeService = judgeService;
    }

    @Transactional
    public SubmissionJobResponse createSubmission(String clerkId, SubmitCodeRequest request) {
        User user = userService.getUserByClerkId(clerkId);

        UUID matchId;
        try {
            matchId = UUID.fromString(request.matchId());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid matchId");
        }

        MatchEntity match = matchRepository.findById(matchId.toString())
                .orElseThrow(() -> new ResourceNotFoundException("Match not found"));

        boolean participant = user.getId().equals(match.getPlayer1().getId())
                || user.getId().equals(match.getPlayer2().getId());
        if (!participant) {
            throw new AccessDeniedException("Submission user is not part of the match");
        }

        Submission submission = Submission.builder()
                .match(match)
                .user(user)
                .problem(match.getProblem())
                .code(request.code())
                .language(parseLanguage(request.language()))
                .verdict(Verdict.PENDING)
                .runtimeMs(null)
                .memoryMb(null)
                .passedCases(0)
                .totalCases(0)
                .firstAc(false)
                .build();

        Submission saved = submissionRepository.save(submission);

        // Add to database queue instead of Redis
        long queuePosition = submissionQueueRepository.count() + 1;
        SubmissionQueue queuedSubmission = SubmissionQueue.create(saved.getId().toString(), queuePosition);
        submissionQueueRepository.save(queuedSubmission);

        return new SubmissionJobResponse(saved.getId());
    }

    @Transactional(readOnly = true)
    public JudgeResult runPracticeSubmission(String clerkId, PracticeSubmitRequest request) {
        userService.getUserByClerkId(clerkId);
        Problem problem = problemRepository.findById(request.getProblemId().toString())
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found"));

        List<TestCase> visibleCases = testCaseRepository.findByProblemIdAndHiddenFalseOrderByDisplayOrderAsc(
                problem.getId());
        return judgeService.judge(
                request.getCode(),
                toJudgeLanguage(request.getLanguage()),
                resolveLanguageVersion(request.getLanguage()),
                visibleCases);
    }

    private Language parseLanguage(String language) {
        if (language == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Language is required");
        }

        return switch (language.trim().toLowerCase(Locale.ROOT)) {
            case "python", "python3", "py" -> Language.PYTHON;
            case "javascript", "js", "node" -> Language.JAVASCRIPT;
            case "java" -> Language.JAVA;
            case "cpp", "c++", "g++" -> Language.CPP;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported language: " + language);
        };
    }

    private String resolveLanguageVersion(String language) {
        if (language == null) {
            return "latest";
        }

        return switch (language.trim().toLowerCase(Locale.ROOT)) {
            case "python", "python3", "py" -> "3.11.0";
            case "javascript", "js", "node" -> "18.15.0";
            case "typescript", "ts" -> "5.0.3";
            case "java" -> "21.0.2";
            case "c", "gcc" -> "10.2.0";
            case "cpp", "c++", "g++" -> "10.2.0";
            default -> "latest";
        };
    }

    private String toJudgeLanguage(String language) {
        if (language == null) {
            return "unknown";
        }

        return switch (language.trim().toLowerCase(Locale.ROOT)) {
            case "python", "python3", "py" -> "python";
            case "javascript", "js", "node" -> "javascript";
            case "java" -> "java";
            case "cpp", "c++", "g++" -> "cpp";
            default -> language.trim().toLowerCase(Locale.ROOT);
        };
    }
}