package com.codeslam.backend.repository;

import com.codeslam.backend.entity.SubmissionQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionQueueRepository extends JpaRepository<SubmissionQueue, String> {

    @Query("SELECT sq FROM SubmissionQueue sq WHERE sq.processed = false ORDER BY sq.queuePosition ASC LIMIT 1")
    Optional<SubmissionQueue> findNextUnprocessed();

    @Query("SELECT sq FROM SubmissionQueue sq WHERE sq.submissionId = :submissionId")
    Optional<SubmissionQueue> findBySubmissionId(@Param("submissionId") String submissionId);

    @Query("SELECT COUNT(sq) FROM SubmissionQueue sq WHERE sq.processed = false")
    long countUnprocessed();

    @Query("SELECT sq FROM SubmissionQueue sq WHERE sq.processed = false ORDER BY sq.queuePosition ASC")
    List<SubmissionQueue> findAllUnprocessed();
}
