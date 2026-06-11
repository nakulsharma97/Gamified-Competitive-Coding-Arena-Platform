package com.codeslam.backend.mapper;

import com.codeslam.backend.dto.MatchDto;
import com.codeslam.backend.entity.Match;
import com.codeslam.backend.entity.MatchEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, uses = { ProblemMapper.class,
        UserMapper.class })
public interface MatchMapper {

    default MatchDto toDto(Match match) {
        if (match == null) {
            return null;
        }
        return new MatchDto(
                match.getId() == null ? null : match.getId().toString(),
                new ProblemMapper() {
                }.toDto(match.getProblem()),
                new UserMapper() {
                }.toDto(match.getPlayer1()),
                new UserMapper() {
                }.toDto(match.getPlayer2()),
                match.getStatus() == null ? null : match.getStatus().name(),
                match.getPlayer1Hp() == null ? 0 : match.getPlayer1Hp(),
                match.getPlayer2Hp() == null ? 0 : match.getPlayer2Hp());
    }

    default Match toEntity(MatchDto dto) {
        if (dto == null) {
            return null;
        }
        MatchEntity match = new MatchEntity();
        match.setId(dto.id());
        if (dto.status() != null) {
            match.setStatus(com.codeslam.backend.enums.MatchStatus.valueOf(dto.status()));
        }
        match.setPlayer1Hp(dto.player1Hp());
        match.setPlayer2Hp(dto.player2Hp());
        return match;
    }
}
