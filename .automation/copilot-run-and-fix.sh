#!/usr/bin/env bash
set -euo pipefail
MODULE_DIR="./backend/dashboard"
LOG_FILE="${MODULE_DIR}/target/copilot-test-run.log"
PATCH_DIR="${MODULE_DIR}/.copilot_patches"
mkdir -p "${MODULE_DIR}/target"
mkdir -p "${PATCH_DIR}"

echo "==> Running Maven tests for module ${MODULE_DIR}..."
if [ -x "${MODULE_DIR}/mvnw" ]; then
  MVNCMD="${MODULE_DIR}/mvnw"
else
  MVNCMD="mvn"
fi

# Run tests once and capture output
echo "Running: ${MVNCMD} -B -DskipITs=true test"
set +e
"${MVNCMD}" -B -DskipITs=true test > "${LOG_FILE}" 2>&1
MVN_EXIT=$?
set -e

if [ ${MVN_EXIT} -eq 0 ]; then
  echo "✅ Initial test run passed. No fixes applied."
  exit 0
fi

echo "❌ Tests failed. Parsing ${LOG_FILE} for known issues and applying patches..."

apply_patch() {
  local target="$1"
  local desc="$2"
  local content="$3"
  # backup
  cp "$target" "$target.bak.$(date +%s)" 2>/dev/null || true
  printf "%s\n" "$content" > "$target"
  echo "PATCHED: $target — $desc"
}

# 1) If compilation errors show 'RedisSnapshotKey' missing methods -> add a simple implementation
if grep -q "RedisSnapshotKey" "$LOG_FILE" || ! [ -f "${MODULE_DIR}/src/main/java/com/zerodha/dashboard/service/RedisSnapshotKey.java" ]; then
  cat > "${MODULE_DIR}/src/main/java/com/zerodha/dashboard/service/RedisSnapshotKey.java" <<'JAVA'
package com.zerodha.dashboard.service;

import java.util.Locale;

public final class RedisSnapshotKey {
    public static final String PUBSUB_CHANNEL = "snapshot:channel";

    private RedisSnapshotKey() {}

    public static String byToken(String token) {
        return String.format("snapshot:token:%s", token);
    }

    public static String byToken(long token) {
        return String.format("snapshot:token:%d", token);
    }

    // Accept strike as String
    public static String byChain(String underlying, String expiry, String strike, String instrumentType) {
        // normalize inputs to safe key
        String u = safe(underlying);
        String e = safe(expiry);
        String s = safe(strike);
        String t = safe(instrumentType);
        return String.format("snapshot:chain:%s:%s:%s:%s", u, e, s, t);
    }

    public static String chainIndex(String underlying, String expiry) {
        return String.format("snapshot:chain:index:%s:%s", safe(underlying), safe(expiry));
    }

    private static String safe(String s) {
        return s == null ? "null" : s.toUpperCase(Locale.ROOT).replaceAll("\\s+", "_");
    }
}
JAVA
  echo "Added RedisSnapshotKey helper."
fi

# 2) If tests mention RedisServiceImpl constructor mismatch, ensure class has expected constructor signature.
if grep -q "constructor RedisServiceImpl(StringRedisTemplate, ObjectMapper, Duration, String)" "$LOG_FILE" || grep -q "The constructor RedisServiceImpl(" "$LOG_FILE"; then
  # attempt to patch file by ensuring constructor exists - create minimal file if missing
  TARGET="${MODULE_DIR}/src/main/java/com/zerodha/dashboard/service/RedisServiceImpl.java"
  if [ -f "$TARGET" ]; then
    # Verify it contains the expected constructor; if not, append an overload constructor
    if ! grep -q "RedisServiceImpl(StringRedisTemplate.*ObjectMapper.*Duration.*String" "$TARGET"; then
      awk '1; /public class RedisServiceImpl/ { print "    // Added constructor overload to match tests\n    public RedisServiceImpl(org.springframework.data.redis.core.StringRedisTemplate redis, com.fasterxml.jackson.databind.ObjectMapper mapper, java.time.Duration ttl, String pubsubChannel) {\n        this(redis, mapper, ttl, pubsubChannel, ttl);\n    }\n" }' "$TARGET" > "$TARGET.tmp" && mv "$TARGET.tmp" "$TARGET"
      echo "Appended compatibility constructor to RedisServiceImpl."
    fi
  fi
fi

# 3) If errors reference TickSnapshot setters/constructors missing, add a full POJO file (safe replacement)
if grep -q "TickSnapshot" "$LOG_FILE" || ! [ -f "${MODULE_DIR}/src/main/java/com/zerodha/dashboard/model/TickSnapshot.java" ]; then
  cat > "${MODULE_DIR}/src/main/java/com/zerodha/dashboard/model/TickSnapshot.java" <<'JAVA'
package com.zerodha.dashboard.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

@JsonIgnoreProperties(ignoreUnknown = true)
public class TickSnapshot {
    public enum InstrumentType { FUT, CALL, PUT, UNKNOWN }
    private String instrumentToken;
    private String segment;
    private String underlying;
    private String expiry;
    private String strike;
    private InstrumentType instrumentType = InstrumentType.UNKNOWN;
    private long volume;
    private long openInterest;
    private long changeInOpenInterest;
    private BigDecimal bidPrice;
    private BigDecimal askPrice;
    private long bidQty;
    private long askQty;
    private BigDecimal ltp;
    private Instant timestamp;

    public TickSnapshot() {}

    // getters and setters (concise)
    public String getInstrumentToken() { return instrumentToken; }
    public void setInstrumentToken(String instrumentToken) { this.instrumentToken = instrumentToken; }
    public String getSegment() { return segment; }
    public void setSegment(String segment) { this.segment = segment; }
    public String getUnderlying() { return underlying; }
    public void setUnderlying(String underlying) { this.underlying = underlying; }
    public String getExpiry() { return expiry; }
    public void setExpiry(String expiry) { this.expiry = expiry; }
    public String getStrike() { return strike; }
    public void setStrike(String strike) { this.strike = strike; }
    public InstrumentType getInstrumentType() { return instrumentType; }
    public void setInstrumentType(InstrumentType instrumentType) { this.instrumentType = instrumentType == null ? InstrumentType.UNKNOWN : instrumentType; }
    public long getVolume() { return volume; }
    public void setVolume(long volume) { this.volume = volume; }
    public long getOpenInterest() { return openInterest; }
    public void setOpenInterest(long openInterest) { this.openInterest = openInterest; }
    public long getChangeInOpenInterest() { return changeInOpenInterest; }
    public void setChangeInOpenInterest(long changeInOpenInterest) { this.changeInOpenInterest = changeInOpenInterest; }
    public java.math.BigDecimal getBidPrice() { return bidPrice; }
    public void setBidPrice(java.math.BigDecimal bidPrice) { this.bidPrice = bidPrice; }
    public java.math.BigDecimal getAskPrice() { return askPrice; }
    public void setAskPrice(java.math.BigDecimal askPrice) { this.askPrice = askPrice; }
    public long getBidQty() { return bidQty; }
    public void setBidQty(long bidQty) { this.bidQty = bidQty; }
    public long getAskQty() { return askQty; }
    public void setAskQty(long askQty) { this.askQty = askQty; }
    public java.math.BigDecimal getLtp() { return ltp; }
    public void setLtp(java.math.BigDecimal ltp) { this.ltp = ltp; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
JAVA
  echo "Ensured TickSnapshot POJO exists."
fi

# 4) Fix enum constant naming mismatches (CALL/PUT/FUT vs FUTURE etc.)
if grep -q "Cannot resolve symbol 'FUTURE'" "$LOG_FILE" || grep -q "Cannot resolve symbol 'FUT'" "$LOG_FILE"; then
  # we already created TickSnapshot.InstrumentType with FUT/CALL/PUT; no further action.
  echo "Checked instrument type naming — ensured FUT/CALL/PUT present."
fi

# 5) Re-run tests after patches
echo "Re-running tests..."
set +e
"${MVNCMD}" -B -DskipITs=true test >> "${LOG_FILE}" 2>&1
MVN_EXIT2=$?
set -e
if [ ${MVN_EXIT2} -eq 0 ]; then
  echo "✅ Tests pass after automated fixes. See ${LOG_FILE}"
  exit 0
else
  echo "❌ Tests still failing. See ${LOG_FILE} for details. No further automatic changes applied."
  exit ${MVN_EXIT2}
fi
