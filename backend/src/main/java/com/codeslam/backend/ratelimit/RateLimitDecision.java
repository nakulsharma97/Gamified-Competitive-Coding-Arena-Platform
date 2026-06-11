package com.codeslam.backend.ratelimit;

public record RateLimitDecision(boolean allowed, long retryAfterSeconds) {

    public static RateLimitDecision allow() {
        return new RateLimitDecision(true, 0L);
    }

    public static RateLimitDecision deny(long retryAfterSeconds) {
        return new RateLimitDecision(false, Math.max(0L, retryAfterSeconds));
    }
}