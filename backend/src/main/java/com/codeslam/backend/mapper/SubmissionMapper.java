package com.codeslam.backend.mapper;

import com.codeslam.backend.dto.SubmissionDto;
import com.codeslam.backend.entity.Submission;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SubmissionMapper {

    default SubmissionDto toDto(Submission submission) {
        if (submission == null) {
            return null;
        }
        return new SubmissionDto(
                submission.getId() == null ? null : submission.getId().toString(),
                submission.getMatch() == null ? null : submission.getMatch().getId().toString(),
                submission.getUser() == null ? null : submission.getUser().getId().toString(),
                submission.getVerdict() == null ? null : submission.getVerdict().name(),
                submission.getRuntimeMs() == null ? 0 : submission.getRuntimeMs(),
                submission.getPassedCases() == null ? 0 : submission.getPassedCases(),
                submission.getTotalCases() == null ? 0 : submission.getTotalCases(),
                Boolean.TRUE.equals(submission.getFirstAc()),
                submission.getSubmittedAt() == null ? null : submission.getSubmittedAt().toString());
    }

    default Submission toEntity(SubmissionDto dto) {
        if (dto == null) {
            return null;
        }
        Submission submission = new Submission();
        submission.setId(dto.id());
        if (dto.verdict() != null) {
            submission.setVerdict(com.codeslam.backend.enums.Verdict.valueOf(dto.verdict()));
        }
        submission.setRuntimeMs(dto.runtimeMs());
        submission.setPassedCases(dto.passedCases());
        submission.setTotalCases(dto.totalCases());
        submission.setFirstAc(dto.isFirstAc());
        return submission;
    }
}
