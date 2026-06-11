package com.codeslam.backend.websocket.security;

import java.util.Map;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class WebSocketChannelInterceptor implements ChannelInterceptor {

    private static final String TOKEN_ATTRIBUTE = "wsAuthToken";

    private final WebSocketSecurityService webSocketSecurityService;

    public WebSocketChannelInterceptor(WebSocketSecurityService webSocketSecurityService) {
        this.webSocketSecurityService = webSocketSecurityService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (accessor.getCommand() == StompCommand.CONNECT) {
            handleConnect(accessor);
            return message;
        }

        if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
            webSocketSecurityService.authorizeSubscribe(accessor.getDestination(), currentAuthentication(accessor));
            return message;
        }

        if (accessor.getCommand() == StompCommand.SEND) {
            webSocketSecurityService.authorizeSend(accessor.getDestination(), currentAuthentication(accessor));
            return message;
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        Authentication existingAuthentication = currentAuthentication(accessor);
        if (existingAuthentication != null && existingAuthentication.isAuthenticated()) {
            webSocketSecurityService.authorizeConnect(existingAuthentication);
            return;
        }

        String token = webSocketSecurityService.resolveSubscriptionToken(
                accessor.getFirstNativeHeader("Authorization"),
                sessionAttribute(accessor, TOKEN_ATTRIBUTE));
        Authentication authentication = webSocketSecurityService.authenticate(token);
        accessor.setUser(authentication);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private Authentication currentAuthentication(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof Authentication authentication) {
            return authentication;
        }

        return null;
    }

    private String sessionAttribute(StompHeaderAccessor accessor, String key) {
        Map<String, Object> attributes = accessor.getSessionAttributes();
        Object value = attributes == null ? null : attributes.get(key);
        return value instanceof String stringValue ? stringValue : null;
    }
}