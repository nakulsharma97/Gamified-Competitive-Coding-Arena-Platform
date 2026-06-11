package com.codeslam.backend.repository;

import com.codeslam.backend.entity.EloHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EloHistoryRepository extends JpaRepository<EloHistory, String> {
    default Optional<EloHistory> findById(UUID id) {
        return findById(id.toString());
    }

    Page<EloHistory> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    default Page<EloHistory> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable) {
        return findByUserIdOrderByCreatedAtDesc(userId.toString(), pageable);
    }

    List<EloHistory> findByUserIdAndCreatedAtAfterOrderByCreatedAtAsc(String userId, Instant createdAt);

    default List<EloHistory> findByUserIdAndCreatedAtAfterOrderByCreatedAtAsc(UUID userId, Instant createdAt) {
        return findByUserIdAndCreatedAtAfterOrderByCreatedAtAsc(userId.toString(), createdAt);
    }
}
