package com.codeslam.backend.auth.service;

import com.codeslam.backend.auth.dto.AuthProfileResponse;
import com.codeslam.backend.auth.dto.AuthResponse;
import com.codeslam.backend.auth.entity.AuthAccessTokenBlacklist;
import com.codeslam.backend.auth.entity.AuthRefreshToken;
import com.codeslam.backend.auth.entity.AuthUser;
import com.codeslam.backend.auth.repository.AuthAccessTokenBlacklistRepository;
import com.codeslam.backend.auth.repository.AuthRefreshTokenRepository;
import com.codeslam.backend.auth.repository.AuthUserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JwtTokenService jwtTokenService;
    private final AuthRefreshTokenRepository refreshTokenRepository;
    private final AuthAccessTokenBlacklistRepository blacklistRepository;
    private final AuthUserRepository authUserRepository;
    private final long refreshTokenExpirationDays;

    public AuthTokenService(JwtTokenService jwtTokenService, AuthRefreshTokenRepository refreshTokenRepository,
            AuthAccessTokenBlacklistRepository blacklistRepository, AuthUserRepository authUserRepository,
            @org.springframework.beans.factory.annotation.Value("${auth.jwt.refresh-expiration-days:30}") long refreshTokenExpirationDays) {
        this.jwtTokenService = jwtTokenService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.blacklistRepository = blacklistRepository;
        this.authUserRepository = authUserRepository;
        this.refreshTokenExpirationDays = refreshTokenExpirationDays;
    }

    @Transactional
    public IssuedTokens issueTokens(AuthUser user) {
        CreatedRefreshToken createdRefreshToken = createRefreshToken(user, null);
        return toIssuedTokens(user, jwtTokenService.generateAccessToken(user), createdRefreshToken.rawToken());
    }

    @Transactional
    public IssuedTokens refresh(String refreshTokenValue) {
        AuthRefreshToken existing = requireActiveRefreshToken(refreshTokenValue);
        AuthUser user = requireActiveUser(existing.getUserId());
        ensureTokenVersionMatches(user, existing.getTokenVersion());

        existing.setRevokedAt(Instant.now());
        existing.setLastUsedAt(Instant.now());

        CreatedRefreshToken rotated = createRefreshToken(user, existing.getId());
        existing.setReplacedByTokenId(rotated.entity().getId());
        refreshTokenRepository.save(existing);

        return toIssuedTokens(user, jwtTokenService.generateAccessToken(user), rotated.rawToken());
    }

    @Transactional
    public void logout(String authorizationHeader, String refreshTokenValue) {
        revokeCurrentAccessToken(authorizationHeader);
        revokeRefreshToken(refreshTokenValue);
    }

    @Transactional
    public void revokeCurrentAccessToken(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        if (!StringUtils.hasText(token)) {
            return;
        }

        try {
            Jws<Claims> claims = jwtTokenService.parseToken(token);
            String jti = claims.getPayload().getId();
            String subject = claims.getPayload().getSubject();
            Instant expiresAt = claims.getPayload().getExpiration().toInstant();
            if (!StringUtils.hasText(jti) || !StringUtils.hasText(subject)) {
                return;
            }

            if (blacklistRepository.existsByJtiAndExpiresAtAfter(jti, Instant.now())) {
                return;
            }

            blacklistRepository.save(AuthAccessTokenBlacklist.builder()
                    .id(UUID.randomUUID().toString())
                    .jti(jti)
                    .userId(subject)
                    .expiresAt(expiresAt)
                    .revokedAt(Instant.now())
                    .build());
        } catch (Exception exception) {
            // Logout is intentionally idempotent.
        }
    }

    @Transactional
    public void revokeRefreshToken(String refreshTokenValue) {
        if (!StringUtils.hasText(refreshTokenValue)) {
            return;
        }

        refreshTokenRepository.findByTokenHash(hashToken(refreshTokenValue)).ifPresent(token -> {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(Instant.now());
                refreshTokenRepository.save(token);
            }
        });
    }

    @Transactional
    public void invalidateAllRefreshTokens(String userId) {
        Instant now = Instant.now();
        List<AuthRefreshToken> activeTokens = refreshTokenRepository.findAllByUserIdAndRevokedAtIsNull(userId);
        for (AuthRefreshToken token : activeTokens) {
            token.setRevokedAt(now);
        }
        refreshTokenRepository.saveAll(activeTokens);
    }

    @Transactional(readOnly = true)
    public boolean isAccessTokenBlacklisted(String jti) {
        return StringUtils.hasText(jti) && blacklistRepository.existsByJtiAndExpiresAtAfter(jti, Instant.now());
    }

    @Transactional
    public AuthResponse issueTokensAfterPasswordChange(AuthUser user, String authorizationHeader) {
        invalidateAllRefreshTokens(user.getId());
        revokeCurrentAccessToken(authorizationHeader);
        IssuedTokens tokens = issueTokens(user);
        AuthProfileResponse profile = new AuthProfileResponse(
                java.util.UUID.fromString(user.getId()),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                Boolean.TRUE.equals(user.getEnabled()),
                user.getCreatedAt(),
                user.getUpdatedAt());
        return new AuthResponse(tokens.accessToken(), tokens.refreshToken(), "Bearer",
                tokens.accessTokenExpiresInSeconds(), tokens.refreshTokenExpiresInSeconds(), profile);
    }

    @Transactional
    public long cleanupExpiredTokens() {
        Instant now = Instant.now();
        long refreshDeleted = refreshTokenRepository.deleteByExpiresAtBefore(now);
        long accessDeleted = blacklistRepository.deleteByExpiresAtBefore(now);
        return refreshDeleted + accessDeleted;
    }

    @Transactional
    private AuthRefreshToken requireActiveRefreshToken(String rawRefreshToken) {
        if (!StringUtils.hasText(rawRefreshToken)) {
            throw unauthorized();
        }

        AuthRefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken))
                .orElseThrow(this::unauthorized);
        Instant now = Instant.now();
        if (refreshToken.getRevokedAt() != null || refreshToken.getExpiresAt().isBefore(now)) {
            handleRefreshReuse(refreshToken.getUserId());
            throw unauthorized();
        }

        refreshToken.setLastUsedAt(now);
        refreshTokenRepository.save(refreshToken);
        return refreshToken;
    }

    private AuthUser requireActiveUser(String userId) {
        AuthUser user = authUserRepository.findById(userId)
                .orElseThrow(this::unauthorized);
        if (!Boolean.TRUE.equals(user.getEnabled())) {
            throw unauthorized();
        }
        return user;
    }

    private void ensureTokenVersionMatches(AuthUser user, Long tokenVersion) {
        long currentVersion = user.getTokenVersion() == null ? 0L : user.getTokenVersion();
        long presentedVersion = tokenVersion == null ? -1L : tokenVersion;
        if (currentVersion != presentedVersion) {
            handleRefreshReuse(user.getId());
            throw unauthorized();
        }
    }

    private void handleRefreshReuse(String userId) {
        invalidateAllRefreshTokens(userId);
        authUserRepository.findById(userId).ifPresent(user -> {
            user.setTokenVersion((user.getTokenVersion() == null ? 0L : user.getTokenVersion()) + 1L);
            authUserRepository.save(user);
        });
    }

    private CreatedRefreshToken createRefreshToken(AuthUser user, String replacedByTokenId) {
        String rawToken = generateRawRefreshToken();
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(refreshTokenExpirationDays * 24L * 60L * 60L);

        AuthRefreshToken entity = AuthRefreshToken.builder()
                .id(UUID.randomUUID().toString())
                .userId(user.getId())
                .tokenHash(hashToken(rawToken))
                .tokenVersion(user.getTokenVersion() == null ? 0L : user.getTokenVersion())
                .expiresAt(expiresAt)
                .replacedByTokenId(replacedByTokenId)
                .lastUsedAt(now)
                .build();
        refreshTokenRepository.save(entity);
        return new CreatedRefreshToken(rawToken, entity);
    }

    private IssuedTokens toIssuedTokens(AuthUser user, String accessToken, String refreshToken) {
        return new IssuedTokens(
                accessToken,
                refreshToken,
                jwtTokenService.getAccessTokenExpirationSeconds(),
                refreshTokenExpirationDays * 24L * 60L * 60L,
                user.getId());
    }

    private String generateRawRefreshToken() {
        byte[] randomBytes = new byte[48];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String hashToken(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash refresh token", exception);
        }
    }

    private String extractBearerToken(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader)) {
            return null;
        }

        String prefix = "Bearer ";
        if (!authorizationHeader.startsWith(prefix)) {
            return null;
        }

        String token = authorizationHeader.substring(prefix.length()).trim();
        return StringUtils.hasText(token) ? token : null;
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
    }

    private record CreatedRefreshToken(String rawToken, AuthRefreshToken entity) {
    }

    public record IssuedTokens(
            String accessToken,
            String refreshToken,
            long accessTokenExpiresInSeconds,
            long refreshTokenExpiresInSeconds,
            String userId) {
    }
}