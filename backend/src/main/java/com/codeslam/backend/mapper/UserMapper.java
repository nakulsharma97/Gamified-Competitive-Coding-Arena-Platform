package com.codeslam.backend.mapper;

import com.codeslam.backend.dto.UserProfileDto;
import com.codeslam.backend.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.Map;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    default UserProfileDto toDto(User user) {
        if (user == null) {
            return null;
        }
        return new UserProfileDto(
                user.getId(),
                user.getClerkId(),
                user.getUsername(),
                user.getEloRating(),
                user.getRank() == null ? null : user.getRank().name(),
                user.getPlan() == null ? null : user.getPlan().name(),
                user.getPreferredLanguages() == null ? List.of() : user.getPreferredLanguages(),
                user.getTopicInterests() == null ? List.of() : user.getTopicInterests(),
                List.of(),
                Map.of());
    }

    default User toEntity(UserProfileDto dto) {
        if (dto == null) {
            return null;
        }
        User user = new User();
        user.setId(dto.id());
        user.setClerkId(dto.clerkId());
        user.setUsername(dto.username());
        user.setEloRating(dto.eloRating());
        if (dto.rankTier() != null) {
            user.setRank(com.codeslam.backend.enums.Rank.valueOf(dto.rankTier()));
        }
        if (dto.plan() != null) {
            user.setPlan(com.codeslam.backend.enums.Plan.valueOf(dto.plan()));
        }
        user.setPreferredLanguages(dto.preferredLanguages());
        user.setTopicInterests(dto.topicInterests());
        return user;
    }
}
