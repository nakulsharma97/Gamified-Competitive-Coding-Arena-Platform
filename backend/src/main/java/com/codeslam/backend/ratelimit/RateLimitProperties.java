package com.codeslam.backend.ratelimit;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.rate-limit")
public class RateLimitProperties {

    private boolean enabled = true;
    private final List<RouteLimit> routes = new ArrayList<>();
    private final Login login = new Login();
    private final Cleanup cleanup = new Cleanup();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public List<RouteLimit> getRoutes() {
        return routes;
    }

    public Login getLogin() {
        return login;
    }

    public Cleanup getCleanup() {
        return cleanup;
    }

    public static class RouteLimit {
        private String name;
        private String path;
        private List<String> methods = new ArrayList<>();
        private int capacity = 60;
        private int refillTokens = 60;
        private Duration refillPeriod = Duration.ofMinutes(1);

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getPath() {
            return path;
        }

        public void setPath(String path) {
            this.path = path;
        }

        public List<String> getMethods() {
            return methods;
        }

        public void setMethods(List<String> methods) {
            this.methods = methods == null ? new ArrayList<>() : new ArrayList<>(methods);
        }

        public int getCapacity() {
            return capacity;
        }

        public void setCapacity(int capacity) {
            this.capacity = capacity;
        }

        public int getRefillTokens() {
            return refillTokens;
        }

        public void setRefillTokens(int refillTokens) {
            this.refillTokens = refillTokens;
        }

        public Duration getRefillPeriod() {
            return refillPeriod;
        }

        public void setRefillPeriod(Duration refillPeriod) {
            this.refillPeriod = refillPeriod;
        }
    }

    public static class Login {
        private int blockAfterFailures = 5;
        private Duration baseDelay = Duration.ofSeconds(2);
        private Duration maxDelay = Duration.ofMinutes(2);
        private Duration blockDuration = Duration.ofMinutes(15);

        public int getBlockAfterFailures() {
            return blockAfterFailures;
        }

        public void setBlockAfterFailures(int blockAfterFailures) {
            this.blockAfterFailures = blockAfterFailures;
        }

        public Duration getBaseDelay() {
            return baseDelay;
        }

        public void setBaseDelay(Duration baseDelay) {
            this.baseDelay = baseDelay;
        }

        public Duration getMaxDelay() {
            return maxDelay;
        }

        public void setMaxDelay(Duration maxDelay) {
            this.maxDelay = maxDelay;
        }

        public Duration getBlockDuration() {
            return blockDuration;
        }

        public void setBlockDuration(Duration blockDuration) {
            this.blockDuration = blockDuration;
        }
    }

    public static class Cleanup {
        private Duration staleAfter = Duration.ofHours(6);
        private int maxEntries = 20000;

        public Duration getStaleAfter() {
            return staleAfter;
        }

        public void setStaleAfter(Duration staleAfter) {
            this.staleAfter = staleAfter;
        }

        public int getMaxEntries() {
            return maxEntries;
        }

        public void setMaxEntries(int maxEntries) {
            this.maxEntries = maxEntries;
        }
    }
}