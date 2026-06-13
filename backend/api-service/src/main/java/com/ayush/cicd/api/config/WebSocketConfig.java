package com.ayush.cicd.api.config;

import com.ayush.cicd.api.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration with STOMP protocol support.
 *
 * Clients connect via:
 * SockJS fallback: /stomp
 * Native WS: ws://host/stomp/websocket
 *
 * Topic destinations:
 * /topic/repository/{repoId} — pipeline events for a specific repo
 * /topic/global — platform-wide broadcasts (optional)
 *
 * App destinations (client → server):
 * /app/ping — health check
 */
@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final WebSocketProperties properties;

    // ─── Broker ──────────────────────────────────────────────────────────────

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In-memory broker for topics and queues
        registry.enableSimpleBroker("/topic", "/queue");

        // Prefix for messages routed to @MessageMapping methods
        registry.setApplicationDestinationPrefixes("/app");

        // Prefix for user-specific queues (/user/{userId}/queue/...)
        registry.setUserDestinationPrefix("/user");
    }

    // ─── STOMP Endpoint ──────────────────────────────────────────────────────

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/stomp")
                // Allow your React frontend origin(s)
                .setAllowedOriginPatterns(properties.getAllowedOrigins().split(","))
                // SockJS fallback for browsers that don't support native WS
                .withSockJS();
    }

    // ─── JWT Authentication on STOMP CONNECT ─────────────────────────────────

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor == null)
                    return message;

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Expect: Authorization: Bearer <token> in STOMP CONNECT headers
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);
                        try {
                            String username = jwtService.extractUsername(token);
                            if (StringUtils.hasText(username) && jwtService.validateToken(token)) {
                                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                        username, null,
                                        jwtService.extractAuthoritiesFromToken(token));
                                SecurityContextHolder.getContext().setAuthentication(auth);
                                accessor.setUser(auth);
                                log.debug("WS authenticated: {}", username);
                            }
                        } catch (Exception ex) {
                            log.warn("WS JWT validation failed: {}", ex.getMessage());
                        }
                    }
                }
                return message;
            }
        });
    }
}