package com.codeslam.backend.auth.dto;

import com.codeslam.backend.auth.Role;
import java.time.Instant;
import java.util.UUID;

public record AuthProfileResponse(
        UUID id,
        String username,
        String email,
        Role role,
        boolean enabled,
        Instant createdAt,
        Instant updatedAt) {
}
