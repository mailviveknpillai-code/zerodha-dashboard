package com.zerodha.dashboard.service;

import com.zerodha.dashboard.model.TickSnapshot;

import java.util.List;
import java.util.Optional;

public interface RedisService {
    boolean saveSnapshot(TickSnapshot snapshot);
    Optional<TickSnapshot> getSnapshotByToken(long instrumentToken);
    List<TickSnapshot> getSnapshotsForChain(String underlying, String expiry, int centerStrike, int range, int step);
    List<TickSnapshot> getAllSnapshotsForExpiry(String underlying, String expiry);
    void publishSnapshot(TickSnapshot snapshot);
    void close();
}
