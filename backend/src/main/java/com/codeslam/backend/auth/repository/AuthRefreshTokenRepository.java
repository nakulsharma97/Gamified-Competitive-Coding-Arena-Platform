package com.codeslam.backend.auth.repository;

import com.codeslam.backend.auth.entity.AuthRefreshToken;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuthRefreshTokenRepository extends JpaRepository<AuthRefreshToken, String> {
    default Optional<AuthRefreshToken> findById(UUID id) {
        return findById(id.toString());
    }

    Optional<AuthRefreshToken> findByTokenHash(String tokenHash);

    List<AuthRefreshToken> findAllByUserIdAndRevokedAtIsNull(String userId);

    long deleteByExpiresAtBefore(Instant cutoff);
}
