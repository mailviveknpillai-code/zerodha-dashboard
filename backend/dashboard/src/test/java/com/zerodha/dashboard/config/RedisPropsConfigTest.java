package com.zerodha.dashboard.config;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class RedisPropsConfigTest {

    private final RedisPropsConfig config = new RedisPropsConfig();

    @Test
    void parsesTtlDuration() {
        Duration ttl = config.redisSnapshotTtl("PT30M");
        assertThat(ttl).isEqualTo(Duration.ofMinutes(30));
    }

    @Test
    void returnsNamespaceValue() {
        String namespace = config.redisNamespace("custom:ns:");
        assertThat(namespace).isEqualTo("custom:ns:");
    }
}



