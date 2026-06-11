package com.codeslam.backend.websocket.security;

import com.codeslam.backend.entity.User;
import com.codeslam.backend.service.MatchStateService;
import com.codeslam.backend.service.UserService;
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
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class WebSocketSecurityService {

    private static final List<String> PUBLIC_SUBSCRIPTIONS = List.of("/topic/public.events", "/topic/leaderboard");

    private final UserService userService;
    private final MatchStateService matchStateService;
    private final ConfigurableJWTProcessor<SecurityContext> jwtProcessor;

    public WebSocketSecurityService(UserService userService, MatchStateService matchStateService,
            @Value("${clerk.jwks-url}") String clerkJwksUrl) {
        this.userService = userService;
        this.matchStateService = matchStateService;
        this.jwtProcessor = createJwtProcessor(clerkJwksUrl);
    }

    public Authentication authenticate(String token) {
        String resolvedToken = normalizeBearerToken(token);
        if (!StringUtils.hasText(resolvedToken)) {
            throw new AccessDeniedException("WebSocket authentication token is missing");
        }

        try {
            SignedJWT signedJWT = SignedJWT.parse(resolvedToken);
            JWTClaimsSet claimsSet = jwtProcessor.process(signedJWT, null);
            String clerkId = claimsSet.getSubject();
            if (!StringUtils.hasText(clerkId)) {
                throw new AccessDeniedException("WebSocket token is missing a subject");
            }

            if (!isTokenTimeValid(claimsSet)) {
                throw new AccessDeniedException("WebSocket token has expired");
            }

            User user = userService.getOrCreateUserByClerkId(clerkId);
            return new UsernamePasswordAuthenticationToken(user.getClerkId(), null,
                    List.of(new SimpleGrantedAuthority("ROLE_USER")));
        } catch (AccessDeniedException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new AccessDeniedException("Invalid WebSocket token");
        }
    }

    public void authorizeConnect(Authentication authentication) {
        requireAuthenticated(authentication);
    }

    public void authorizeSend(String destination, Authentication authentication) {
        requireAuthenticated(authentication);
        if (!StringUtils.hasText(destination) || !destination.startsWith("/app/")) {
            throw new AccessDeniedException("Publishing to broker destinations is not allowed");
        }
    }

    public void authorizeSubscribe(String destination, Authentication authentication) {
        requireAuthenticated(authentication);

        if (!StringUtils.hasText(destination)) {
            throw new AccessDeniedException("Missing subscription destination");
        }

        if (isPublicSubscription(destination) || destination.startsWith("/user/queue/")) {
            return;
        }

        if (isBattleRoomDestination(destination)) {
            String matchId = extractMatchId(destination);
            String clerkId = principalName(authentication);
            if (!isMatchParticipant(matchId, clerkId)) {
                throw new AccessDeniedException("Subscription is not allowed for this match");
            }
            return;
        }

        throw new AccessDeniedException("Subscription destination is not allowed");
    }

    public String resolveSubscriptionToken(String tokenFromHeader, String tokenFromSession) {
        if (StringUtils.hasText(tokenFromHeader)) {
            return tokenFromHeader.trim();
        }

        if (StringUtils.hasText(tokenFromSession)) {
            return tokenFromSession.trim();
        }

        return null;
    }

    public boolean isPublicSubscription(String destination) {
        return PUBLIC_SUBSCRIPTIONS.contains(destination);
    }

    public boolean isBattleRoomDestination(String destination) {
        return destination.startsWith("/topic/rooms/") || destination.startsWith("/topic/matches/");
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

    private void requireAuthenticated(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || !StringUtils.hasText(authentication.getName())) {
            throw new AccessDeniedException("WebSocket connection is not authenticated");
        }
    }

    private String principalName(Authentication authentication) {
        requireAuthenticated(authentication);
        return authentication.getName();
    }

    private boolean isMatchParticipant(String matchId, String clerkId) {
        User user = userService.getUserByClerkId(clerkId);
        MatchStateService.MatchState state = matchStateService.getMatchState(matchId);
        return Objects.equals(state.player1Id(), user.getId()) || Objects.equals(state.player2Id(), user.getId());
    }

    private String extractMatchId(String destination) {
        String prefix = destination.startsWith("/topic/rooms/") ? "/topic/rooms/" : "/topic/matches/";
        String remainder = destination.substring(prefix.length());
        int separator = remainder.indexOf('/');
        return separator < 0 ? remainder : remainder.substring(0, separator);
    }

    private String normalizeBearerToken(String token) {
        if (!StringUtils.hasText(token)) {
            return null;
        }

        String resolved = token.trim();
        if (resolved.toLowerCase(Locale.ROOT).startsWith("bearer ")) {
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
}