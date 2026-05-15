// PATH: backend/src/main/java/com/pipelineiq/analyzer/config/AppConfig.java
package com.ayush.cicd.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

@Configuration
@EnableAsync
@EnableRetry
@EnableScheduling
public class AppConfig {

    @Bean
    public RestTemplate restTemplate() {
        // Timeouts for all external API calls (OpenAI, Groq, GitHub)
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(30_000);
        return new RestTemplate(factory);
    }
}