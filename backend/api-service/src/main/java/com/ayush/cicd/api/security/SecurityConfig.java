package com.ayush.cicd.api.security;

import lombok.RequiredArgsConstructor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;

import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Security Configuration
 *
 * Supports:
 * - GitHub OAuth2 Login
 * - JWT Authentication
 * - Swagger/OpenAPI
 * - React frontend (Vite/CRA)
 *
 * WHY IF_REQUIRED INSTEAD OF STATELESS?
 * OAuth2 login requires HTTP session persistence.
 * After successful GitHub authentication, Spring Security
 * stores the authenticated user inside the session.
 *
 * STATELESS breaks OAuth because authentication disappears
 * immediately after redirect.
 *
 * IF_REQUIRED allows:
 * - OAuth session support
 * - JWT support simultaneously
 *
 * This is a hybrid authentication architecture.
 */

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        @Bean
        public SecurityFilterChain securityFilterChain(
                        HttpSecurity http) throws Exception {

                return http

                                // ─────────────────────────────────────────────────────────────
                                // CSRF
                                // ─────────────────────────────────────────────────────────────

                                .csrf(AbstractHttpConfigurer::disable)

                                // ─────────────────────────────────────────────────────────────
                                // CORS
                                // ─────────────────────────────────────────────────────────────

                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                                // ─────────────────────────────────────────────────────────────
                                // SESSION MANAGEMENT
                                // IMPORTANT:
                                // OAuth2 REQUIRES SESSION
                                // ─────────────────────────────────────────────────────────────

                                .sessionManagement(session -> session.sessionCreationPolicy(
                                                SessionCreationPolicy.STATELESS))

                                // ─────────────────────────────────────────────────────────────
                                // AUTHORIZATION RULES
                                // ─────────────────────────────────────────────────────────────

                                .authorizeHttpRequests(auth -> auth

                                                .requestMatchers(

                                                                // AUTH
                                                                "/api/v1/auth/**",

                                                                // OAUTH
                                                                "/oauth2/**",
                                                                "/login/**",

                                                                // SWAGGER
                                                                "/swagger-ui/**",
                                                                "/swagger-ui.html",
                                                                "/v3/api-docs/**",
                                                                "/webjars/**",

                                                                // ACTUATOR
                                                                "/actuator/**"

                                                ).permitAll()

                                                .anyRequest().authenticated())

                                // ─────────────────────────────────────────────────────────────
                                // OAUTH2 LOGIN
                                // ─────────────────────────────────────────────────────────────
                                // ─────────────────────────────────────────────────────────────
                                // JWT FILTER
                                // ─────────────────────────────────────────────────────────────

                                .addFilterBefore(
                                                jwtAuthenticationFilter,
                                                UsernamePasswordAuthenticationFilter.class)

                                .build();
        }

        // ─────────────────────────────────────────────────────────────────────────
        // CORS CONFIGURATION
        // ─────────────────────────────────────────────────────────────────────────

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {

                CorsConfiguration config = new CorsConfiguration();

                // IMPORTANT:
                // "*" cannot be used with credentials=true

                config.setAllowedOrigins(List.of(

                                // Vite
                                "http://localhost:5173",

                                // React CRA
                                "http://localhost:3000",

                                // Backend self-origin
                                "http://localhost:8081"));

                config.setAllowedMethods(List.of(
                                "GET",
                                "POST",
                                "PUT",
                                "DELETE",
                                "OPTIONS"));

                config.setAllowedHeaders(List.of("*"));

                config.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                source.registerCorsConfiguration(
                                "/**",
                                config);

                return source;
        }
}