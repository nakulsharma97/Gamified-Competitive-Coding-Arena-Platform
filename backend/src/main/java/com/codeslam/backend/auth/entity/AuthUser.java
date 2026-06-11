package com.codeslam.backend.auth.entity;

import com.codeslam.backend.auth.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "auth_users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthUser {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled;

    @Column(name = "token_version", nullable = false)
    private Long tokenVersion;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (enabled == null) {
            enabled = Boolean.TRUE;
        }
        if (role == null) {
            role = Role.USER;
        }
        if (tokenVersion == null) {
            tokenVersion = 0L;
        }
    }

    @PreUpdate
    void preUpdate() {
        if (enabled == null) {
            enabled = Boolean.TRUE;
        }
        if (role == null) {
            role = Role.USER;
        }
        if (tokenVersion == null) {
            tokenVersion = 0L;
        }
    }
}
