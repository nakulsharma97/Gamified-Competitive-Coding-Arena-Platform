package com.codeslam.backend.repository;

import com.codeslam.backend.entity.Match;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.enums.MatchStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MatchRepository extends JpaRepository<MatchEntity, String> {
    default Optional<MatchEntity> findById(UUID id) {
        return findById(id.toString());
    }

    @Query("select m from MatchEntity m where m.player1.id = :p1 or m.player2.id = :p2")
    List<MatchEntity> findByPlayer1IdOrPlayer2Id(@Param("p1") String player1Id, @Param("p2") String player2Id);

    default List<MatchEntity> findByPlayer1IdOrPlayer2Id(UUID player1Id, UUID player2Id) {
        return findByPlayer1IdOrPlayer2Id(player1Id.toString(), player2Id.toString());
    }

    @Query("select m from MatchEntity m where m.player1.id = :p1 or m.player2.id = :p2")
    Page<MatchEntity> findByPlayer1IdOrPlayer2Id(@Param("p1") String player1Id, @Param("p2") String player2Id,
            Pageable pageable);

    default Page<MatchEntity> findByPlayer1IdOrPlayer2Id(UUID player1Id, UUID player2Id, Pageable pageable) {
        return findByPlayer1IdOrPlayer2Id(player1Id.toString(), player2Id.toString(), pageable);
    }

    List<MatchEntity> findByStatus(MatchStatus status);

    List<MatchEntity> findTop10ByPlayer1IdOrPlayer2IdOrderByCreatedAtDesc(String player1Id, String player2Id);

    List<MatchEntity> findTop20ByPlayer1IdOrPlayer2IdOrderByCreatedAtDesc(String player1Id, String player2Id);

    long countByWinnerId(String winnerId);

    default long countByWinnerId(UUID winnerId) {
        return countByWinnerId(winnerId.toString());
    }

    @Query("select count(m) from MatchEntity m where m.player1.id = :userId or m.player2.id = :userId")
    long countMatchesForUser(@Param("userId") String userId);

    default long countMatchesForUser(UUID userId) {
        return countMatchesForUser(userId.toString());
    }

    long countByCreatedAtAfter(Instant createdAt);

    long countByCreatedAtAfter(LocalDateTime createdAt);

    @Query(value = """
            select count(*)
            from matches m
            join problems p on p.id = m.problem_id
            where m.winner_id = :userId
                and lower(cast(p.topics as char)) like concat('%"', lower(:topic), '"%')
            """, nativeQuery = true)
    long countWinsByUserOnTopic(@Param("userId") String userId, @Param("topic") String topic);

    default long countWinsByUserOnTopic(UUID userId, String topic) {
        return countWinsByUserOnTopic(userId.toString(), topic);
    }
}
