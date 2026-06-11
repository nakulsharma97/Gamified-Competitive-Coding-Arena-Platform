package com.codeslam.backend.entity;

import com.codeslam.backend.enums.Plan;
import com.codeslam.backend.enums.Rank;
import com.codeslam.backend.enums.RankTier;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
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
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "clerk_id", nullable = false, unique = true)
    private String clerkId;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "elo_rating", nullable = false)
    private Integer eloRating;

    @Enumerated(EnumType.STRING)
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @Column(name = "rank_tier", nullable = false)
    private RankTier rank;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan", nullable = false)
    private Plan plan;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferred_languages", columnDefinition = "JSON")
    private List<String> preferredLanguages;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "topic_interests", columnDefinition = "JSON")
    private List<String> topicInterests;

    @Column(name = "onboarding_complete", nullable = false)
    private Boolean onboardingComplete;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (onboardingComplete == null) {
            onboardingComplete = false;
        }
        if (eloRating == null) {
            eloRating = 1000;
        }
        if (rank == null) {
            rank = RankTier.BRONZE;
        }
        if (plan == null) {
            plan = Plan.FREE;
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

    public Rank getRank() {
        return rank == null ? null : Rank.valueOf(rank.name());
    }

    public void setRank(Rank rank) {
        this.rank = rank == null ? null : RankTier.valueOf(rank.name());
    }

    public RankTier getRankTier() {
        return rank;
    }
}
