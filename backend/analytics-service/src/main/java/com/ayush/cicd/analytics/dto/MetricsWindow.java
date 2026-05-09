package com.ayush.cicd.analytics.dto;
import java.io.Serializable;
/**
 * Time window options for analytics queries.
 *
 * WHY an enum and not accepting raw integers?
 * Accepting arbitrary day counts (7, 14, 30, 90...) means every
 * combination needs to be tested. An enum constrains the input to
 * known valid values — no "what if someone passes -1 days" edge cases.
 * Also self-documenting in Swagger/API docs.
 */
public enum MetricsWindow implements Serializable {
    
    SEVEN_DAYS(7),
    THIRTY_DAYS(30),
    ALL_TIME(Integer.MAX_VALUE);

    private final int days;
    private static final long serialVersionUID = 1L;

    MetricsWindow(int days) {
        this.days = days;
    }

    public int getDays() {
        return days;
    }

    public static MetricsWindow fromString(String value) {
        return switch (value.toLowerCase()) {
            case "7d"  -> SEVEN_DAYS;
            case "30d" -> THIRTY_DAYS;
            case "all" -> ALL_TIME;
            default    -> THIRTY_DAYS; // safe default
        };
    }
}