package com.codeslam.backend.auth.repository;

import com.codeslam.backend.auth.entity.AuthAccessTokenBlacklist;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuthAccessTokenBlacklistRepository extends JpaRepository<AuthAccessTokenBlacklist, String> {
    default Optional<AuthAccessTokenBlacklist> findById(UUID id) {
        return findById(id.toString());
    }

    boolean existsByJtiAndExpiresAtAfter(String jti, Instant cutoff);

    long deleteByExpiresAtBefore(Instant cutoff);
}
