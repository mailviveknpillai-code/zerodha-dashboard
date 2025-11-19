package com.zerodha.dashboard.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RedisSnapshotKeyTest {

    @Test
    void byTokenUsesNamespaceWhenProvided() {
        String result = RedisSnapshotKey.byToken("123", "custom:");
        assertThat(result).isEqualTo("custom:123");
    }

    @Test
    void byTokenFallsBackToDefault() {
        String result = RedisSnapshotKey.byToken("999");
        assertThat(result).isEqualTo("zerodha:snapshot:999");
    }

    @Test
    void byTokenFallsBackWhenNamespaceEmpty() {
        String result = RedisSnapshotKey.byToken("111", "");
        assertThat(result).isEqualTo("zerodha:snapshot:111");
    }

    @Test
    void byChainBuildsFormattedKey() {
        String key = RedisSnapshotKey.byChain("NIFTY", "2025-12-01", 25000, "CE");
        assertThat(key).isEqualTo("zerodha:snapshot:chain:NIFTY:2025-12-01:25000:CE");
    }
}
