package com.ayush.cicd.ingestion.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiProviderClient {

    private final RestTemplate restTemplate;

    @Retryable(
            retryFor = RetryableAiProviderException.class,
            maxAttempts = 3,
            backoff = @Backoff(
                    delay = 2000,
                    multiplier = 2
            )
    )
    public Map<String, Object> call(
            String provider,
            String url,
            String model,
            String apiKey,
            String prompt) {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
                "model", model,
                "temperature", 0.1,
                "max_tokens", 1000,
                "messages", List.of(
                        Map.of(
                                "role", "user",
                                "content", prompt
                        )
                )
        );

        try {
            log.debug(
                    "Calling AI provider={} model={}",
                    provider,
                    model
            );

            HttpEntity<Map<String, Object>> request =
                    new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response =
                    restTemplate.exchange(
                            url,
                            HttpMethod.POST,
                            request,
                            new org.springframework.core.ParameterizedTypeReference<>() {
                            }
                    );

            Map<String, Object> responseBody = response.getBody();

            if (responseBody == null || responseBody.isEmpty()) {
                throw new NonRetryableAiProviderException(
                        "AI provider returned an empty response"
                );
            }

            return responseBody;

        } catch (ResourceAccessException ex) {

            log.warn(
                    "AI provider network failure — provider={} model={} error={}",
                    provider,
                    model,
                    ex.getMessage()
            );

            throw new RetryableAiProviderException(
                    "AI provider network failure",
                    ex
            );

        } catch (HttpServerErrorException ex) {

            log.warn(
                    "AI provider server error — provider={} model={} status={}",
                    provider,
                    model,
                    ex.getStatusCode()
            );

            throw new RetryableAiProviderException(
                    "AI provider server error: " + ex.getStatusCode(),
                    ex
            );

        } catch (HttpClientErrorException.TooManyRequests ex) {

            log.warn(
                    "AI provider rate limited — provider={} model={}",
                    provider,
                    model
            );

            throw new RetryableAiProviderException(
                    "AI provider rate limit exceeded",
                    ex
            );

        } catch (HttpClientErrorException ex) {

            log.error(
                    "AI provider rejected request — provider={} model={} status={}",
                    provider,
                    model,
                    ex.getStatusCode()
            );

            throw new NonRetryableAiProviderException(
                    "AI provider rejected request: " + ex.getStatusCode(),
                    ex
            );

        } catch (RestClientException ex) {

            log.error(
                    "Unexpected AI provider client error — provider={} model={}",
                    provider,
                    model,
                    ex
            );

            throw new NonRetryableAiProviderException(
                    "Unexpected AI provider client error",
                    ex
            );
        }
    }

    public static class RetryableAiProviderException
            extends RuntimeException {

        public RetryableAiProviderException(
                String message,
                Throwable cause) {
            super(message, cause);
        }
    }

    public static class NonRetryableAiProviderException
            extends RuntimeException {

        public NonRetryableAiProviderException(String message) {
            super(message);
        }

        public NonRetryableAiProviderException(
                String message,
                Throwable cause) {
            super(message, cause);
        }
    }
}