package com.codeslam.backend.repository;

import com.codeslam.backend.entity.SpectatorSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpectatorSessionRepository extends JpaRepository<SpectatorSession, String> {

    @Query("SELECT ss FROM SpectatorSession ss WHERE ss.matchId = :matchId")
    List<SpectatorSession> findByMatchId(@Param("matchId") String matchId);

    @Query("SELECT ss FROM SpectatorSession ss WHERE ss.sessionId = :sessionId")
    Optional<SpectatorSession> findBySessionId(@Param("sessionId") String sessionId);

    @Query("DELETE FROM SpectatorSession ss WHERE ss.matchId = :matchId")
    void deleteByMatchId(@Param("matchId") String matchId);

    @Query("DELETE FROM SpectatorSession ss WHERE ss.sessionId = :sessionId")
    void deleteBySessionId(@Param("sessionId") String sessionId);
}
