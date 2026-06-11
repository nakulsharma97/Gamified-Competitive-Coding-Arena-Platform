package com.codeslam.backend.repository;

import com.codeslam.backend.entity.MatchEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MatchEventRepository extends JpaRepository<MatchEvent, String> {
    default Optional<MatchEvent> findById(UUID id) {
        return findById(id.toString());
    }

    List<MatchEvent> findByMatchIdOrderByOccurredAt(String matchId);

    default List<MatchEvent> findByMatchIdOrderByOccurredAt(UUID matchId) {
        return findByMatchIdOrderByOccurredAt(matchId.toString());
    }

    List<MatchEvent> findByMatchIdOrderByOccurredAtAsc(String matchId);

    default List<MatchEvent> findByMatchIdOrderByOccurredAtAsc(UUID matchId) {
        return findByMatchIdOrderByOccurredAtAsc(matchId.toString());
    }

    @Query(value = """
            select count(distinct m.id)
            from matches m
            join match_events me on me.match_id = m.id and me.event_type = 'SUBMISSION'
            where m.winner_id = :userId
                and (
                    (m.player1_id = :userId and cast(json_unquote(json_extract(cast(json_unquote(json_extract(me.payload, '$.json')) as json), '$.newP1Hp')) as signed) <= 20)
                    or
                    (m.player2_id = :userId and cast(json_unquote(json_extract(cast(json_unquote(json_extract(me.payload, '$.json')) as json), '$.newP2Hp')) as signed) <= 20)
                )
            """, nativeQuery = true)
    long countComebackWins(@Param("userId") String userId);

    default long countComebackWins(UUID userId) {
        return countComebackWins(userId.toString());
    }

    @Query(value = """
            select count(*)
            from (
                select me.match_id, sum(cast(json_unquote(json_extract(cast(json_unquote(json_extract(me.payload, '$.json')) as json), '$.damage.damageDealt')) as signed)) as total_damage
                from match_events me
                where me.user_id = :userId
                    and me.event_type = 'SUBMISSION'
                group by me.match_id
                having total_damage >= :threshold
            ) t
            """, nativeQuery = true)
    long countDestroyerMatches(@Param("userId") String userId, @Param("threshold") int threshold);

    default long countDestroyerMatches(UUID userId, int threshold) {
        return countDestroyerMatches(userId.toString(), threshold);
    }

    @Query(value = """
            select count(*)
            from (
                select me.match_id, count(*) as used_count
                from match_events me
                where me.user_id = :userId
                    and me.event_type = 'POWERUP_USED'
                group by me.match_id
                having used_count >= :minimum
            ) t
            """, nativeQuery = true)
    long countPowerPlayerMatches(@Param("userId") String userId, @Param("minimum") int minimum);

    default long countPowerPlayerMatches(UUID userId, int minimum) {
        return countPowerPlayerMatches(userId.toString(), minimum);
    }
}
