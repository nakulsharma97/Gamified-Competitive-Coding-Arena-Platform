package com.codeslam.backend.auth.dto;

public record AuthAdminSummaryResponse(
        long totalAccounts,
        long activeAccounts,
        long adminAccounts,
        AuthProfileResponse currentUser) {
}
