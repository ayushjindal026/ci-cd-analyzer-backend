package com.ayush.cicd.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "websocket")
public class WebSocketProperties {

    /**
     * Comma-separated origins.
     *
     * Example:
     * http://localhost:3000,http://localhost:5173
     */
    private String allowedOrigins = "http://localhost:3000";
}