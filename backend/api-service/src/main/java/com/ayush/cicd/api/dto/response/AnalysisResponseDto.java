package com.ayush.cicd.api.dto.response;

import lombok.*;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisResponseDto {
    private Long runId;
    private String severity;
    private String priority;
    private String summary;
    private String rootCause;
    private String diagnosis;
    private String recommendation;
    private List<String> remediationSteps;
    private String affectedComponent;
    private String estimatedFixTime;
    private boolean isFlaky;
    private double flakinessScore;
    private int similarFailuresCount;
    private String modelUsed;
    private Instant analysedAt;
}