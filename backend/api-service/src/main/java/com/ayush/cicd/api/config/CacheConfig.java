// ─────────────────────────────────────────────────────────────────────────────
// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/config/CacheConfig.java
// ─────────────────────────────────────────────────────────────────────────────
package com.ayush.cicd.api.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.*;
import org.springframework.data.redis.cache.*;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.*;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Named cache TTL configuration.
 *
 * Cache names and their TTLs:
 *   githubRepos   — 5 min  (GitHub API, changes on repo push)
 *   repoMetrics   — 2 min  (DB aggregation, updates on each run)
 *   aiAnalyses    — 60 min (immutable once written by AI)
 *   runAnalysis   — 30 min (single run result, never changes)
 *
 * Keys follow the pattern: cacheName::keyExpression
 * e.g. "githubRepos::42-1" (userId=42, page=1)
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Autowired
    private RedisConnectionFactory connectionFactory;

    @Bean
    public RedisCacheManager cacheManager() {
        // Default: 10 minute TTL for anything not explicitly listed
        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(
                                new GenericJackson2JsonRedisSerializer()))
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> perCache = new HashMap<>();

        perCache.put("githubRepos",  defaults.entryTtl(Duration.ofMinutes(5)));
        perCache.put("repoMetrics",  defaults.entryTtl(Duration.ofMinutes(2)));
        perCache.put("aiAnalyses",   defaults.entryTtl(Duration.ofHours(1)));
        perCache.put("runAnalysis",  defaults.entryTtl(Duration.ofMinutes(30)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaults)
                .withInitialCacheConfigurations(perCache)
                .build();
    }
}