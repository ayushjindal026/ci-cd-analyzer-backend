package com.ayush.cicd.api.config;

import com.ayush.cicd.ingestion.config.GitHubProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * WHY @EnableCaching here?
 * @Cacheable annotations in AnalyticsService do nothing without this switch.
 * Spring needs to know to create the cache proxy infrastructure.
 * We put it in AppConfig because this is the central configuration class
 * for cross-cutting concerns that apply to the whole application.
 */
@Configuration
@EnableCaching
@EnableConfigurationProperties(GitHubProperties.class)
public class AppConfig {
}