package com.codeslam.backend.mapper;

import com.codeslam.backend.dto.BadgeDto;
import com.codeslam.backend.entity.Badge;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BadgeMapper {
    BadgeDto toDto(Badge badge);

    Badge toEntity(BadgeDto dto);
}
