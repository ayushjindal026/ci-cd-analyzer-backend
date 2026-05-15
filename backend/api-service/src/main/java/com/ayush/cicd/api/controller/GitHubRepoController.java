package com.ayush.cicd.api.controller;

import com.ayush.cicd.api.dto.response.ApiResponse;
import com.ayush.cicd.api.dto.response.GitHubRepoDto;
import com.ayush.cicd.api.service.GitHubRepoService;
import com.ayush.cicd.common.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/github")
@RequiredArgsConstructor
@Validated
@Tag(name = "GitHub", description = "GitHub repository browser APIs")
public class GitHubRepoController {

    private final GitHubRepoService gitHubRepoService;

    // ------------------------------------------------------------------------
    // List User GitHub Repositories
    // ------------------------------------------------------------------------

    @GetMapping("/repos")
    @Operation(summary = "Get authenticated user's GitHub repositories")
    public ResponseEntity<ApiResponse<List<GitHubRepoDto>>> getRepositories(

            @AuthenticationPrincipal User currentUser,

            @RequestParam(defaultValue = "1") @Min(1) int page,

            @RequestParam(defaultValue = "30") @Min(1) @Max(100) int perPage,

            @RequestParam(defaultValue = "pushed") String sort) {

        List<GitHubRepoDto> repositories = gitHubRepoService.listUserRepos(
                currentUser,
                page,
                perPage,
                sort);

        return ResponseEntity.ok(
                ApiResponse.success(repositories));
    }

    // ------------------------------------------------------------------------
    // Search User Repositories
    // ------------------------------------------------------------------------

    @GetMapping("/repos/search")
    @Operation(summary = "Search authenticated user's repositories")
    public ResponseEntity<ApiResponse<List<GitHubRepoDto>>> searchRepositories(

            @AuthenticationPrincipal User currentUser,

            @RequestParam String q) {

        List<GitHubRepoDto> repositories = gitHubRepoService.searchUserRepos(
                currentUser,
                q);

        return ResponseEntity.ok(
                ApiResponse.success(repositories));
    }
}