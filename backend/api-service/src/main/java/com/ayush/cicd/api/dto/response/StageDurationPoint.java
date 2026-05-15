package com.ayush.cicd.api.dto.response;

public record StageDurationPoint(
        String stage, // seconds
        int avgDuration, // seconds
        int maxDuration // seconds
) {
}
