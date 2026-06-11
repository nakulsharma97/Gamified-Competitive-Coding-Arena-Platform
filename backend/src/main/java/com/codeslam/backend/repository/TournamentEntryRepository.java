package com.codeslam.backend.repository;

import com.codeslam.backend.entity.TournamentEntry;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TournamentEntryRepository extends JpaRepository<TournamentEntry, String> {
    default Optional<TournamentEntry> findById(UUID id) {
        return findById(id.toString());
    }

    long countByTournamentId(String tournamentId);

    default long countByTournamentId(UUID tournamentId) {
        return countByTournamentId(tournamentId.toString());
    }

    boolean existsByTournamentIdAndUserId(String tournamentId, String userId);

    default boolean existsByTournamentIdAndUserId(UUID tournamentId, UUID userId) {
        return existsByTournamentIdAndUserId(tournamentId.toString(), userId.toString());
    }
}
