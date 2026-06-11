package com.codeslam.backend.repository;

import com.codeslam.backend.entity.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserBadgeRepository extends JpaRepository<UserBadge, String> {
    default Optional<UserBadge> findById(UUID id) {
        return findById(id.toString());
    }

    List<UserBadge> findByUserId(String userId);

    default List<UserBadge> findByUserId(UUID userId) {
        return findByUserId(userId.toString());
    }

    boolean existsByUserIdAndBadgeId(String userId, String badgeId);

    default boolean existsByUserIdAndBadgeId(UUID userId, UUID badgeId) {
        return existsByUserIdAndBadgeId(userId.toString(), badgeId.toString());
    }
}
