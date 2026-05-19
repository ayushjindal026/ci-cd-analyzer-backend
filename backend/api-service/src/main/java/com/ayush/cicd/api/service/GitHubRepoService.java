package com.ayush.cicd.api.service;

import com.ayush.cicd.api.dto.response.GitHubRepoDto;
import com.ayush.cicd.common.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubRepoService {

    private final RestTemplate restTemplate;

    private static final String GITHUB_REPOS_URL = "https://api.github.com/user/repos";

    // ------------------------------------------------------------------------
    // List User Repositories
    // ------------------------------------------------------------------------

    @Cacheable(value = "githubRepos", key = "#currentUser.id + '-' + #page + '-' + #perPage + '-' + #sort")
    public List<GitHubRepoDto> listUserRepos(
            User currentUser,
            int page,
            int perPage,
            String sort) {

        validateUserToken(currentUser);

        String url = UriComponentsBuilder
                .fromHttpUrl(GITHUB_REPOS_URL)
                .queryParam("page", page)
                .queryParam("per_page", Math.min(perPage, 100))
                .queryParam("sort", sort)
                .queryParam("type", "all")
                .toUriString();

        try {

            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(
                            githubHeaders(
                                    currentUser.getGithubToken())),
                    new ParameterizedTypeReference<>() {
                    });

            List<Map<String, Object>> repositories = response.getBody();

            if (repositories == null) {

                return List.of();
            }

            return repositories.stream()
                    .map(this::toDto)
                    .toList();

        } catch (Exception e) {

            log.error("""
                    GitHub repo fetch failed:
                    userId={}
                    error={}
                    """,
                    currentUser.getId(),
                    e.getMessage(),
                    e);

            return List.of();
        }
    }

    // ------------------------------------------------------------------------
    // Search User Repositories
    // ------------------------------------------------------------------------

    public List<GitHubRepoDto> searchUserRepos(
            User currentUser,
            String query) {

        String normalizedQuery = query.toLowerCase(Locale.ROOT);

        return listUserRepos(
                currentUser,
                1,
                100,
                "pushed")
                .stream()
                .filter(repository ->

                repository.getName()
                        .toLowerCase(Locale.ROOT)
                        .contains(normalizedQuery)

                        ||

                        repository.getFullName()
                                .toLowerCase(Locale.ROOT)
                                .contains(normalizedQuery))
                .toList();
    }

    // ------------------------------------------------------------------------
    // Mapping
    // ------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private GitHubRepoDto toDto(
            Map<String, Object> repository) {

        Map<String, Object> owner = (Map<String, Object>) repository.get("owner");

        return GitHubRepoDto.builder()
                .id(toLong(repository.get("id")))
                .name((String) repository.get("name"))
                .fullName((String) repository.get("full_name"))
                .description((String) repository.get("description"))
                .language((String) repository.get("language"))
                .privateRepo(
                        Boolean.TRUE.equals(
                                repository.get("private")))
                .defaultBranch(
                        (String) repository.getOrDefault(
                                "default_branch",
                                "main"))
                .ownerLogin(
                        owner != null
                                ? (String) owner.get("login")
                                : "")
                .htmlUrl((String) repository.get("html_url"))
                .pushedAt((String) repository.get("pushed_at"))
                .stargazersCount(
                        toInt(repository.get("stargazers_count")))
                .build();
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    private HttpHeaders githubHeaders(String token) {

        HttpHeaders headers = new HttpHeaders();

        headers.setBearerAuth(token);

        headers.set(
                "Accept",
                "application/vnd.github+json");

        headers.set(
                "X-GitHub-Api-Version",
                "2022-11-28");

        return headers;
    }

    private void validateUserToken(User currentUser) {

        if (currentUser == null
                || currentUser.getGithubToken() == null
                || currentUser.getGithubToken().isBlank()) {

            throw new IllegalStateException(
                    "GitHub OAuth token missing");
        }
    }

    private Long toLong(Object value) {

        if (value instanceof Integer i) {
            return i.longValue();
        }

        if (value instanceof Long l) {
            return l;
        }

        return null;
    }

    private int toInt(Object value) {

        if (value instanceof Integer i) {
            return i;
        }

        return 0;
    }
}