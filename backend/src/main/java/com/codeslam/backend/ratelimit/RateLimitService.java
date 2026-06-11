package com.codeslam.backend.ratelimit;

import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;

@Service
public class RateLimitService {

    private final Map<String, TokenBucketState> tokenBuckets = new ConcurrentHashMap<>();
    private final RateLimitProperties properties;
    private final AtomicLong lastCleanupEpochMs = new AtomicLong(0L);

    public RateLimitService(RateLimitProperties properties) {
        this.properties = properties;
    }

    public RateLimitDecision tryConsume(String key, int capacity, int refillTokens, Duration refillPeriod) {
        if (!properties.isEnabled()) {
            return RateLimitDecision.allow();
        }

        if (capacity <= 0 || refillTokens <= 0 || refillPeriod == null || refillPeriod.isZero()
                || refillPeriod.isNegative()) {
            return RateLimitDecision.allow();
        }

        maybeCleanup();

        TokenBucketState state = tokenBuckets.computeIfAbsent(key, ignored -> new TokenBucketState(capacity,
                refillTokens, refillPeriod.toMillis(), Instant.now().toEpochMilli()));

        synchronized (state) {
            long now = Instant.now().toEpochMilli();
            state.lastAccessEpochMs = now;

            double refillPerMillisecond = (double) refillTokens / (double) refillPeriod.toMillis();
            if (refillPerMillisecond > 0.0d) {
                double elapsed = Math.max(0L, now - state.lastRefillEpochMs);
                state.tokens = Math.min(capacity, state.tokens + (elapsed * refillPerMillisecond));
                state.lastRefillEpochMs = now;
            }

            if (state.tokens >= 1.0d) {
                state.tokens -= 1.0d;
                return RateLimitDecision.allow();
            }

            long retryAfterSeconds = retryAfterSeconds(state.tokens, refillTokens, refillPeriod);
            return RateLimitDecision.deny(retryAfterSeconds);
        }
    }

    public void reset(String key) {
        tokenBuckets.remove(key);
    }

    private long retryAfterSeconds(double tokens, int refillTokens, Duration refillPeriod) {
        double refillPerMillisecond = (double) refillTokens / (double) refillPeriod.toMillis();
        if (refillPerMillisecond <= 0.0d) {
            return 1L;
        }

        double deficit = 1.0d - tokens;
        long retryAfterMillis = (long) Math.ceil(deficit / refillPerMillisecond);
        return Math.max(1L, (long) Math.ceil(retryAfterMillis / 1000.0d));
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
        int maxEntries = properties.getCleanup().getMaxEntries();
        if (tokenBuckets.size() <= maxEntries) {
            removeStaleEntries(now, staleAfterMs);
            return;
        }

        removeStaleEntries(now, staleAfterMs);
    }

    private void removeStaleEntries(long now, long staleAfterMs) {
        Iterator<Map.Entry<String, TokenBucketState>> iterator = tokenBuckets.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, TokenBucketState> entry = iterator.next();
            TokenBucketState state = entry.getValue();
            if (state == null || now - state.lastAccessEpochMs > staleAfterMs) {
                iterator.remove();
            }
        }
    }

    private static final class TokenBucketState {
        private double tokens;
        private long lastRefillEpochMs;
        private long lastAccessEpochMs;

        private TokenBucketState(int capacity, int refillTokens, long refillPeriodMs, long now) {
            this.tokens = capacity;
            this.lastRefillEpochMs = now;
            this.lastAccessEpochMs = now;
        }
    }
}