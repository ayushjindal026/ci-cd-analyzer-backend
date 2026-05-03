package com.ayush.cicd.api.config;

import com.ayush.cicd.ingestion.config.GitHubProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Activates @ConfigurationProperties beans.
 *
 * WHY needed?
 * @ConfigurationProperties classes are not picked up by component scan alone.
 * @EnableConfigurationProperties explicitly registers them as Spring beans,
 * making them injectable anywhere in the application.
 */
@Configuration
@EnableConfigurationProperties(GitHubProperties.class)
public class AppConfig {
}