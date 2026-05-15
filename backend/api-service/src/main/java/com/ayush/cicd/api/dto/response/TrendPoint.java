
package com.ayush.cicd.api.dto.response;

public record TrendPoint(
        String date, // "YYYY-MM-DD"
        int failureRate, // 0-100
        int successRate // 0-100
) {
}
