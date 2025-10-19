package com.zerodha.dashboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zerodha.dashboard.model.TickSnapshot;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

public class RedisServiceIT {

    private static GenericContainer<?> redisContainer;
    private static RedisServiceImpl redisService;
    private static StringRedisTemplate template;

    @BeforeAll
    public static void startRedis() {
        redisContainer = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
                .withExposedPorts(6379);
        redisContainer.start();

        String host = redisContainer.getHost();
        Integer port = redisContainer.getMappedPort(6379);

        LettuceConnectionFactory conn = new LettuceConnectionFactory(host, port);
        conn.afterPropertiesSet();
        template = new StringRedisTemplate();
        template.setConnectionFactory(conn);
        template.afterPropertiesSet();

        ObjectMapper mapper = new ObjectMapper();
        redisService = new RedisServiceImpl(template, mapper, Duration.ofHours(24));
    }

    @AfterAll
    public static void stopRedis() {
        try {
            if (redisService != null) redisService.close();
        } catch (Exception ignored) {}
        if (redisContainer != null) redisContainer.stop();
    }

    @Test
    public void saveAndGetByTokenAndExpiryIndexAndPublish() throws Exception {
        TickSnapshot snap = new TickSnapshot();
        snap.setInstrumentToken(12345L);
        snap.setTradingsymbol("NIFTY25APR22500CE");
        snap.setUnderlying("NIFTY");
        snap.setInstrumentType(TickSnapshot.InstrumentType.CALL);
        snap.setStrike(22500);
        snap.setExpiry("2025-04-25");
        snap.setLastPrice(58.25);
        snap.setOi(18300L);
        snap.setVolume(45100L);
        snap.setBidPrice(58.00);
        snap.setAskPrice(58.50);
        snap.setBidQty(950L);
        snap.setAskQty(880L);
        snap.setChangeInOi(2100.0);
        snap.setTimestamp(Instant.now());

        boolean saved = redisService.saveSnapshot(snap);
        assertTrue(saved, "saveSnapshot should return true");

        Optional<TickSnapshot> fetched = redisService.getSnapshotByToken(12345L);
        assertTrue(fetched.isPresent());
        assertEquals("NIFTY25APR22500CE", fetched.get().getTradingsymbol());

        List<TickSnapshot> allForExpiry = redisService.getAllSnapshotsForExpiry("NIFTY", "2025-04-25");
        assertFalse(allForExpiry.isEmpty(), "expiry index should contain at least one snapshot");

        // test pubsub: subscribe via template and wait for a message
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> received = new AtomicReference<>();

        template.getConnectionFactory().getConnection().subscribe((message, pattern) -> {
            received.set(new String(message.getBody()));
            latch.countDown();
        }, RedisSnapshotKey.PUBSUB_CHANNEL.getBytes());

        // publish
        redisService.publishSnapshot(snap);

        boolean messageArrived = latch.await(3, TimeUnit.SECONDS);
        assertTrue(messageArrived, "Should receive pubsub message");
        assertNotNull(received.get());
        assertTrue(received.get().contains("NIFTY25APR22500CE"));
    }
}
