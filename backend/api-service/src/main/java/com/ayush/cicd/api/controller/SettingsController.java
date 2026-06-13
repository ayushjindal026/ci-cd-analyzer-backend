package com.ayush.cicd.api.controller;

import com.ayush.cicd.api.dto.response.ApiResponse;
import com.ayush.cicd.api.service.SettingsService;
import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.entity.UserPreferences;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping("/preferences")
    public ResponseEntity<?> getPrefs(
            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        settingsService.getPreferences(user)));
    }

    @PutMapping("/preferences")
    public ResponseEntity<?> savePrefs(
            @AuthenticationPrincipal User user,
            @RequestBody UserPreferences body) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        settingsService.savePreferences(user, body)));
    }

    @GetMapping("/alerts")
    public ResponseEntity<?> alerts(
            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        settingsService.getPreferences(user)));
    }

    @PutMapping("/alerts")
    public ResponseEntity<?> saveAlerts(
            @AuthenticationPrincipal User user,
            @RequestBody UserPreferences body) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        settingsService.savePreferences(user, body)));
    }

    @PostMapping("/slack/test")
    public ResponseEntity<?> testSlack() {

        return ResponseEntity.ok(
                ApiResponse.success("Slack test sent"));
    }

    @PostMapping("/email/test")
    public ResponseEntity<?> testEmail() {

        return ResponseEntity.ok(
                ApiResponse.success("Email test sent"));
    }

    @GetMapping("/integrations")
    public ResponseEntity<?> integrations() {

        return ResponseEntity.ok(
                ApiResponse.success(List.of()));
    }
}