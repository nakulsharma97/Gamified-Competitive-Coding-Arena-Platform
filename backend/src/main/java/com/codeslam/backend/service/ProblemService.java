package com.codeslam.backend.service;

import com.codeslam.backend.dto.PagedResponse;
import com.codeslam.backend.dto.ProblemDto;
import com.codeslam.backend.dto.TestCaseDto;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.TestCase;
import com.codeslam.backend.enums.Difficulty;
import com.codeslam.backend.exception.ResourceNotFoundException;
import com.codeslam.backend.repository.ProblemRepository;
import com.codeslam.backend.repository.TestCaseRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;

    public ProblemService(ProblemRepository problemRepository, TestCaseRepository testCaseRepository) {
        this.problemRepository = problemRepository;
        this.testCaseRepository = testCaseRepository;
    }

   @Transactional(readOnly = true)
public PagedResponse<ProblemDto> getProblems(Difficulty difficulty, String topic, String search,
        Pageable pageable) {

    Pageable effectivePageable = PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize()
    );

    Page<Problem> page = problemRepository.searchProblems(
            difficulty == null ? null : difficulty.name(),
            topic,
            search,
            effectivePageable);

    List<ProblemDto> data = page.getContent().stream().map(this::toDto).toList();

    return new PagedResponse<>(
            data,
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.hasNext());
}

    @Transactional(readOnly = true)
    public ProblemDto getProblem(UUID id) {
        return toDto(problemRepository.findById(id.toString())
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found")));
    }

    @Transactional(readOnly = true)
    public ProblemDto getDailyProblem() {
        long totalProblems = problemRepository.count();
        if (totalProblems == 0L) {
            throw new ResourceNotFoundException("No problems available");
        }

        long offset = LocalDate.now().getDayOfYear() % totalProblems;
        Problem problem = problemRepository.findByOrderedOffset(offset);
        if (problem == null) {
            throw new ResourceNotFoundException("Daily problem not found");
        }
        return toDto(problem);
    }

    private ProblemDto toDto(Problem problem) {
        List<TestCaseDto> visibleTestCases = testCaseRepository
                .findByProblemIdAndHiddenFalseOrderByDisplayOrderAsc(problem.getId())
                .stream()
                .map(this::toTestCaseDto)
                .toList();

        return new ProblemDto(
                problem.getId() == null ? null : problem.getId().toString(),
                problem.getTitle(),
                problem.getDescription(),
                problem.getDifficulty() == null ? null : problem.getDifficulty().name(),
                problem.getTopics() == null ? List.of() : problem.getTopics(),
                problem.getConstraintsText(),
                problem.getTimeLimitMs() == null ? 0 : problem.getTimeLimitMs(),
                problem.getMemoryLimitMb() == null ? 0 : problem.getMemoryLimitMb(),
                problem.getOptimalTimeComplexity(),
                problem.getBattleUseCount() == null ? 0L : problem.getBattleUseCount().longValue(),
                visibleTestCases);
    }

    private TestCaseDto toTestCaseDto(TestCase testCase) {
        return new TestCaseDto(
                testCase.getId() == null ? null : testCase.getId().toString(),
                testCase.getInput(),
                testCase.getExpectedOutput(),
                testCase.getExplanation(),
                testCase.getDisplayOrder() == null ? 0 : testCase.getDisplayOrder());
    }
}