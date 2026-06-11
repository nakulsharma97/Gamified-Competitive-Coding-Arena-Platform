package com.codeslam.backend.auth.repository;

import com.codeslam.backend.auth.entity.AuthPasswordResetToken;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuthPasswordResetTokenRepository extends JpaRepository<AuthPasswordResetToken, String> {
    default Optional<AuthPasswordResetToken> findById(UUID id) {
        return findById(id.toString());
    }

    Optional<AuthPasswordResetToken> findByTokenHash(String tokenHash);

    long deleteByExpiresAtBefore(Instant cutoff);
}
