package com.codeslam.backend.repository;

import com.codeslam.backend.entity.Badge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BadgeRepository extends JpaRepository<Badge, String> {
    default Optional<Badge> findById(UUID id) { return findById(id.toString()); }



    Optional<Badge> findByCriteriaKey(String criteriaKey);
}


