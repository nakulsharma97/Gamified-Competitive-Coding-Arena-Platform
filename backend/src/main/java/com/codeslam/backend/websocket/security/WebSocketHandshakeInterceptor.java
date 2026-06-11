package com.codeslam.backend.websocket.security;

import java.net.URI;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    private final String allowedOrigin;

    public WebSocketHandshakeInterceptor(@Value("${app.frontend-url}") String allowedOrigin) {
        this.allowedOrigin = normalizeOrigin(allowedOrigin);
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        String origin = request.getHeaders().getOrigin();
        if (!isAllowedOrigin(origin)) {
            return false;
        }

        String token = firstText(
                request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION),
                UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("access_token"));
        if (StringUtils.hasText(token)) {
            attributes.put("wsAuthToken", token.trim());
        }

        attributes.put("wsOrigin", origin);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Exception exception) {
        // No-op.
    }

    private boolean isAllowedOrigin(String origin) {
        if (!StringUtils.hasText(origin)) {
            return false;
        }

        return normalizeOrigin(origin).equalsIgnoreCase(allowedOrigin);
    }

    private String normalizeOrigin(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        URI uri = URI.create(value.trim());
        int port = uri.getPort();
        String normalizedPort = port < 0 ? "" : ":" + port;
        return uri.getScheme().toLowerCase(Locale.ROOT) + "://" + uri.getHost().toLowerCase(Locale.ROOT)
                + normalizedPort;
    }

    private String firstText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }
}