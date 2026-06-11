package com.codeslam.backend.mapper;

import com.codeslam.backend.dto.MatchResultDto;
import com.codeslam.backend.entity.Match;
import com.codeslam.backend.entity.Submission;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.Map;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, uses = SubmissionMapper.class)
public interface MatchResultMapper {

    @Mapping(target = "matchId", source = "match.id")
    @Mapping(target = "winnerId", source = "match.winner.id")
    @Mapping(target = "eloChangeP1", source = "match.eloChangeP1")
    @Mapping(target = "eloChangeP2", source = "match.eloChangeP2")
    @Mapping(target = "damageBreakdown", source = "damageBreakdown")
    @Mapping(target = "submissions", source = "submissions")
    MatchResultDto toDto(Match match, List<Submission> submissions, Map<String, Integer> damageBreakdown);
}
