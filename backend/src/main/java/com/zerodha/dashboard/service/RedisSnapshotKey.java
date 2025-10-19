// Utility for Redis snapshot keys
package com.zerodha.dashboard.service;

public final class RedisSnapshotKey {
    public static final String PUBSUB_CHANNEL = "snapshot:updates";

    private RedisSnapshotKey() {}

    public static String byToken(long token) {
        return byToken(String.valueOf(token));
    }
    public static String byToken(String token) {
        return "snapshot:token:" + token;
    }

    public static String byChain(String underlying, String expiry, int strike, String instrumentType) {
        return byChain(underlying, expiry, String.valueOf(strike), instrumentType);
    }
    public static String byChain(String underlying, String expiry, String strike, String instrumentType) {
        return String.format("snapshot:chain:%s:%s:%s:%s", underlying, expiry, strike, instrumentType);
    }

    public static String chainIndex(String underlying, String expiry) {
        return String.format("snapshot:chain_index:%s:%s", underlying, expiry);
    }
}
