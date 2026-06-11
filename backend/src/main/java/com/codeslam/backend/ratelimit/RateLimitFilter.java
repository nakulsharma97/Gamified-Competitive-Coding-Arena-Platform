package com.codeslam.backend.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitProperties properties;
    private final RateLimitService rateLimitService;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public RateLimitFilter(RateLimitProperties properties, RateLimitService rateLimitService) {
        this.properties = properties;
        this.rateLimitService = rateLimitService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !properties.isEnabled() || HttpMethod.OPTIONS.matches(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        RateLimitProperties.RouteLimit matchedLimit = findMatchedLimit(request);
        if (matchedLimit != null) {
            String clientIp = clientIp(request);
            String key = matchedLimit.getName() + "|" + clientIp;
            RateLimitDecision decision = rateLimitService.tryConsume(key, matchedLimit.getCapacity(),
                    matchedLimit.getRefillTokens(), matchedLimit.getRefillPeriod());

            if (!decision.allowed()) {
                writeTooManyRequests(response, matchedLimit.getName(), decision.retryAfterSeconds());
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private RateLimitProperties.RouteLimit findMatchedLimit(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        List<RateLimitProperties.RouteLimit> routes = properties.getRoutes();
        for (RateLimitProperties.RouteLimit route : routes) {
            if (!StringUtils.hasText(route.getPath()) || route.getMethods().isEmpty()) {
                continue;
            }

            boolean methodMatches = route.getMethods().stream()
                    .filter(StringUtils::hasText)
                    .map(value -> value.toUpperCase(Locale.ROOT))
                    .anyMatch(value -> value.equals(method.toUpperCase(Locale.ROOT)));
            if (!methodMatches) {
                continue;
            }

            if (pathMatcher.match(route.getPath(), path)) {
                return route;
            }
        }

        return null;
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            String[] parts = forwardedFor.split(",");
            if (parts.length > 0 && StringUtils.hasText(parts[0])) {
                return parts[0].trim();
            }
        }

        String realIp = request.getHeader("X-Real-IP");
        if (StringUtils.hasText(realIp)) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }

    private void writeTooManyRequests(HttpServletResponse response, String scope, long retryAfterSeconds)
            throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", Long.toString(Math.max(1L, retryAfterSeconds)));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"rate_limited\",\"scope\":\"" + scope +
                "\",\"retryAfterSeconds\":" + Math.max(1L, retryAfterSeconds) + "}");
    }
}