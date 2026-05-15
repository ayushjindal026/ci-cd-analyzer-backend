package com.ayush.cicd.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class GitHubRepoDto {

    private Long id;

    private String name;

    @JsonProperty("full_name")
    private String fullName;

    private String description;

    private String language;

    @JsonProperty("private")
    private boolean privateRepo;

    @JsonProperty("default_branch")
    private String defaultBranch;

    @JsonProperty("owner_login")
    private String ownerLogin;

    @JsonProperty("html_url")
    private String htmlUrl;

    @JsonProperty("pushed_at")
    private String pushedAt;

    @JsonProperty("stargazers_count")
    private int stargazersCount;
}