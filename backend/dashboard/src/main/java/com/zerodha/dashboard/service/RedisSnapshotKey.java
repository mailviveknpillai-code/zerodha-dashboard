package com.zerodha.dashboard.service;

public class RedisSnapshotKey {
    private static final String NAMESPACE_PREFIX = "zerodha:snapshot:";
    public static final String PUBSUB_CHANNEL = "zerodha:snapshots:channel";

    public static String byToken(String instrumentToken, String namespace) {
        return (namespace != null && !namespace.isEmpty() ? namespace : NAMESPACE_PREFIX) + instrumentToken;
    }

    public static String byToken(String instrumentToken) {
        return byToken(instrumentToken, null);
    }

    // Example for chain key, adapt as needed
    public static String byChain(String underlying, String expiry, int strike, String instrumentType) {
        return NAMESPACE_PREFIX + "chain:" + underlying + ":" + expiry + ":" + strike + ":" + instrumentType;
    }
}
