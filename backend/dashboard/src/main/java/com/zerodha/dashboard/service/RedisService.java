package com.zerodha.dashboard.service;

import com.zerodha.dashboard.model.TickSnapshot;

import java.time.Duration;
import java.util.Optional;

public interface RedisService {
    boolean saveSnapshot(TickSnapshot snapshot);
    Optional<TickSnapshot> getSnapshotByToken(String instrumentToken);
    void expireKey(String key, Duration duration);
}
