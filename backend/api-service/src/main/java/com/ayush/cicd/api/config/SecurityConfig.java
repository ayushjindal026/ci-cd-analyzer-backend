package com.ayush.cicd.api.config;

import com.ayush.cicd.api.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        @Value("${frontend.url:http://localhost:3000}")
        private String frontendUrl;

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

                return http

                                /*
                                 * CSRF
                                 * Disable globally for stateless JWT APIs
                                 * OR ignore only webhook + websocket endpoints
                                 */
                                .csrf(csrf -> csrf.ignoringRequestMatchers(
                                                "/stomp/**",
                                                "/ws/**",
                                                "/api/v1/webhook/**"))

                                /*
                                 * CORS
                                 */
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                                /*
                                 * Stateless Session
                                 */
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                                /*
                                 * Authorization Rules
                                 */
                                .authorizeHttpRequests(auth -> auth

                                                /*
                                                 * Public GET endpoints
                                                 */
                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/api/v1/health",
                                                                "/actuator/health")
                                                .permitAll()

                                                /*
                                                 * Public endpoints
                                                 */
                                                .requestMatchers(
                                                                "/api/v1/auth/**",
                                                                "/api/v1/webhook/**",

                                                                // WebSocket / SockJS
                                                                "/stomp/**",
                                                                "/ws/**",

                                                                // Swagger
                                                                "/swagger-ui/**",
                                                                "/swagger-ui.html",
                                                                "/v3/api-docs/**")
                                                .permitAll()

                                                /*
                                                 * Everything else secured
                                                 */
                                                .anyRequest().authenticated())

                                /*
                                 * JWT Filter
                                 */
                                .addFilterBefore(
                                                jwtAuthenticationFilter,
                                                UsernamePasswordAuthenticationFilter.class)

                                .build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {

                CorsConfiguration config = new CorsConfiguration();

                /*
                 * Allowed Origins
                 */
                config.setAllowedOrigins(List.of(
                                frontendUrl,
                                "http://localhost:3000",
                                "http://localhost:5173"));

                /*
                 * Allowed Methods
                 */
                config.setAllowedMethods(List.of(
                                "GET",
                                "POST",
                                "PUT",
                                "DELETE",
                                "PATCH",
                                "OPTIONS"));

                /*
                 * Allowed Headers
                 */
                config.setAllowedHeaders(List.of("*"));

                /*
                 * Exposed Headers
                 */
                config.setExposedHeaders(List.of(
                                "Authorization",
                                "Content-Type"));

                /*
                 * Credentials
                 */
                config.setAllowCredentials(true);

                /*
                 * Cache preflight response
                 */
                config.setMaxAge(3600L);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                source.registerCorsConfiguration("/**", config);

                return source;
        }
}