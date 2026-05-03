package com.ayush.cicd.api.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Generic paginated response wrapper.
 *
 * WHY a separate pagination wrapper?
 * Returning a raw list from a paginated endpoint loses critical metadata —
 * the client has no idea how many total pages exist or what page they're on.
 * Without totalElements, a frontend can't render a pagination component.
 *
 * WHY not just use Spring's Page<T> directly in the response?
 * Spring's Page serializes to a huge JSON object with internal Spring
 * metadata that clients don't need and shouldn't depend on.
 * This DTO gives clients exactly what they need, nothing more.
 *
 * Usage: ApiResponse<PagedResponse<PipelineRunResponse>>
 */
@Data
@Builder
public class PagedResponse<T> {

    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;
}