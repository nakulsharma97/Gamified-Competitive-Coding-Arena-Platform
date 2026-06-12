package com.codeslam.backend.auth.security;

import com.codeslam.backend.auth.Role;
import com.codeslam.backend.auth.repository.AuthUserRepository;
import com.codeslam.backend.auth.service.JwtTokenService;
import com.codeslam.backend.auth.service.AuthTokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final AuthUserRepository authUserRepository;
    private final JwtTokenService jwtTokenService;
    private final AuthTokenService authTokenService;

    public JwtAuthenticationFilter(AuthUserRepository authUserRepository, JwtTokenService jwtTokenService,
            AuthTokenService authTokenService) {
        this.authUserRepository = authUserRepository;
        this.jwtTokenService = jwtTokenService;
        this.authTokenService = authTokenService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/api/auth/");
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
            Jws<Claims> claims = jwtTokenService.parseToken(token);
            String subject = claims.getPayload().getSubject();
            String tokenType = claims.getPayload().get("tokenType", String.class);
            Number tokenVersionClaim = claims.getPayload().get("tokenVersion", Number.class);
            String jti = claims.getPayload().getId();

            if (!"access".equals(tokenType) || tokenVersionClaim == null || !StringUtils.hasText(jti)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid authentication token");
                return;
            }

            var user = authUserRepository.findById(subject)
                    .orElse(null);

            if (user == null || !Boolean.TRUE.equals(user.getEnabled())) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid authentication token");
                return;
            }

            long currentTokenVersion = user.getTokenVersion() == null ? 0L : user.getTokenVersion();
            if (currentTokenVersion != tokenVersionClaim.longValue()
                    || authTokenService.isAccessTokenBlacklisted(jti)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid authentication token");
                return;
            }

            Role role = user.getRole() == null ? Role.USER : user.getRole();
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    user.getId().toString(),
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (Exception exception) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid authentication token");
        }
    }
}
