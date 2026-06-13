package com.ayush.cicd.api.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;

import com.ayush.cicd.common.websocket.PipelineEvent;

import java.security.Principal;
import java.time.Instant;

/**
 * Handles STOMP application-level messages (client → server → broker).
 *
 * Client sends to /app/ping → server echoes back to /topic/pong
 * Client subscribes to /app/repository/{id} → server sends a CONNECTED ack
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class WebSocketController {

    /**
     * Simple ping/pong to verify the connection is alive.
     * Client: stompClient.publish({ destination: '/app/ping' })
     * Server: broadcasts to /topic/pong
     */
    @MessageMapping("/ping")
    @SendTo("/topic/pong")
    public String ping(Principal principal) {
        String user = principal != null ? principal.getName() : "anonymous";
        log.debug("WS ping from {}", user);
        return "{\"pong\": true, \"ts\": \"" + Instant.now() + "\"}";
    }

    /**
     * When a client first subscribes to /app/repository/{id},
     * it immediately receives a CONNECTED ack so it knows the subscription
     * succeeded.
     *
     * Client: stompClient.subscribe('/app/repository/42', handler)
     */
    @SubscribeMapping("/repository/{repoId}")
    public PipelineEvent onSubscribe(@DestinationVariable Long repoId, Principal principal) {
        log.info("WS subscription: repo={} user={}", repoId,
                principal != null ? principal.getName() : "anonymous");
        return PipelineEvent.builder()
                .eventType("CONNECTED")
                .repositoryId(repoId)
                .build();
    }
}