package com.zerodha.dashboard.service;

public final class RedisSnapshotKey {
    private RedisSnapshotKey() {}

    public static String byToken(long instrumentToken) {
        return "tick:token:" + instrumentToken;
    }

    public static String byChain(String underlying, String expiry, int strike, String type) {
        return String.format("tick:chain:%s:%s:%d:%s", underlying, expiry, strike, type);
    }

    public static String chainIndex(String underlying, String expiry) {
        return String.format("tick:chainindex:%s:%s", underlying, expiry);
    }

    public static final String PUBSUB_CHANNEL = "ticks-channel";
}
