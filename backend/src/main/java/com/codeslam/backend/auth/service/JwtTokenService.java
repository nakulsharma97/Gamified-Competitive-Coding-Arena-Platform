package com.codeslam.backend.auth.service;

import com.codeslam.backend.auth.Role;
import com.codeslam.backend.auth.entity.AuthUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class JwtTokenService {

    private final SecretKey signingKey;
    private final String issuer;
    private final long accessTokenExpirationMinutes;
    private final long refreshTokenExpirationDays;

    public JwtTokenService(
            @Value("${auth.jwt.secret-base64}") String secretBase64,
            @Value("${auth.jwt.issuer}") String issuer,
            @Value("${auth.jwt.expiration-minutes:15}") long accessTokenExpirationMinutes,
            @Value("${auth.jwt.refresh-expiration-days:30}") long refreshTokenExpirationDays) {
        if (!StringUtils.hasText(secretBase64)) {
            throw new IllegalStateException("auth.jwt.secret-base64 must be configured");
        }

        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secretBase64);
        } catch (IllegalArgumentException exception) {
            keyBytes = secretBase64.getBytes(StandardCharsets.UTF_8);
        }

        if (keyBytes.length < 32) {
            throw new IllegalStateException("auth.jwt.secret-base64 must resolve to at least 256 bits");
        }

        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.issuer = issuer;
        this.accessTokenExpirationMinutes = accessTokenExpirationMinutes;
        this.refreshTokenExpirationDays = refreshTokenExpirationDays;
    }

    public String generateAccessToken(AuthUser user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(getAccessTokenExpirationSeconds());

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(user.getId().toString())
                .issuer(issuer)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claim("tokenType", "access")
                .claim("tokenVersion", user.getTokenVersion() == null ? 0L : user.getTokenVersion())
                .claim("username", user.getUsername())
                .claim("email", user.getEmail())
                .claim("role", user.getRole() == null ? Role.USER.name() : user.getRole().name())
                .signWith(signingKey)
                .compact();
    }

    public Jws<Claims> parseToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token);
    }

    public long getExpirationMinutes() {
        return accessTokenExpirationMinutes;
    }

    public long getAccessTokenExpirationSeconds() {
        return accessTokenExpirationMinutes * 60L;
    }

    public long getRefreshTokenExpirationSeconds() {
        return refreshTokenExpirationDays * 24L * 60L * 60L;
    }
}
