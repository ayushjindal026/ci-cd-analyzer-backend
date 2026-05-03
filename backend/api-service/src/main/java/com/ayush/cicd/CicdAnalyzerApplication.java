package com.ayush.cicd;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Single root package: com.ayush.cicd
 *
 * @SpringBootApplication scans com.ayush.cicd and ALL sub-packages automatically.
 * This means com.ayush.cicd.common, com.ayush.cicd.api, com.ayush.cicd.ingestion,
 * com.ayush.cicd.analytics are all picked up with zero extra configuration.
 *
 * This is the correct Spring Boot architecture — one root, everything beneath it.
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
@EnableScheduling
public class CicdAnalyzerApplication {

    public static void main(String[] args) {
        SpringApplication.run(CicdAnalyzerApplication.class, args);
    }
}