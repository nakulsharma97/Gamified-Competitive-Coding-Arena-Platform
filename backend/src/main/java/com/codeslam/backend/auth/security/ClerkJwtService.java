package com.codeslam.backend.auth.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import java.net.MalformedURLException;
import java.net.URL;
import java.time.Instant;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ClerkJwtService {

    private final ConfigurableJWTProcessor<SecurityContext> jwtProcessor;

    public ClerkJwtService(@Value("${clerk.jwks-url}") String clerkJwksUrl) {
        this.jwtProcessor = createJwtProcessor(clerkJwksUrl);
    }

    public ClerkJwt parseToken(String token) throws Exception {
        String resolvedToken = normalizeBearerToken(token);
        if (!StringUtils.hasText(resolvedToken)) {
            throw new IllegalArgumentException("Missing Clerk token");
        }

        SignedJWT signedJWT = SignedJWT.parse(resolvedToken);
        JWTClaimsSet claimsSet = jwtProcessor.process(signedJWT, null);

        if (!StringUtils.hasText(claimsSet.getSubject()) || !isTokenTimeValid(claimsSet)) {
            throw new IllegalArgumentException("Invalid Clerk token");
        }

        return new ClerkJwt(claimsSet.getSubject(), claimsSet);
    }

    private ConfigurableJWTProcessor<SecurityContext> createJwtProcessor(String clerkJwksUrl) {
        try {
            URL jwksUrl = new URL(clerkJwksUrl);
            JWKSource<SecurityContext> jwkSource = new RemoteJWKSet<>(jwksUrl);
            JWSKeySelector<SecurityContext> keySelector = new JWSVerificationKeySelector<>(JWSAlgorithm.RS256,
                    jwkSource);
            DefaultJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSKeySelector(keySelector);
            return processor;
        } catch (MalformedURLException exception) {
            throw new IllegalStateException("Invalid Clerk JWKS URL", exception);
        }
    }

    private String normalizeBearerToken(String token) {
        if (!StringUtils.hasText(token)) {
            return null;
        }

        String resolved = token.trim();
        if (resolved.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return resolved.substring(7).trim();
        }
        return resolved;
    }

    private boolean isTokenTimeValid(JWTClaimsSet claimsSet) {
        if (claimsSet.getExpirationTime() == null) {
            return false;
        }

        Instant now = Instant.now();
        if (claimsSet.getExpirationTime().toInstant().isBefore(now)) {
            return false;
        }

        return claimsSet.getNotBeforeTime() == null || !claimsSet.getNotBeforeTime().toInstant().isAfter(now);
    }

    public record ClerkJwt(String subject, JWTClaimsSet claimsSet) {
    }
}
