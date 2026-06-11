package com.codeslam.backend.judge;

import com.codeslam.backend.config.JudgeConfig;
import com.codeslam.backend.entity.TestCase;
import com.codeslam.backend.enums.Language;
import com.codeslam.backend.exception.ResourceNotFoundException;
import com.codeslam.backend.repository.TestCaseRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class JudgeService {

    private static final int DEFAULT_MEMORY_LIMIT_KB = 262144;

    private final JudgeConfig judgeConfig;
    private final TestCaseRepository testCaseRepository;
    private final RestTemplate restTemplate;

    public JudgeService(JudgeConfig judgeConfig, TestCaseRepository testCaseRepository,
            RestTemplate judgeRestTemplate) {
        this.judgeConfig = judgeConfig;
        this.testCaseRepository = testCaseRepository;
        this.restTemplate = judgeRestTemplate;
    }

    public JudgeResult judge(String code, Language language, String problemId) {
        UUID problemUuid;
        try {
            problemUuid = UUID.fromString(problemId);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid problemId");
        }

        List<TestCase> testCases = testCaseRepository.findByProblemId(problemUuid).stream()
                .sorted(Comparator.comparingInt(testCase -> testCase.getDisplayOrder() == null ? Integer.MAX_VALUE
                        : testCase.getDisplayOrder()))
                .collect(Collectors.toList());
        return judgeAgainstCases(code, mapLanguageId(language), testCases);
    }

    public JudgeResult judge(String code, String language, String languageVersion, List<TestCase> testCases) {
        return judgeAgainstCases(code, mapLanguageId(language), testCases);
    }

    private JudgeResult judgeAgainstCases(String code, int languageId, List<TestCase> testCases) {
        List<TestCase> safeTestCases = testCases == null ? List.of() : testCases;

        List<CompletableFuture<CaseResult>> futures = new ArrayList<>();
        ExecutorService executorService = Executors.newFixedThreadPool(5);
        for (int i = 0; i < safeTestCases.size(); i++) {
            final int caseIndex = i;
            final TestCase testCase = safeTestCases.get(i);
            futures.add(CompletableFuture.supplyAsync(
                    () -> runCase(caseIndex, code, languageId, testCase), executorService));
        }

        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        } finally {
            executorService.shutdown();
        }

        List<CaseResult> caseResults = futures.stream()
                .map(CompletableFuture::join)
                .sorted(Comparator.comparingInt(CaseResult::caseIndex))
                .collect(Collectors.toList());

        long runtimeMs = caseResults.stream().mapToLong(CaseResult::runtimeMs).max().orElse(0L);
        double memoryMb = caseResults.stream().mapToDouble(CaseResult::memoryMb).max().orElse(0.0d);
        int passedCases = (int) caseResults.stream().filter(CaseResult::passed).count();
        String verdict = calculateVerdict(caseResults, passedCases, caseResults.size());

        return new JudgeResult(verdict, runtimeMs, memoryMb, passedCases, caseResults.size(), caseResults);
    }

    private CaseResult runCase(int caseIndex, String code, int languageId, TestCase testCase) {
        try {
            Judge0Request requestBody = new Judge0Request(
                    code,
                    languageId,
                    testCase.getInput() == null ? "" : testCase.getInput(),
                    2.0d,
                    DEFAULT_MEMORY_LIMIT_KB);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (judgeConfig.getApiKey() != null && !judgeConfig.getApiKey().isBlank()) {
                headers.set("X-RapidAPI-Key", judgeConfig.getApiKey());
            }

            ResponseEntity<Judge0Response> response = restTemplate.exchange(
                    resolveExecuteUrl(), HttpMethod.POST, new HttpEntity<>(requestBody, headers), Judge0Response.class);
            Judge0Response body = response.getBody();
            if (body == null) {
                return new CaseResult(caseIndex, "RE", false, "", "", judgeFallbackRuntime(),
                        judgeFallbackMemory());
            }

            int statusId = body.status() == null ? -1 : body.status().id();
            String stdout = body.stdout() == null ? "" : body.stdout();
            String stderr = body.stderr() == null ? "" : body.stderr();
            String compileOutput = body.compile_output() == null ? "" : body.compile_output();
            String output = stderr.isBlank() ? compileOutput : stderr;
            long runtimeMs = toRuntimeMs(body.time());
            double memoryMb = toMemoryMb(body.memory());

            String verdict = mapStatusToVerdict(statusId);
            boolean passed = "AC".equals(verdict) && outputsMatch(stdout, testCase.getExpectedOutput());
            if ("AC".equals(verdict) && !passed) {
                verdict = "WA";
            }
            return new CaseResult(caseIndex, verdict, passed, stdout, output, runtimeMs, memoryMb);
        } catch (org.springframework.web.client.RestClientException | CompletionException exception) {
            throw exception;
        } catch (Exception exception) {
            String message = exception.getMessage() == null ? "" : exception.getMessage();
            String lower = message.toLowerCase(Locale.ROOT);
            if (lower.contains("timed out")) {
                return new CaseResult(caseIndex, "TLE", false, "", message, judgeFallbackRuntime(),
                        judgeFallbackMemory());
            }
            return new CaseResult(caseIndex, "RE", false, "", message, judgeFallbackRuntime(),
                    judgeFallbackMemory());
        }
    }

    private String calculateVerdict(List<CaseResult> caseResults, int passedCases, int totalCases) {
        if (caseResults.stream().anyMatch(result -> "TLE".equals(result.verdict()))) {
            return "TLE";
        }
        if (caseResults.stream().anyMatch(result -> "CE".equals(result.verdict()))) {
            return "CE";
        }
        if (caseResults.stream().anyMatch(result -> "RE".equals(result.verdict()))) {
            return "RE";
        }
        if (passedCases == totalCases) {
            return "AC";
        }
        return "WA";
    }

    private long toRuntimeMs(String runtimeSeconds) {
        Double seconds = toDouble(runtimeSeconds);
        if (seconds == null || seconds <= 0.0d) {
            return 0L;
        }
        return Math.round(seconds * 1000.0d);
    }

    private double toMemoryMb(Long memoryBytes) {
        if (memoryBytes == null || memoryBytes <= 0L) {
            return 0.0d;
        }
        return memoryBytes / (1024.0d * 1024.0d);
    }

    private long judgeFallbackRuntime() {
        return judgeConfig.getTimeoutMs();
    }

    private double judgeFallbackMemory() {
        return DEFAULT_MEMORY_LIMIT_KB / 1024.0d;
    }

    private String resolveExecuteUrl() {
        String baseUrl = judgeConfig.getUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            return "https://ce.judge0.com/submissions?base64_encoded=false&wait=true";
        }
        String normalized = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        if (normalized.endsWith("/submissions")) {
            return normalized + "?base64_encoded=false&wait=true";
        }
        return normalized + "/submissions?base64_encoded=false&wait=true";
    }

    private int mapLanguageId(Language language) {
        if (language == null) {
            return 71;
        }
        return switch (language) {
            case PYTHON -> 71;
            case JAVASCRIPT -> 63;
            case CPP -> 54;
            case JAVA -> 62;
        };
    }

    private int mapLanguageId(String language) {
        if (language == null) {
            return 71;
        }

        String normalized = language.trim().toLowerCase(Locale.ROOT);
        if (normalized.matches("\\d+")) {
            try {
                return Integer.parseInt(normalized);
            } catch (NumberFormatException exception) {
                return 71;
            }
        }

        return switch (normalized) {
            case "python", "python3", "py" -> 71;
            case "javascript", "js", "node" -> 63;
            case "cpp", "c++", "cxx" -> 54;
            case "java" -> 62;
            default -> 71;
        };
    }

    private String mapStatusToVerdict(int statusId) {
        return switch (statusId) {
            case 3 -> "AC";
            case 4 -> "WA";
            case 5 -> "TLE";
            case 6 -> "CE";
            default -> "RE";
        };
    }

    private boolean outputsMatch(String actual, String expected) {
        String normalizedActual = actual == null ? "" : actual.trim();
        String normalizedExpected = expected == null ? "" : expected.trim();
        return normalizedActual.equals(normalizedExpected);
    }

    private Double toDouble(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
