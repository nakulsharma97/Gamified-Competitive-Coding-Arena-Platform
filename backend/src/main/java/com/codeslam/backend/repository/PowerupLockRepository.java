package com.codeslam.backend.repository;

import com.codeslam.backend.entity.PowerupLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface PowerupLockRepository extends JpaRepository<PowerupLock, String> {

    @Query("SELECT pl FROM PowerupLock pl WHERE pl.matchId = :matchId AND pl.userId = :userId AND pl.expiresAt > :now")
    Optional<PowerupLock> findActiveLock(@Param("matchId") String matchId, @Param("userId") String userId,
            @Param("now") Instant now);

    @Query("DELETE FROM PowerupLock pl WHERE pl.expiresAt < :now")
    void deleteExpiredLocks(@Param("now") Instant now);
}
