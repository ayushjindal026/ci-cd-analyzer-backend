package com.ayush.cicd.api.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.ayush.cicd.ingestion.service.WebhookProcessorService;

import java.util.Map;

/**
 * Receives GitHub webhook events.
 *
 * Register at: https://github.com/settings/hooks
 * Events to subscribe: workflow_run, push, pull_request
 *
 * POST /api/v1/webhook/github
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/webhook")
@RequiredArgsConstructor
@Tag(name = "Webhook", description = "GitHub webhook receiver")
public class WebhookController {

    private final WebhookProcessorService processor;

    @PostMapping("/github")
    public ResponseEntity<Void> handleGitHub(
            @RequestHeader(value = "X-GitHub-Event", defaultValue = "unknown") String event,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String sig,
            @RequestBody Map<String, Object> payload) {
        log.info("Received GitHub webhook event: {}", event);

        // Process async — return 200 fast so GitHub doesn't retry
        processor.process(event, sig, payload);

        return ResponseEntity.ok().build();
    }
}