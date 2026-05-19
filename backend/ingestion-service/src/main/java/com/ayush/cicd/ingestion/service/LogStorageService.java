package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.PipelineLog;
import com.ayush.cicd.common.repository.PipelineLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.zip.*;

/**
 * Compresses and stores pipeline logs. Provides decompression for re-analysis.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LogStorageService {

    private final PipelineLogRepository logRepository;

    // ── Store ─────────────────────────────────────────────────────────────────

    /**
     * Compresses and persists a raw log string.
     *
     * @param runId        PipelineRun.id
     * @param repositoryId MonitoredRepository.id
     * @param stage        Stage name (Build, Test, etc.)
     * @param rawLog       Full raw log text
     */
    public PipelineLog store(Long runId, Long repositoryId, String stage, String rawLog) {
        if (rawLog == null || rawLog.isBlank()) return null;

        try {
            byte[] compressed   = compress(rawLog);
            String errorPreview = extractErrorPreview(rawLog);

            PipelineLog pLog = PipelineLog.builder()
                    .runId(runId)
                    .repositoryId(repositoryId)
                    .stage(stage)
                    .compressedLog(compressed)
                    .rawSizeBytes(rawLog.getBytes(StandardCharsets.UTF_8).length)
                    .compressedSizeBytes(compressed.length)
                    .errorPreview(errorPreview)
                    .build();

            PipelineLog saved = logRepository.save(pLog);

            log.debug("Stored log: run={} stage={} raw={}B compressed={}B ({}% ratio)",
                    runId, stage, saved.getRawSizeBytes(), saved.getCompressedSizeBytes(),
                    Math.round((1 - (double) saved.getCompressedSizeBytes() / saved.getRawSizeBytes()) * 100));

            return saved;

        } catch (IOException e) {
            log.error("Failed to compress/store log for run={} stage={}: {}", runId, stage, e.getMessage());
            return null;
        }
    }

    // ── Retrieve ──────────────────────────────────────────────────────────────

    /**
     * Retrieves and decompresses a stored log.
     * Returns null if not found — caller should re-fetch from GitHub.
     */
    public String retrieve(Long runId, String stage) {
        return logRepository.findByRunIdAndStage(runId, stage)
                .map(pLog -> {
                    try {
                        return decompress(pLog.getCompressedLog());
                    } catch (IOException e) {
                        log.error("Decompression failed for run={} stage={}: {}", runId, stage, e.getMessage());
                        return null;
                    }
                })
                .orElse(null);
    }

    /** Returns true if a stored log exists for this run + stage. */
    public boolean exists(Long runId, String stage) {
        return logRepository.findByRunIdAndStage(runId, stage).isPresent();
    }

    // ── Compression ───────────────────────────────────────────────────────────

    public static byte[] compress(String text) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (GZIPOutputStream gzip = new GZIPOutputStream(bos)) {
            gzip.write(text.getBytes(StandardCharsets.UTF_8));
        }
        return bos.toByteArray();
    }

    public static String decompress(byte[] compressed) throws IOException {
        try (GZIPInputStream gzip = new GZIPInputStream(new ByteArrayInputStream(compressed));
             InputStreamReader reader = new InputStreamReader(gzip, StandardCharsets.UTF_8);
             BufferedReader br = new BufferedReader(reader)) {

            StringBuilder sb = new StringBuilder();
            char[] buf = new char[4096];
            int read;
            while ((read = br.read(buf)) != -1) sb.append(buf, 0, read);
            return sb.toString();
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String extractErrorPreview(String rawLog) {
        return rawLog.lines()
                .filter(l -> l.toLowerCase().contains("error")
                          || l.toLowerCase().contains("exception")
                          || l.toLowerCase().contains("failed"))
                .limit(3)
                .reduce("", (a, b) -> a.isBlank() ? b : a + " | " + b)
                .substring(0, Math.min(500,
                        rawLog.lines()
                              .filter(l -> l.toLowerCase().contains("error"))
                              .findFirst().orElse("").length()));
    }
}