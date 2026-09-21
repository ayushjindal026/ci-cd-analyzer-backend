// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/security/JwtAuthenticationFilter.java

package com.ayush.cicd.api.security;

import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT authentication filter.
 *
 * RESPONSIBILITIES:
 * - Extract Bearer token
 * - Validate JWT signature + expiry
 * - Load authenticated user
 * - Populate Spring SecurityContext
 *
 * SECURITY MODEL:
 * Principal = full User entity
 *
 * WHY?
 * Allows:
 * 
 * @AuthenticationPrincipal User currentUser
 *
 *                          avoiding repeated DB lookups in
 *                          controllers/services.
 *
 *                          PERFORMANCE:
 *                          One DB lookup per request.
 *
 *                          FUTURE IMPROVEMENT:
 *                          Add short-lived Caffeine cache for user lookups.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    private final UserRepository userRepository;

    // ------------------------------------------------------------------------
    // Filter Logic
    // ------------------------------------------------------------------------

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String requestPath = request.getServletPath();

        boolean publicEndpoint =
                requestPath.equals("/api/v1/auth/github/login") ||
                requestPath.equals("/api/v1/auth/github/callback") ||
                requestPath.equals("/api/v1/auth/refresh") ||
                requestPath.startsWith("/oauth2") ||
                requestPath.startsWith("/login/oauth2") ||
                requestPath.startsWith("/swagger-ui") ||
                requestPath.startsWith("/v3/api-docs") ||
                requestPath.startsWith("/actuator");

        if (publicEndpoint) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = extractToken(request);

        if (!StringUtils.hasText(token)) {
            log.debug("No JWT token for request: {}", request.getRequestURI());
            filterChain.doFilter(request, response);
            return;
        }

        try {

            if (!jwtService.isTokenValid(token)) {
                log.debug("Invalid JWT token for request: {}", request.getRequestURI());
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {

                Long userId = jwtService.getUserId(token);

                User user = userRepository.findById(userId).orElse(null);

                if (user != null) {

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    user,
                                    null,
                                    List.of(new SimpleGrantedAuthority("ROLE_USER")));

                    authentication.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);

                    log.debug("Authenticated user={} path={}",
                            user.getUsername(), request.getRequestURI());

                } else {
                    log.debug("JWT valid but user not found. userId={}", userId);
                    SecurityContextHolder.clearContext();
                }
            }

        } catch (Exception e) {
            log.error("JWT authentication failed for request {}: {}",
                    request.getRequestURI(), e.getMessage());
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    private String extractToken(HttpServletRequest request) {

        String authorizationHeader = request.getHeader("Authorization");

        if (StringUtils.hasText(authorizationHeader)
                && authorizationHeader.startsWith("Bearer ")) {

            return authorizationHeader.substring(7);
        }

        return null;
    }
}