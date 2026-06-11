package com.codeslam.backend.auth.service;

import com.codeslam.backend.auth.Role;
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
import com.codeslam.backend.auth.repository.AuthUserRepository;
import com.codeslam.backend.ratelimit.LoginAttemptService;
import com.codeslam.backend.ratelimit.RateLimitExceededException;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final AuthUserRepository authUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttemptService;
    private final AuthTokenService authTokenService;
    private final PasswordResetService passwordResetService;

    public AuthService(AuthUserRepository authUserRepository, PasswordEncoder passwordEncoder,
            LoginAttemptService loginAttemptService, AuthTokenService authTokenService,
            PasswordResetService passwordResetService) {
        this.authUserRepository = authUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.loginAttemptService = loginAttemptService;
        this.authTokenService = authTokenService;
        this.passwordResetService = passwordResetService;
    }

    @Transactional
    public AuthResponse register(@Valid RegisterRequest request) {
        String normalizedUsername = request.username().trim();
        String normalizedEmail = request.email().trim().toLowerCase();

        if (authUserRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already taken");
        }
        if (authUserRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        AuthUser user = AuthUser.builder()
                .username(normalizedUsername)
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .enabled(Boolean.TRUE)
                .tokenVersion(0L)
                .build();

        AuthUser saved = authUserRepository.save(user);
        return buildAuthResponse(saved, authTokenService.issueTokens(saved));
    }

    @Transactional
    public AuthResponse login(@Valid LoginRequest request) {
        String identifier = request.identifier().trim();
        String clientIp = clientIp();
        loginAttemptService.assertAllowed(clientIp, identifier);

        try {
            AuthUser user = authUserRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase(identifier, identifier)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

            if (!Boolean.TRUE.equals(user.getEnabled())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is disabled");
            }

            if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
            }

            loginAttemptService.recordSuccess(clientIp, identifier);
            return buildAuthResponse(user, authTokenService.issueTokens(user));
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode().is4xxClientError()) {
                loginAttemptService.recordFailure(clientIp, identifier);
            }
            throw exception;
        } catch (RateLimitExceededException exception) {
            throw exception;
        }
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        AuthTokenService.IssuedTokens tokens = authTokenService.refresh(request.refreshToken());
        AuthUser user = authUserRepository.findById(tokens.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));
        return buildAuthResponse(user, tokens);
    }

    @Transactional
    public void logout(String authorizationHeader, LogoutRequest request) {
        authTokenService.logout(authorizationHeader, request.refreshToken());
    }

    @Transactional
    public void requestPasswordReset(PasswordResetRequest request) {
        passwordResetService.requestPasswordReset(request.email());
    }

    @Transactional
    public void resetPassword(PasswordResetConfirmRequest request) {
        AuthUser user = passwordResetService.consumeResetToken(request.resetToken());
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setTokenVersion((user.getTokenVersion() == null ? 0L : user.getTokenVersion()) + 1L);
        AuthUser saved = authUserRepository.save(user);
        authTokenService.invalidateAllRefreshTokens(saved.getId());
    }

    @Transactional
    public AuthResponse changePassword(String userId, String authorizationHeader, PasswordChangeRequest request) {
        AuthUser user = getUserById(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setTokenVersion((user.getTokenVersion() == null ? 0L : user.getTokenVersion()) + 1L);
        AuthUser saved = authUserRepository.save(user);

        return authTokenService.issueTokensAfterPasswordChange(saved, authorizationHeader);
    }

    @Transactional(readOnly = true)
    public AuthProfileResponse getProfile(AuthUser user) {
        return toProfile(user);
    }

    @Transactional(readOnly = true)
    public AuthAdminSummaryResponse getAdminSummary(AuthUser currentUser) {
        if (currentUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Admin role required");
        }

        long totalAccounts = authUserRepository.count();
        long activeAccounts = authUserRepository.findAll().stream()
                .filter(account -> Boolean.TRUE.equals(account.getEnabled())).count();
        long adminAccounts = authUserRepository.findAll().stream().filter(account -> account.getRole() == Role.ADMIN)
                .count();

        return new AuthAdminSummaryResponse(totalAccounts, activeAccounts, adminAccounts, toProfile(currentUser));
    }

    @Transactional(readOnly = true)
    public AuthUser getUserById(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication subject");
        }

        return authUserRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));
    }

    private AuthResponse buildAuthResponse(AuthUser user, AuthTokenService.IssuedTokens tokens) {
        return new AuthResponse(
                tokens.accessToken(),
                tokens.refreshToken(),
                "Bearer",
                tokens.accessTokenExpiresInSeconds(),
                tokens.refreshTokenExpiresInSeconds(),
                toProfile(user));
    }

    private AuthProfileResponse toProfile(AuthUser user) {
        return new AuthProfileResponse(
                java.util.UUID.fromString(user.getId()),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                Boolean.TRUE.equals(user.getEnabled()),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }

    private String clientIp() {
        var requestAttributes = RequestContextHolder.getRequestAttributes();
        if (requestAttributes instanceof ServletRequestAttributes servletRequestAttributes) {
            HttpServletRequest request = servletRequestAttributes.getRequest();
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }

            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return realIp.trim();
            }

            return request.getRemoteAddr();
        }

        return "unknown-ip";
    }
}
