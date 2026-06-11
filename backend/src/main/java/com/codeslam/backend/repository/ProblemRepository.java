package com.codeslam.backend.repository;

import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.enums.Difficulty;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProblemRepository extends JpaRepository<Problem, String>, JpaSpecificationExecutor<Problem> {

    @Query(value = "SELECT * FROM problems p WHERE p.difficulty = :difficulty AND JSON_CONTAINS(p.topics, JSON_QUOTE(:topic), '$')", nativeQuery = true)
    List<Problem> findByDifficultyAndTopicsContaining(@Param("difficulty") Difficulty difficulty,
            @Param("topic") String topic);

    Page<Problem> findByDifficulty(Difficulty difficulty, Pageable pageable);

    @Query(value = "SELECT * FROM problems p WHERE JSON_CONTAINS(p.topics, JSON_QUOTE(:topic), '$')", nativeQuery = true)
    Page<Problem> findByTopicsContaining(@Param("topic") String topic, Pageable pageable);

    Page<Problem> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    @Query(value = """
            SELECT *
            FROM problems p
            WHERE (:search IS NULL OR :search = ''
                OR MATCH(p.title, p.description) AGAINST (:search IN BOOLEAN MODE))
            """, countQuery = """
            SELECT COUNT(*)
            FROM problems p
            WHERE (:search IS NULL OR :search = ''
                OR MATCH(p.title, p.description) AGAINST (:search IN BOOLEAN MODE))
            """, nativeQuery = true)
    Page<Problem> searchByFullText(@Param("search") String search, Pageable pageable);

    @Query(value = "SELECT * FROM problems p WHERE p.difficulty = :d ORDER BY COALESCE(p.battle_use_count, 0), p.id LIMIT 1", nativeQuery = true)
    Problem findLeastUsedByDifficulty(@Param("d") Difficulty difficulty);

    @Query(value = """
            SELECT *
            FROM problems p
            WHERE (:difficulty IS NULL OR p.difficulty = :difficulty)
                AND (:topic IS NULL OR :topic = '' OR JSON_CONTAINS(p.topics, JSON_QUOTE(:topic), '$'))
                AND (:search IS NULL OR :search = '' OR LOWER(p.title) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY p.battle_use_count DESC, p.id ASC
            """, countQuery = """
            SELECT COUNT(*)
            FROM problems p
            WHERE (:difficulty IS NULL OR p.difficulty = :difficulty)
                AND (:topic IS NULL OR :topic = '' OR JSON_CONTAINS(p.topics, JSON_QUOTE(:topic), '$'))
                AND (:search IS NULL OR :search = '' OR LOWER(p.title) LIKE LOWER(CONCAT('%', :search, '%')))
            """, nativeQuery = true)
    Page<Problem> searchProblems(@Param("difficulty") String difficulty,
            @Param("topic") String topic,
            @Param("search") String search,
            Pageable pageable);

    @Query(value = "SELECT * FROM problems ORDER BY id LIMIT 1 OFFSET :offset", nativeQuery = true)
    Problem findByOrderedOffset(@Param("offset") long offset);

    @Modifying
    @Transactional
    @Query("update Problem p set p.battleUseCount = coalesce(p.battleUseCount, 0) + 1 where p.id = :id")
    int incrementBattleUseCount(@Param("id") UUID id);
}
