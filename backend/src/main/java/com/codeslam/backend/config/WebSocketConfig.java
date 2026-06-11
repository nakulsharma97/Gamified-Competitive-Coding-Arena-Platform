package com.codeslam.backend.config;

import com.codeslam.backend.websocket.security.WebSocketChannelInterceptor;
import com.codeslam.backend.websocket.security.WebSocketHandshakeInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final String frontendUrl;
    private final WebSocketHandshakeInterceptor handshakeInterceptor;
    private final WebSocketChannelInterceptor channelInterceptor;

    public WebSocketConfig(@Value("${app.frontend-url}") String frontendUrl,
            WebSocketHandshakeInterceptor handshakeInterceptor,
            WebSocketChannelInterceptor channelInterceptor) {
        this.frontendUrl = frontendUrl;
        this.handshakeInterceptor = handshakeInterceptor;
        this.channelInterceptor = channelInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setUserDestinationPrefix("/user");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(channelInterceptor);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .addInterceptors(handshakeInterceptor)
                .setAllowedOrigins(frontendUrl)
                .withSockJS();
    }
}