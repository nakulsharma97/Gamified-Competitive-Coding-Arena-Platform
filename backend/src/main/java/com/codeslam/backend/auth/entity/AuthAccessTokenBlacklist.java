package com.codeslam.backend.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "auth_access_token_blacklist", indexes = {
        @Index(name = "idx_auth_access_token_blacklist_user_id", columnList = "user_id"),
        @Index(name = "idx_auth_access_token_blacklist_expires_at", columnList = "expires_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthAccessTokenBlacklist {

    @Id
    @Column(name = "id", length = 36, nullable = false, columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "jti", nullable = false, unique = true, length = 36)
    private String jti;

    @Column(name = "user_id", nullable = false, length = 36, columnDefinition = "CHAR(36)")
    private String userId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}