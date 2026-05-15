package com.ayush.cicd.api.dto.response;

public record StatusCount(
        String name, // "Success" | "Failed" | "Running" | "Pending"
        int value) {
}