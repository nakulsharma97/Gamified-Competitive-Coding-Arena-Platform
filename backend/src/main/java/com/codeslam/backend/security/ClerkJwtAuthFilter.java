package com.codeslam.backend.security;

import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.Plan;
import com.codeslam.backend.enums.RankTier;
import com.codeslam.backend.repository.UserRepository;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import com.nimbusds.jwt.SignedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class ClerkJwtAuthFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;
    private final ConfigurableJWTProcessor<SecurityContext> jwtProcessor;

    public ClerkJwtAuthFilter(UserRepository userRepository,
            @org.springframework.beans.factory.annotation.Value("${clerk.jwks-url}") String clerkJwksUrl) {
        this.userRepository = userRepository;
        this.jwtProcessor = createJwtProcessor(clerkJwksUrl);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authorizationHeader.substring(7).trim();
        if (!StringUtils.hasText(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            JWTClaimsSet claimsSet = jwtProcessor.process(signedJWT, null);
            String clerkId = claimsSet.getSubject();
            if (!StringUtils.hasText(clerkId)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing Clerk subject");
                return;
            }

            if (!isTokenTimeValid(claimsSet)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Expired Clerk JWT");
                return;
            }

            User user = getOrCreateUser(clerkId);
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(user.getClerkId(), null, List.of()));
            filterChain.doFilter(request, response);
        } catch (Exception exception) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Clerk JWT");
        }
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

    private User getOrCreateUser(String clerkId) {
        Optional<User> existingUser = userRepository.findByClerkId(clerkId);
        if (existingUser.isPresent()) {
            return existingUser.get();
        }

        User user = User.builder()
                .clerkId(clerkId)
                .email(buildPlaceholderEmail(clerkId))
                .username(buildPlaceholderUsername(clerkId))
                .eloRating(1000)
                .rank(RankTier.BRONZE)
                .plan(Plan.FREE)
                .onboardingComplete(Boolean.FALSE)
                .build();

        try {
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            return userRepository.findByClerkId(clerkId)
                    .orElseThrow(() -> exception);
        }
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

    private String buildPlaceholderEmail(String clerkId) {
        return "clerk-" + normalizeIdentifier(clerkId) + "@clerk.local";
    }

    private String buildPlaceholderUsername(String clerkId) {
        String identifier = normalizeIdentifier(clerkId);
        String username = "clerk-" + identifier;
        return username.length() <= 50 ? username : username.substring(0, 50);
    }

    private String normalizeIdentifier(String value) {
        return value == null ? UUID.randomUUID().toString().replace("-", "")
                : value.toLowerCase().replaceAll("[^a-z0-9]+", "-");
    }
}