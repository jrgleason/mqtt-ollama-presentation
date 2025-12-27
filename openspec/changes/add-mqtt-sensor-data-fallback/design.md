# Design Document: MQTT Sensor Data Fallback

## Context

The Z-Wave MCP server currently provides device listing and control tools, but **cannot read sensor data** (temperature, humidity, etc.). When users ask "What's the temperature?", the AI has no tool to answer.

ZWaveJSUI publishes sensor data to MQTT automatically, but the MCP server ignores this data source and only uses Socket.IO API for device metadata.

User explicitly requested:
- MQTT integration lives in MCP server (not voice-gateway)
- Prefer MQTT for sensor reads by default
- Fall back to ZWaveJSUI API when MQTT unavailable
- Make it configurable

## Goals

- Add `get_device_sensor_data` MCP tool for reading sensor values
- Integrate MQTT client in MCP server to subscribe to sensor topics
- Cache sensor data in memory for fast retrieval
- Prefer MQTT, gracefully fall back to API
- Make data source preference configurable

## Non-Goals

- Historical sensor data (time-series database, long-term storage)
- Sensor data aggregation or analytics
- MQTT publish capabilities for control commands (separate concern, may add later)
- Persistent cache across MCP server restarts

## Decisions

### Decision 1: MQTT Integration in MCP Server (Not Voice Gateway)

**Choice:** Implement MQTT client in `apps/zwave-mcp-server/src/mqtt-client.js`

**Rationale:**
- User explicitly requested all MQTT integration in MCP project
- MCP server is Z-Wave domain expert, voice-gateway is voice domain
- Separation of concerns: Z-Wave data access logic belongs in Z-Wave MCP server
- Easier to test and maintain (isolated scope)
- Voice-gateway doesn't need to know about Z-Wave MQTT topics

**Alternatives Considered:**
1. **MQTT in voice-gateway** - Violates separation of concerns, rejected by user
2. **Shared MQTT library** - Over-engineering, adds unnecessary abstraction

**Trade-offs:**
- Pro: Clean separation, easier testing, follows user requirements
- Con: None (this is the correct choice)

### Decision 2: MQTT as Primary Data Source

**Choice:** `PREFER_MQTT=true` by default, check MQTT cache before API

**Rationale:**
- MQTT is real-time pub/sub (lower latency than request/response API)
- ZWaveJSUI publishes sensor updates automatically to MQTT
- No polling overhead (MQTT pushes updates)
- Research confirms zwave-js-ui MQTT integration is stable and widely used

**Topic Pattern from zwave-js-ui:**
```
<prefix>/<location>/<device>/sensor_multilevel/endpoint_0/currentValue
Examples:
  zwave/office/temp_sensor_1/sensor_multilevel/endpoint_0/currentValue → {"value": 72.5}
  zwave//humidity_sensor/sensor_multilevel/endpoint_0/currentValue → {"value": 45}
```

**Alternatives Considered:**
1. **API-only** - Simpler but ignores real-time MQTT data, higher latency
2. **MQTT-only (no fallback)** - Fragile, fails if broker down

**Trade-offs:**
- Pro: Fastest data retrieval, real-time updates, lower system load
- Con: Adds MQTT dependency (mitigated by API fallback)

### Decision 3: In-Memory Cache (Not Persistent Storage)

**Choice:** `Map<deviceName, {value, timestamp, commandClass, unit}>` in memory

**Rationale:**
- Sensor data is ephemeral (changes frequently, 5-minute staleness is acceptable)
- No need for historical data (that's a separate analytics concern)
- Fast O(1) lookup for recent values
- Simple implementation (no database dependencies)
- MCP server process lifecycle matches cache lifecycle (restart clears cache, which is fine)

**Cache Entry Structure:**
```javascript
{
  deviceName: "Temp Sensor 1",
  value: 72.5,
  timestamp: 1704067200000,
  commandClass: 49, // sensor_multilevel
  unit: "°F",
  source: "MQTT"
}
```

**Staleness:**
- Values older than 5 minutes are considered stale
- Stale values trigger API fallback query
- This handles cases where MQTT broker goes down but data was recently cached

**Alternatives Considered:**
1. **Persistent cache (Redis, SQLite)** - Over-engineering, unnecessary complexity
2. **No cache (always query API)** - Defeats purpose of MQTT real-time updates
3. **Infinite cache (never expire)** - Stale data, bad UX

**Trade-offs:**
- Pro: Simple, fast, sufficient for real-time sensor reads
- Con: Cache lost on MCP server restart (not a problem, rebuilds in seconds from MQTT)

### Decision 4: Fallback Strategy

**Choice:** MQTT → API fallback with clear source annotation

**Query Flow:**
```
1. User asks "What's the temperature?"
2. AI calls get_device_sensor_data(deviceName="Temp Sensor 1")
3. MCP tool checks PREFER_MQTT config
4. If PREFER_MQTT=true:
   a. Check MQTT cache for "Temp Sensor 1"
   b. If found and fresh (<5 min): Return cached value (source: MQTT)
   c. If not found or stale: Query ZWaveJSUI API (source: API)
5. If PREFER_MQTT=false:
   a. Skip MQTT cache, query ZWaveJSUI API directly
6. Return value with source annotation
```

**Why Source Annotation:**
- Debugging: Know which data source was used
- Monitoring: Track MQTT vs API usage
- Logging: "Got temperature from MQTT cache (2 minutes old)"

**Error Handling:**
- MQTT unavailable + API fails → Return error "Unable to retrieve sensor data from any source"
- Device not found → Return error "Device 'XYZ' not found in Z-Wave network"
- No sensor data → Return error "Device 'XYZ' does not have sensor capabilities"

**Alternatives Considered:**
1. **API-only fallback** - Current behavior, no improvement
2. **Parallel query (MQTT + API, return first)** - Wasteful, unnecessary API calls
3. **MQTT-only (no fallback)** - Fragile, user rejected

**Trade-offs:**
- Pro: Best of both worlds (MQTT speed + API reliability)
- Con: Slightly more complex logic (mitigated by clear code structure)

### Decision 5: Configuration Options

**Choice:** Three configuration variables

```bash
MQTT_ENABLED=true           # Master switch: enable/disable MQTT entirely
PREFER_MQTT=true            # Data source preference: try MQTT first
MQTT_BROKER_URL=mqtt://...  # Already exists, reuse
```

**Behavior Matrix:**

| MQTT_ENABLED | PREFER_MQTT | Behavior |
|--------------|-------------|----------|
| true | true | MQTT cache → API fallback (DEFAULT) |
| true | false | API only (ignore MQTT cache) |
| false | * | API only (MQTT not initialized) |

**Why MQTT_ENABLED and PREFER_MQTT separate:**
- MQTT_ENABLED: Infrastructure-level (is MQTT available at all?)
- PREFER_MQTT: Application-level (which data source do we prefer?)
- Allows for "MQTT available but use API" scenario (testing, debugging)

**Alternatives Considered:**
1. **Single flag MQTT_OR_API=mqtt|api** - Less flexible, can't express "MQTT available but don't prefer"
2. **No config (always MQTT→API)** - Removes user control, rejected

**Trade-offs:**
- Pro: Maximum flexibility, clear semantics
- Con: Two config vars instead of one (acceptable for clarity)

## Risks / Trade-offs

### Risk: MQTT Broker Availability

**Impact:** If broker goes down, sensor queries fall back to API (slower but functional)

**Mitigation:**
- API fallback provides graceful degradation
- MQTT client implements reconnection logic
- Cache preserves last-known values for 5 minutes

### Risk: MQTT Topic Pattern Changes

**Impact:** If ZWaveJSUI changes MQTT topic format, subscription breaks

**Mitigation:**
- Use wildcard subscription (`zwave/+/+/sensor_multilevel/+/currentValue`) for flexibility
- Monitor zwave-js-ui releases for breaking changes
- Topic pattern documented in design.md for reference

### Risk: Cache Staleness

**Impact:** Sensor values older than 5 minutes may be stale

**Mitigation:**
- 5-minute timeout is configurable (can be adjusted if needed)
- API fallback refreshes stale values automatically
- Most sensors update more frequently than every 5 minutes

### Risk: Memory Usage

**Impact:** In-memory cache grows with number of devices

**Mitigation:**
- Typical home has <50 Z-Wave devices
- Each cache entry ~200 bytes → 10KB total for 50 devices (negligible)
- No unbounded growth (cache size = number of devices, finite)

## Migration Plan

**No data migration needed** - this is a new capability.

**Deployment:**
1. Install mqtt package: `npm install mqtt` in zwave-mcp-server
2. Update .env with MQTT_ENABLED=true, PREFER_MQTT=true
3. Restart zwave-mcp-server
4. MQTT client connects and subscribes to sensor topics
5. Cache builds automatically as sensor updates arrive

**Rollback:**
- Remove mqtt package
- Set MQTT_ENABLED=false
- Restart zwave-mcp-server
- System falls back to API-only mode (original behavior)

## Open Questions

**Q: Should we support MQTT publish for control commands?**
**A:** Not in this change. Control commands currently use ZWaveJSUI API. MQTT publish for control is a separate enhancement (may add later if needed).

**Q: Should we cache control command results?**
**A:** No. Control commands are write operations (on/off/dim). Only sensor reads (temperature, humidity) are cached.

**Q: What if device name has spaces or special characters?**
**A:** Device names from list_zwave_devices are normalized (replace spaces with underscores). MQTT topic uses normalized name. Tool accepts human-readable name and normalizes internally.
