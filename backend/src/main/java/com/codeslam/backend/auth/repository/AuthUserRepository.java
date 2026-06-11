package com.codeslam.backend.auth.repository;

import com.codeslam.backend.auth.entity.AuthUser;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuthUserRepository extends JpaRepository<AuthUser, String> {
    default Optional<AuthUser> findById(UUID id) {
        return findById(id.toString());
    }

    Optional<AuthUser> findByEmailIgnoreCase(String email);

    Optional<AuthUser> findByUsernameIgnoreCase(String username);

    Optional<AuthUser> findByEmailIgnoreCaseOrUsernameIgnoreCase(String email, String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);
}
