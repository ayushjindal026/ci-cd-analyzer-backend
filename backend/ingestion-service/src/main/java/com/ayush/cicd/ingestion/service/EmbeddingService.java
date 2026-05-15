package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.FailureRecord;
import com.ayush.cicd.common.repository.FailureRecordRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Generates text embeddings for failure records using OpenAI
 * text-embedding-3-small.
 * Stores as float[] in the DB (serialised as comma-delimited string for
 * portability).
 * Provides cosine-similarity nearest-neighbour search for "similar past
 * failures".
 *
 * Falls back silently if OpenAI key is missing — embeddings are optional
 * enrichment.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final RestTemplate restTemplate;
    private final FailureRecordRepository failureRepo;

    @Value("${ai.openai.api-key:}")
    private String openaiKey;

    @Value("${ai.openai.embedding-model:text-embedding-3-small}")
    private String embeddingModel;

    private static final String EMBED_URL = "https://api.openai.com/v1/embeddings";

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Async — generates embedding for the record and persists it.
     * Called after a FailureRecord is saved; never blocks the main flow.
     */
    @Async
    public void embedAsync(FailureRecord record) {
        if (openaiKey.isBlank())
            return; // silently skip
        try {
            String text = buildEmbedText(record);
            float[] vector = embed(text);
            if (vector != null) {
                record.setEmbedding(serialise(vector));
                failureRepo.save(record);
                log.debug("Embedded failure record {}", record.getId());
            }
        } catch (Exception e) {
            log.warn("Embedding generation failed for record {}: {}", record.getId(), e.getMessage());
        }
    }

    /**
     * Returns the topN most similar FailureRecords by cosine similarity.
     * Only records that already have embeddings are considered.
     */
    public List<FailureRecord> findSimilarByEmbedding(FailureRecord target, int topN) {
        if (target.getEmbedding() == null)
            return List.of();

        float[] targetVec = deserialise(target.getEmbedding());
        List<FailureRecord> candidates = failureRepo
                .findByRepositoryIdAndEmbeddingIsNotNull(target.getRepositoryId());

        return candidates.stream()
                .filter(r -> !r.getId().equals(target.getId()))
                .map(r -> Map.entry(r, cosineSim(targetVec, deserialise(r.getEmbedding()))))
                .filter(e -> e.getValue() > 0.80) // similarity threshold
                .sorted(Map.Entry.<FailureRecord, Double>comparingByValue().reversed())
                .limit(topN)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    /**
     * Synchronous embed for a single string — used in search / on-demand flows.
     */
    public float[] embed(String text) {

        if (openaiKey.isBlank() || text == null || text.isBlank())
            return null;

        Map<String, Object> body = Map.of(
                "model", embeddingModel,
                "input", text.substring(0, Math.min(text.length(), 8000)) // stay under token limit
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openaiKey);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    EMBED_URL, HttpMethod.POST,
                    new HttpEntity<>(body, headers), Map.class);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> data = (List<Map<String, Object>>) Objects.requireNonNull(response.getBody())
                    .get("data");

            @SuppressWarnings("unchecked")
            List<Double> embedding = (List<Double>) data.get(0).get("embedding");

            float[] result = new float[embedding.size()];
            for (int i = 0; i < embedding.size(); i++)
                result[i] = embedding.get(i).floatValue();
            return result;

        } catch (Exception e) {
            log.error("OpenAI embedding call failed: {}", e.getMessage());
            return null;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Build a rich text representation to embed — captures semantic meaning. */
    private String buildEmbedText(FailureRecord r) {
        return String.join(" | ",
                "stage:" + r.getStage(),
                "category:" + r.getCategory(),
                "root:" + Objects.toString(r.getRootCauseLine(), ""),
                "tests:" + Objects.toString(r.getFailingTests(), ""),
                "stack:" + Objects.toString(r.getStackTraceSummary(), ""));
    }

    /** Cosine similarity between two float vectors. */
    private double cosineSim(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length)
            return 0.0;
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        double denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom == 0 ? 0.0 : dot / denom;
    }

    /** Serialise float[] → comma-delimited string for VARCHAR/TEXT column. */
    public static String serialise(float[] v) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < v.length; i++) {
            if (i > 0)
                sb.append(',');
            sb.append(v[i]);
        }
        return sb.toString();
    }

    /** Deserialise comma-delimited string → float[]. */
    public static float[] deserialise(String s) {
        if (s == null || s.isBlank())
            return new float[0];
        String[] parts = s.split(",");
        float[] v = new float[parts.length];
        for (int i = 0; i < parts.length; i++)
            v[i] = Float.parseFloat(parts[i]);
        return v;
    }
}