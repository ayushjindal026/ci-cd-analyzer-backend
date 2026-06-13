package com.ayush.cicd.api.service;

import com.ayush.cicd.api.repository.UserPreferencesRepository;
import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.entity.UserPreferences;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final UserPreferencesRepository repository;

    public UserPreferences getPreferences(User user) {

        return repository.findByUser(user)
                .orElseGet(() -> createDefault(user));
    }

    public UserPreferences savePreferences(
            User user,
            UserPreferences dto) {

        UserPreferences prefs = repository.findByUser(user)
                .orElseGet(() -> createDefault(user));

        prefs.setDarkMode(dto.isDarkMode());
        prefs.setEmailNotifications(dto.isEmailNotifications());
        prefs.setSlackNotifications(dto.isSlackNotifications());
        prefs.setAiInsights(dto.isAiInsights());
        prefs.setRealtimeUpdates(dto.isRealtimeUpdates());
        prefs.setSlackWebhookUrl(dto.getSlackWebhookUrl());
        prefs.setFlakyThreshold(dto.getFlakyThreshold());
        prefs.setFailureThreshold(dto.getFailureThreshold());
        prefs.setSuccessRateThreshold(dto.getSuccessRateThreshold());
        prefs.setUpdatedAt(Instant.now());

        return repository.save(prefs);
    }

    private UserPreferences createDefault(User user) {

        return repository.save(
                UserPreferences.builder()
                        .user(user)
                        .updatedAt(Instant.now())
                        .build());
    }
}