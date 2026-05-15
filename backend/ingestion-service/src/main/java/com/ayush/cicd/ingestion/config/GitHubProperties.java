package com.ayush.cicd.ingestion.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "github")
public class GitHubProperties {

    private String token;

    private String apiBaseUrl = "https://api.github.com";

    private int connectTimeoutMs = 5000;

    private int runsPerPage = 50;

    private int readTimeoutMs = 30000;
}
