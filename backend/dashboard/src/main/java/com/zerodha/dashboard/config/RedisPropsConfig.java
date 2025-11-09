package com.zerodha.dashboard.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class RedisPropsConfig {

    @Bean
    public Duration redisSnapshotTtl(@Value("${redis.snapshot.ttl:PT5M}") String ttl) {
        return Duration.parse(ttl);
    }

    @Bean(name = "redisNamespace")
    public String redisNamespace(@Value("${redis.namespace:zerodha:snapshot:}") String ns) {
        return ns;
    }
}
