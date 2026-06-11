package com.codeslam.backend.repository;

import com.codeslam.backend.entity.Tournament;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TournamentRepository extends JpaRepository<Tournament, String> {
    default Optional<Tournament> findById(UUID id) { return findById(id.toString()); }



    List<Tournament> findTop5ByStatusIgnoreCaseOrderByStartDateDesc(String status);

    List<Tournament> findByStatusIgnoreCaseOrderByCreatedAtDesc(String status);
}


