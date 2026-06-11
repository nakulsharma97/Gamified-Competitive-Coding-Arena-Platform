package com.codeslam.backend.entity;

import com.codeslam.backend.enums.Difficulty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "problems")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Problem {

    @Id
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "title", nullable = false)
    private String title;

    @Lob
    @Column(name = "description", nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", nullable = false)
    private Difficulty difficulty;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "topics", columnDefinition = "JSON")
    private List<String> topics;

    @OneToMany(mappedBy = "problem")
    private List<TestCase> testCases;

    @Lob
    @Column(name = "constraints_text")
    private String constraintsText;

    @Column(name = "time_limit_ms")
    private Integer timeLimitMs;

    @Column(name = "memory_limit_mb")
    private Integer memoryLimitMb;

    @Column(name = "optimal_time_complexity")
    private String optimalTimeComplexity;

    @Column(name = "optimal_space_complexity")
    private String optimalSpaceComplexity;

    @Column(name = "battle_use_count")
    private Integer battleUseCount;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (battleUseCount == null) {
            battleUseCount = 0;
        }
        if (timeLimitMs == null) {
            timeLimitMs = 2000;
        }
        if (memoryLimitMb == null) {
            memoryLimitMb = 256;
        }
    }

    public UUID getId() {
        return id == null ? null : UUID.fromString(id);
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setId(UUID id) {
        this.id = id == null ? null : id.toString();
    }
}
