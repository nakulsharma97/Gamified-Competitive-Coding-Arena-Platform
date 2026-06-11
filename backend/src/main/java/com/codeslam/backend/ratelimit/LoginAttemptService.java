package com.codeslam.backend.ratelimit;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class LoginAttemptService {

    private final Map<String, LoginAttemptState> states = new ConcurrentHashMap<>();
    private final RateLimitProperties properties;
    private final AtomicLong lastCleanupEpochMs = new AtomicLong(0L);

    public LoginAttemptService(RateLimitProperties properties) {
        this.properties = properties;
    }

    public void assertAllowed(String clientIp, String identifier) {
        if (!properties.isEnabled()) {
            return;
        }

        String key = buildKey(clientIp, identifier);
        LoginAttemptState state = states.get(key);
        if (state == null) {
            return;
        }

        synchronized (state) {
            long now = Instant.now().toEpochMilli();
            state.lastAccessEpochMs = now;
            if (state.blockedUntilEpochMs > now) {
                throw new RateLimitExceededException("Login temporarily blocked",
                        secondsUntil(state.blockedUntilEpochMs, now));
            }

            if (state.cooldownUntilEpochMs > now) {
                throw new RateLimitExceededException("Please wait before trying again",
                        secondsUntil(state.cooldownUntilEpochMs, now));
            }
        }
    }

    public void recordSuccess(String clientIp, String identifier) {
        if (!properties.isEnabled()) {
            return;
        }

        states.remove(buildKey(clientIp, identifier));
    }

    public void recordFailure(String clientIp, String identifier) {
        if (!properties.isEnabled()) {
            return;
        }

        String key = buildKey(clientIp, identifier);
        LoginAttemptState state = states.computeIfAbsent(key, ignored -> new LoginAttemptState());
        synchronized (state) {
            long now = Instant.now().toEpochMilli();
            state.lastAccessEpochMs = now;
            state.failureCount++;

            long delayMs = computeProgressiveDelayMs(state.failureCount);
            state.cooldownUntilEpochMs = Math.max(state.cooldownUntilEpochMs, now + delayMs);

            if (state.failureCount >= properties.getLogin().getBlockAfterFailures()) {
                long blockDurationMs = properties.getLogin().getBlockDuration().toMillis();
                state.blockedUntilEpochMs = Math.max(state.blockedUntilEpochMs, now + blockDurationMs);
                state.cooldownUntilEpochMs = Math.max(state.cooldownUntilEpochMs, state.blockedUntilEpochMs);
            }
        }

        maybeCleanup();
    }

    private long computeProgressiveDelayMs(int failureCount) {
        Duration baseDelay = properties.getLogin().getBaseDelay();
        Duration maxDelay = properties.getLogin().getMaxDelay();

        long baseMs = Math.max(0L, baseDelay.toMillis());
        long maxMs = Math.max(baseMs, maxDelay.toMillis());
        long exponentialDelay = baseMs * (1L << Math.max(0, failureCount - 1));
        return Math.min(maxMs, exponentialDelay);
    }

    private String buildKey(String clientIp, String identifier) {
        String normalizedIp = StringUtils.hasText(clientIp) ? clientIp.trim() : "unknown-ip";
        String normalizedIdentifier = StringUtils.hasText(identifier) ? identifier.trim().toLowerCase()
                : "unknown-user";
        return normalizedIp + "|" + normalizedIdentifier;
    }

    private long secondsUntil(long futureEpochMs, long nowEpochMs) {
        return Math.max(1L, (long) Math.ceil((futureEpochMs - nowEpochMs) / 1000.0d));
    }

    private void maybeCleanup() {
        long now = Instant.now().toEpochMilli();
        long lastCleanup = lastCleanupEpochMs.get();
        if (now - lastCleanup < 60_000L) {
            return;
        }

        if (!lastCleanupEpochMs.compareAndSet(lastCleanup, now)) {
            return;
        }

        long staleAfterMs = properties.getCleanup().getStaleAfter().toMillis();
        states.entrySet().removeIf(entry -> {
            LoginAttemptState state = entry.getValue();
            return state == null || now - state.lastAccessEpochMs > staleAfterMs;
        });
    }

    private static final class LoginAttemptState {
        private int failureCount;
        private long cooldownUntilEpochMs;
        private long blockedUntilEpochMs;
        private long lastAccessEpochMs;
    }
}