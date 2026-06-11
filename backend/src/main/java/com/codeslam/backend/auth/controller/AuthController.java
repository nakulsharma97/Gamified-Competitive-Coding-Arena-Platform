package com.codeslam.backend.auth.controller;

import com.codeslam.backend.auth.dto.AuthAdminSummaryResponse;
import com.codeslam.backend.auth.dto.AuthProfileResponse;
import com.codeslam.backend.auth.dto.AuthResponse;
import com.codeslam.backend.auth.dto.LoginRequest;
import com.codeslam.backend.auth.dto.LogoutRequest;
import com.codeslam.backend.auth.dto.PasswordChangeRequest;
import com.codeslam.backend.auth.dto.PasswordResetConfirmRequest;
import com.codeslam.backend.auth.dto.PasswordResetRequest;
import com.codeslam.backend.auth.dto.RefreshTokenRequest;
import com.codeslam.backend.auth.dto.RegisterRequest;
import com.codeslam.backend.auth.entity.AuthUser;
import com.codeslam.backend.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody LogoutRequest request) {
        authService.logout(authorizationHeader, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<Void> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        authService.requestPasswordReset(request);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody PasswordResetConfirmRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password/change")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> changePassword(Authentication authentication,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody PasswordChangeRequest request) {
        return ResponseEntity.ok(authService.changePassword((String) authentication.getPrincipal(), authorizationHeader,
                request));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<AuthProfileResponse> me(Authentication authentication) {
        AuthUser user = authService.getUserById((String) authentication.getPrincipal());
        return ResponseEntity.ok(authService.getProfile(user));
    }

    @GetMapping("/admin/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthAdminSummaryResponse> adminSummary(Authentication authentication) {
        AuthUser user = authService.getUserById((String) authentication.getPrincipal());
        return ResponseEntity.ok(authService.getAdminSummary(user));
    }
}
