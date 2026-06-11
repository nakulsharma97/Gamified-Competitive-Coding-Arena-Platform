package com.codeslam.backend.mapper;

import com.codeslam.backend.dto.TestCaseDto;
import com.codeslam.backend.entity.TestCase;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TestCaseMapper {
    default TestCaseDto toDto(TestCase testCase) {
        if (testCase == null) {
            return null;
        }
        return new TestCaseDto(
                testCase.getId() == null ? null : testCase.getId().toString(),
                testCase.getInput(),
                testCase.getExpectedOutput(),
                testCase.getExplanation(),
                testCase.getDisplayOrder() == null ? 0 : testCase.getDisplayOrder());
    }

    default TestCase toEntity(TestCaseDto dto) {
        if (dto == null) {
            return null;
        }
        TestCase testCase = new TestCase();
        testCase.setId(dto.id());
        testCase.setInput(dto.input());
        testCase.setExpectedOutput(dto.expectedOutput());
        testCase.setExplanation(dto.explanation());
        testCase.setDisplayOrder(dto.displayOrder());
        return testCase;
    }

    default List<TestCaseDto> toDtos(List<TestCase> testCases) {
        return testCases == null ? List.of() : testCases.stream().map(this::toDto).toList();
    }
}
