// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/auth/GitHubOAuthService.java

package com.ayush.cicd.api.auth;

import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpStatusCodeException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * GitHub OAuth service.
 *
 * RESPONSIBILITIES:
 * - Build GitHub OAuth authorization URL
 * - Exchange authorization code for GitHub access token
 * - Fetch GitHub user profile
 * - Upsert local User entity
 *
 * SECURITY:
 * - OAuth token exchange happens server-side only
 * - GitHub access token never exposed publicly
 * - User profile refreshed on every login
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubOAuthService {

        private final RestTemplate restTemplate;

        private final UserRepository userRepository;

        // ------------------------------------------------------------------------
        // OAuth Configuration
        // ------------------------------------------------------------------------

        @Value("${github.oauth.client-id}")
        private String clientId;

        @Value("${github.oauth.client-secret}")
        private String clientSecret;

        @Value("${github.oauth.redirect-uri}")
        private String redirectUri;

        // ------------------------------------------------------------------------
        // GitHub Endpoints
        // ------------------------------------------------------------------------

        private static final String GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

        private static final String GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

        private static final String GITHUB_USER_URL = "https://api.github.com/user";

        private static final String GITHUB_EMAIL_URL = "https://api.github.com/user/emails";

        // ------------------------------------------------------------------------
        // Step 1: Authorization URL
        // ------------------------------------------------------------------------

        public String buildAuthorizationUrl() {

                return GITHUB_AUTHORIZE_URL
                                + "?client_id="
                                + urlEncode(clientId)

                                + "&redirect_uri="
                                + urlEncode(redirectUri)

                                + "&scope="
                                + urlEncode("read:user user:email repo");
        }

        // ------------------------------------------------------------------------
        // Step 2: Handle OAuth Callback
        // ------------------------------------------------------------------------

        public User handleCallback(String code) {

                // --------------------------------------------------------------------
                // Exchange code for GitHub access token
                // --------------------------------------------------------------------

                String githubAccessToken = exchangeCodeForToken(code);

                // --------------------------------------------------------------------
                // Fetch GitHub profile
                // --------------------------------------------------------------------

                Map<String, Object> profile = fetchGitHubProfile(githubAccessToken);

                Long githubId = toLong(profile.get("id"));

                if (githubId == null) {

                        throw new IllegalStateException(
                                        "GitHub profile missing user id");
                }

                String username = (String) profile.get("login");

                String email = (String) profile.get("email");

                if (email == null || email.isBlank()) {

                        email = fetchPrimaryEmail(githubAccessToken);
                }

                String avatarUrl = (String) profile.get("avatar_url");

                // --------------------------------------------------------------------
                // Fallback email handling
                // --------------------------------------------------------------------

                if (email == null || email.isBlank()) {

                        email = username + "@github.local";
                }

                log.info(
                                "GitHub OAuth login successful for githubId={} username={}",
                                githubId,
                                username);

                // --------------------------------------------------------------------
                // Upsert local user
                // --------------------------------------------------------------------

                User user = userRepository.findByGithubId(githubId)
                                .orElseGet(() -> User.builder()
                                                .githubId(githubId)
                                                .build());

                // --------------------------------------------------------------------
                // Always refresh mutable fields
                // --------------------------------------------------------------------

                user.setUsername(username);
                user.setEmail(email);
                user.setAvatarUrl(avatarUrl);

                /**
                 * NOTE:
                 * Storing raw GitHub tokens is acceptable for MVP.
                 * Encrypt or avoid persistence in production.
                 */
                user.setGithubToken(githubAccessToken);

                return userRepository.save(user);
        }

        // ------------------------------------------------------------------------
        // Exchange OAuth Code
        // ------------------------------------------------------------------------

        private String exchangeCodeForToken(String code) {

                try {

                        HttpHeaders headers = new HttpHeaders();

                        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

                        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

                        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();

                        body.add("client_id", clientId);
                        body.add("client_secret", clientSecret);
                        body.add("code", code);
                        body.add("redirect_uri", redirectUri);

                        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(body, headers);

                        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(

                                        GITHUB_TOKEN_URL,
                                        HttpMethod.POST,
                                        requestEntity,

                                        new ParameterizedTypeReference<Map<String, Object>>() {
                                        });

                        Map<String, Object> responseBody = response.getBody();

                        if (responseBody == null
                                        || responseBody.get("access_token") == null) {

                                throw new IllegalStateException(
                                                "GitHub token exchange failed");
                        }

                        log.info(
                                        "GitHub token exchange successful for clientId={}",
                                        clientId);

                        return responseBody
                                        .get("access_token")
                                        .toString();

                } catch (HttpStatusCodeException e) {

                        log.error(
                                        "GitHub token exchange failed. Status={} Body={}",
                                        e.getStatusCode(),
                                        e.getResponseBodyAsString());
                        throw e;

                } catch (Exception e) {

                        log.error(
                                        "GitHub token exchange failed",
                                        e);

                        throw new IllegalStateException(
                                        "Failed to exchange GitHub OAuth code",
                                        e);
                }
        }

        // ------------------------------------------------------------------------
        // Fetch GitHub Profile
        // ------------------------------------------------------------------------

        private String fetchPrimaryEmail(String githubAccessToken) {

                try {
                        HttpHeaders headers = new HttpHeaders();

                        headers.setBearerAuth(githubAccessToken);

                        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

                        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

                        @SuppressWarnings("unchecked")
                        ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                                        GITHUB_EMAIL_URL,
                                        HttpMethod.GET,
                                        requestEntity,
                                        new ParameterizedTypeReference<>() {
                                        });

                        List<Map<String, Object>> emails = response.getBody();

                        if (emails == null) {
                                return null;
                        }

                        for (Map<String, Object> email : emails) {

                                Boolean primary = (Boolean) email.get("primary");

                                if (primary != null && primary) {

                                        return (String) email.get("email");
                                }
                        }

                        return null;

                } catch (HttpStatusCodeException e) {
                        log.error(
                                        "GitHub token exchange failed. Status={} Body={}",
                                        e.getStatusCode(),
                                        e.getResponseBodyAsString());
                        throw e;
                } catch (Exception e) {
                        log.warn("Failed to fetch primary GitHub email", e);
                        return null;
                }
        }

        // GLOBAL GITHUB EMAIL FETCHING FOR MULTIPLE EMAILS
        private Map<String, Object> fetchGitHubProfile(
                        String githubAccessToken) {

                try {

                        HttpHeaders headers = new HttpHeaders();

                        headers.setBearerAuth(githubAccessToken);

                        headers.setAccept(List.of(MediaType.valueOf("application/vnd.github+json")));

                        headers.set("X-GitHub-Api-Version", "2022-11-28");

                        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

                        ResponseEntity<Map> response = restTemplate.exchange(
                                        GITHUB_USER_URL,
                                        HttpMethod.GET,
                                        requestEntity,
                                        new ParameterizedTypeReference<>() {
                                        });

                        Map<String, Object> profile = response.getBody();

                        if (profile == null) {

                                throw new IllegalStateException("GitHub profile response is empty");
                        }

                        return profile;

                } catch (HttpStatusCodeException e) {
                        log.error(
                                        "GitHub token exchange failed. Status={} Body={}",
                                        e.getStatusCode(),
                                        e.getResponseBodyAsString());
                        throw e;
                } catch (Exception e) {
                        log.error("Failed to fetch GitHub user profile", e);
                        throw new IllegalStateException("Failed to fetch GitHub profile", e);
                }
        }

        // ------------------------------------------------------------------------
        // Helpers
        // ------------------------------------------------------------------------

        private String urlEncode(String value) {

                return URLEncoder.encode(
                                value,
                                StandardCharsets.UTF_8);
        }

        private Long toLong(Object value) {

                if (value instanceof Integer i) {
                        return i.longValue();
                }

                if (value instanceof Long l) {
                        return l;
                }

                if (value instanceof String s) {
                        return Long.parseLong(s);
                }

                return null;
        }
}