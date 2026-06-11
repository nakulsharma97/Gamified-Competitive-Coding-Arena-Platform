package com.codeslam.backend.judge;

import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.reset;
import static com.github.tomakehurst.wiremock.client.WireMock.stubFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.TestCase;
import com.codeslam.backend.enums.Difficulty;
import com.codeslam.backend.enums.Language;
import com.codeslam.backend.config.JudgeConfig;
import com.codeslam.backend.judge.JudgeService;
import com.codeslam.backend.repository.TestCaseRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.web.client.RestTemplate;
import org.springframework.test.context.ActiveProfiles;
import com.github.tomakehurst.wiremock.junit5.WireMockTest;

@SpringBootTest(classes = JudgeSecurityTest.TestApp.class, webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@WireMockTest(httpPort = 2000)
class JudgeSecurityTest {

    @Autowired
    private JudgeService judgeService;

    @MockBean
    private TestCaseRepository testCaseRepository;

    private UUID problemId;
    private TestCase testCase;

    @BeforeEach
    void setUp() {
        reset();

        problemId = UUID.randomUUID();

        Problem problem = Problem.builder()
                .title("Two Sum")
                .description("Return the sum")
                .difficulty(Difficulty.EASY)
                .topics(java.util.List.of("arrays"))
                .constraintsText("n/a")
                .timeLimitMs(2000)
                .memoryLimitMb(256)
                .optimalTimeComplexity("O(n)")
                .optimalSpaceComplexity("O(1)")
                .battleUseCount(0)
                .build();
        problem.setId(problemId);

        testCase = TestCase.builder()
                .problem(problem)
                .input("2 7")
                .expectedOutput("9")
                .hidden(false)
                .explanation("sample")
                .displayOrder(1)
                .build();

        when(testCaseRepository.findByProblemId(problemId)).thenReturn(java.util.List.of(testCase));
    }

    @Test
    @DisplayName("infinite loop returns TLE")
    void infiniteLoopReturnsTle() {
        stubJudge0("{\"status\":{\"id\":5,\"description\":\"Time Limit Exceeded\"},\"stderr\":\"TLE\",\"stdout\":\"\"}");

        assertDoesNotThrow(() -> {
            JudgeResult result = judgeService.judge("while True: pass", Language.PYTHON, problemId.toString());
            assertEquals("TLE", result.verdict());
            assertEquals(1, result.totalCases());
            assertEquals(0, result.passedCases());
            assertNotNull(result.caseResults());
            assertEquals(1, result.caseResults().size());
        });
    }

    @Test
    @DisplayName("fork bomb is treated as TLE or RE")
    void forkBombReturnsTleOrRe() {
        stubJudge0("{\"status\":{\"id\":5,\"description\":\"Time Limit Exceeded\"},\"stdout\":\"\",\"stderr\":\"\"}");

        JudgeResult result = judgeService.judge("import os\nwhile True: os.fork()", Language.PYTHON,
                problemId.toString());

        assertTrue(result.verdict().equals("TLE") || result.verdict().equals("RE"));
    }

    @Test
    @DisplayName("reading passwd never leaks root")
    void readPasswdDoesNotLeakRoot() {
        stubJudge0("{\"status\":{\"id\":11,\"description\":\"Runtime Error\"},\"stderr\":\"Permission denied\",\"stdout\":\"\"}");

        JudgeResult result = judgeService.judge("print(open('/etc/passwd').read())", Language.PYTHON,
                problemId.toString());

        assertTrue(result.verdict().equals("RE") || result.verdict().equals("WA"));
        assertFalse(result.caseResults().get(0).stdout().contains("root"));
    }

    @Test
    @DisplayName("network access returns RE")
    void networkCallReturnsRe() {
        stubJudge0("{\"status\":{\"id\":11,\"description\":\"Runtime Error\"},\"stderr\":\"Network unreachable\",\"stdout\":\"\"}");

        JudgeResult result = judgeService.judge(
                "import urllib.request\nprint(urllib.request.urlopen('http://google.com').read())",
                Language.PYTHON,
                problemId.toString());

        assertEquals("RE", result.verdict());
    }

    @Test
    @DisplayName("disk bomb is RE or MLE")
    void diskBombReturnsReOrMle() {
        stubJudge0("{\"status\":{\"id\":11,\"description\":\"Runtime Error\"},\"stderr\":\"Disk quota exceeded\",\"stdout\":\"\"}");

        JudgeResult result = judgeService.judge("open('/tmp/x','wb').write(b'0'*10**10)", Language.PYTHON,
                problemId.toString());

        assertTrue(result.verdict().equals("RE") || result.verdict().equals("MLE"));
    }

    @Test
    @DisplayName("shell escape returns RE and no leaked stdout")
    void shellEscapeReturnsRe() {
        stubJudge0("{\"status\":{\"id\":11,\"description\":\"Runtime Error\"},\"stderr\":\"Operation not permitted\",\"stdout\":\"\"}");

        JudgeResult result = judgeService.judge(
                "import subprocess\nsubprocess.run(['cat','/etc/passwd'])",
                Language.PYTHON,
                problemId.toString());

        assertEquals("RE", result.verdict());
        assertFalse(result.caseResults().get(0).stdout().contains("root"));
    }

    @Test
    @DisplayName("valid solution returns AC")
    void validSolutionReturnsAc() {
        stubJudge0("{\"status\":{\"id\":3,\"description\":\"Accepted\"},\"stdout\":\"9\\n\",\"time\":\"0.01\",\"memory\":1024}");

        JudgeResult result = judgeService.judge(
                "def two_sum(a, b):\n    return a + b\nprint(two_sum(4, 5))",
                Language.PYTHON,
                problemId.toString());

        assertEquals("AC", result.verdict());
        assertEquals(result.totalCases(), result.passedCases());
    }

    private void stubJudge0(String responseBody) {
        stubFor(post(urlEqualTo("/submissions?base64_encoded=false&wait=true")).willReturn(okJson(responseBody)));
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import(JudgeConfig.class)
    static class TestApp {

        @Bean
        JudgeService judgeService(JudgeConfig judgeConfig, TestCaseRepository testCaseRepository,
                RestTemplate judgeRestTemplate) {
            return new JudgeService(judgeConfig, testCaseRepository, judgeRestTemplate);
        }
    }
}
