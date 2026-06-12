package com.codeslam.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "submission_queue", indexes = {
        @Index(name = "idx_queue_position", columnList = "queue_position"),
        @Index(name = "idx_queue_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionQueue {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "submission_id", length = 36, nullable = false, unique = true)
    private String submissionId;

    @Column(name = "queue_position", nullable = false)
    private Long queuePosition;

    @Column(name = "processed", nullable = false)
    private Boolean processed = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    public static SubmissionQueue create(String submissionId, Long queuePosition) {
        return SubmissionQueue.builder()
                .id(UUID.randomUUID().toString())
                .submissionId(submissionId)
                .queuePosition(queuePosition)
                .processed(false)
                .build();
    }
}
