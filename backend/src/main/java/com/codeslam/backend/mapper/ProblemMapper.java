package com.codeslam.backend.mapper;

import com.codeslam.backend.dto.ProblemDto;
import com.codeslam.backend.entity.Problem;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, uses = { TestCaseMapper.class })
public interface ProblemMapper {

    default ProblemDto toDto(Problem problem) {
        if (problem == null) {
            return null;
        }
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
                problem.getTestCases() == null ? List.of()
                        : problem.getTestCases().stream()
                                .filter(testCase -> !Boolean.TRUE.equals(testCase.getHidden()))
                                .map(testCase -> new TestCaseMapper() {
                                }.toDto(testCase))
                                .toList());
    }

    default Problem toEntity(ProblemDto dto) {
        if (dto == null) {
            return null;
        }
        Problem problem = new Problem();
        problem.setId(dto.id());
        problem.setTitle(dto.title());
        problem.setDescription(dto.description());
        if (dto.difficulty() != null) {
            problem.setDifficulty(com.codeslam.backend.enums.Difficulty.valueOf(dto.difficulty()));
        }
        problem.setTopics(dto.topics());
        problem.setConstraintsText(dto.constraintsText());
        problem.setTimeLimitMs(dto.timeLimitMs());
        problem.setMemoryLimitMb(dto.memoryLimitMb());
        problem.setOptimalTimeComplexity(dto.optimalTimeComplexity());
        problem.setBattleUseCount((int) dto.battleUseCount());
        return problem;
    }
}
