package com.codeslam.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "test_cases")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestCase {

    @Id
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @Lob
    @Column(name = "input")
    private String input;

    @Lob
    @Column(name = "expected_output")
    private String expectedOutput;

    @Column(name = "is_hidden", nullable = false)
    private Boolean hidden;

    @Lob
    @Column(name = "explanation")
    private String explanation;

    @Column(name = "display_order")
    private Integer displayOrder;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (hidden == null) {
            hidden = false;
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
