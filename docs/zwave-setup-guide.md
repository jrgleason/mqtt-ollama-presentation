# Z-Wave Integration Guide

**Last Updated:** 2025-10-22
**Status:** 🔴 DEMO CRITICAL

This guide covers the complete Z-Wave setup including zwave-js-ui deployment, device pairing, MQTT configuration, and MCP server integration.

---

## Quick Reference

**Components:**
- **zwave-js-ui:** Web UI + MQTT gateway for Z-Wave devices
- **Z-Wave Controller:** USB stick (e.g., Aeotec Z-Stick 7, Zooz ZST10)
- **MQTT Broker:** HiveMQ CE at `localhost:1883`
- **MCP Server:** Optional TypeScript bridge for Claude integration

---

## Part 1: zwave-js-ui Setup

### Prerequisites

- Raspberry Pi 5 with Raspberry Pi OS
- Z-Wave USB controller
- Docker installed
- MQTT broker running (HiveMQ)

### Installation

**Option 1: Docker (Recommended)**

```bash
# Create docker-compose.yml
cat > docker-compose-zwave.yml <<EOF
version: '3'
services:
  zwave-js-ui:
    image: zwavejs/zwave-js-ui:latest
    container_name: zwave-js-ui
    restart: always
    tty: true
    stop_signal: SIGINT
    environment:
      - SESSION_SECRET=mySecretKey
      - ZWAVEJS_EXTERNAL_CONFIG=/usr/src/app/store/.config-db
    ports:
      - "8091:8091"  # Web UI
      - "3000:3000"  # WebSocket
    devices:
      - '/dev/ttyUSB0:/dev/ttyUSB0'  # Z-Wave controller
    volumes:
      - zwave-config:/usr/src/app/store
    networks:
      - zwave

volumes:
  zwave-config:

networks:
  zwave:
EOF

# Start service
docker-compose -f docker-compose-zwave.yml up -d
```

**Option 2: Systemd Service**

```bash
# Install globally with npm
sudo npm install -g @zwave-js/zwave-js-ui

# Create systemd service
sudo tee /etc/systemd/system/zwave-js-ui.service <<EOF
[Unit]
Description=zwave-js-ui
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/usr/local/bin/zwave-js-ui-server
Restart=always
Environment="ZWAVEJS_EXTERNAL_CONFIG=/home/pi/.zwave-js-ui"

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable zwave-js-ui
sudo systemctl start zwave-js-ui
```

### Access Web UI

Navigate to: `http://<pi-ip>:8091`

Default credentials: None (set on first access)

---

## Part 2: Z-Wave Controller Setup

### 1. Identify USB Controller

```bash
# List USB devices
lsusb

# Check device path
ls -l /dev/ttyUSB* /dev/ttyACM*

# Common paths:
# /dev/ttyUSB0  - Most USB controllers
# /dev/ttyACM0  - Aeotec Z-Stick 7
```

### 2. Configure Controller in zwave-js-ui

1. Open web UI: `http://<pi-ip>:8091`
2. Go to: **Settings** → **Z-Wave**
3. **Serial Port:** `/dev/ttyUSB0` (or `/dev/ttyACM0`)
4. **Network Key:** Generate new (for secure devices)
5. **Save** and wait for controller to initialize

### 3. Verify Controller Status

- Check **Control Panel** for controller status
- Should show: "Driver Ready" or "All Nodes Ready"

---

## Part 3: Device Pairing

### Add a Device (Inclusion)

1. **In zwave-js-ui:**
   - Go to **Control Panel**
   - Click **Start Inclusion** (Non-Secure or S2)

2. **On the device:**
   - Follow manufacturer instructions (usually press button 3x)
   - Wait for interview to complete (~30 seconds)

3. **Verify:**
   - Device appears in **Nodes** list
   - Node interview complete (green checkmark)

### Remove a Device (Exclusion)

1. Click **Start Exclusion**
2. Trigger device exclusion mode (usually same as inclusion)
3. Wait for confirmation

### Troubleshooting Pairing

**Device won't pair:**
- Move device closer to controller (<3 feet for initial pairing)
- Try exclusion first, then inclusion
- Reset device to factory defaults

**Interview stuck:**
- Wake device manually (for battery devices)
- Remove and re-add device
- Check Z-Wave network health

---

## Part 4: MQTT Gateway Configuration

### 1. Enable MQTT in zwave-js-ui

1. Go to: **Settings** → **MQTT**
2. **Enable MQTT:** ✅ Checked
3. **Broker Configuration:**
   - **Host:** `10.0.0.58` (or `localhost` if running locally)
   - **Port:** `31883` (or `1883`)
   - **Username/Password:** (leave empty for demo, configure for production)
4. **MQTT Settings:**
   - **Prefix:** `zwave`
   - **Name:** Friendly names for topics (recommended: ✅)
   - **Payload Type:** JSON Time-Value
5. **Gateway Settings:**
   - **Send Z-Wave Events:** ✅ Checked
   - **Include Node Info:** ✅ Checked
6. **Save** and restart zwave-js-ui

### 2. Verify MQTT Topics

```bash
# Subscribe to all Z-Wave topics
mosquitto_sub -h 10.0.0.58 -p 31883 -t 'zwave/#' -v

# Expected output:
# zwave/Living_Room/switch_binary/endpoint_0/currentValue {"time":1234567890,"value":true}
# zwave/Kitchen_Light/switch_multilevel/endpoint_0/currentValue {"time":1234567890,"value":75}
```

### 3. MQTT Topic Patterns

**State Updates (Subscribe):**
```
zwave/{Location/Device_Name}/command_class/endpoint_0/currentValue
```

**Control Commands (Publish):**
```
zwave/{Location/Device_Name}/command_class/endpoint_0/targetValue/set
```

**Command Classes:**
- `37` → `switch_binary` (On/Off switches)
- `38` → `switch_multilevel` (Dimmers, 0-100%)
- `49` → `sensor_multilevel` (Temperature, light sensors)
- `64` → `thermostat_mode` (Thermostats)

**Example Control:**
```bash
# Turn on switch
mosquitto_pub -h 10.0.0.58 -p 31883 \
  -t 'zwave/Living_Room/switch_binary/endpoint_0/targetValue/set' \
  -m '{"value":true}'

# Set dimmer to 50%
mosquitto_pub -h 10.0.0.58 -p 31883 \
  -t 'zwave/Kitchen_Light/switch_multilevel/endpoint_0/targetValue/set' \
  -m '{"value":50}'
```

---

## Part 5: Integration with Oracle App

### 1. Device Discovery

**Manual Entry (Quick):**

1. Note device names from zwave-js-ui
2. Add to Prisma database:

```javascript
// seed-devices.js
await prisma.device.createMany({
  data: [
    {
      name: "Living Room Light",
      type: "switch",
      location: "Living Room",
      state: "off",
      nodeId: 3,
      mqttTopic: "zwave/Living_Room/switch_binary/endpoint_0/targetValue/set"
    },
    {
      name: "Kitchen Dimmer",
      type: "dimmer",
      location: "Kitchen",
      state: "off",
      level: 0,
      nodeId: 5,
      mqttTopic: "zwave/Kitchen_Light/switch_multilevel/endpoint_0/targetValue/set"
    }
  ]
});
```

### 2. Update LangChain Tools

**Device List Tool:**
```javascript
// Read from Prisma instead of mocks
const devices = await prisma.device.findMany();
return JSON.stringify(devices);
```

**Device Control Tool:**
```javascript
// Publish to MQTT
const device = await prisma.device.findFirst({ where: { name: { contains: deviceName } } });
await mqttClient.publish(device.mqttTopic, JSON.stringify({ value: action === 'on' }));
```

### 3. Optional: Subscribe to State Updates

```javascript
// Update DB when device state changes
mqttClient.subscribe('zwave/+/+/+/currentValue');

mqttClient.on('message', async (topic, message) => {
  const payload = JSON.parse(message.toString());
  const deviceName = topic.split('/')[1];

  await prisma.device.update({
    where: { name: deviceName },
    data: {
      state: payload.value ? 'on' : 'off',
      level: payload.value
    }
  });
});
```

---

## Part 6: MCP Server (Optional)

The Z-Wave MCP Server provides a Model Context Protocol interface for Claude Desktop/Code to control Z-Wave devices.

### Setup

```bash
cd apps/zwave-mcp-server
npm install
npm run build
npm start
```

### Configure in Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zwave": {
      "command": "node",
      "args": ["/path/to/apps/zwave-mcp-server/dist/index.js"],
      "env": {
        "MQTT_BROKER_URL": "mqtt://10.0.0.58:31883",
        "ZWAVE_UI_URL": "http://10.0.0.58:8091"
      }
    }
  }
}
```

### Available MCP Tools

- `list_zwave_devices` - List all Z-Wave devices
- `control_zwave_device` - Turn device on/off or set level
- `get_device_status` - Get current device state

### MCP Findings

**Observations from integration:**
- MCP provides clean separation between AI and device control
- Useful for multi-client scenarios (Claude Desktop + Oracle app)
- MQTT remains the source of truth
- See `docs/zwave-mcp-findings.md` for detailed observations

---

## Testing Checklist

- [ ] zwave-js-ui web UI accessible
- [ ] Z-Wave controller initialized
- [ ] At least one device paired and interviewed
- [ ] MQTT broker receiving Z-Wave topics
- [ ] Manual device control via `mosquitto_pub` works
- [ ] Oracle app can list devices from database
- [ ] Oracle app can control device via MQTT
- [ ] (Optional) MCP server running and responding

---

## Troubleshooting

### zwave-js-ui Won't Start

**Docker:**
```bash
# Check logs
docker logs zwave-js-ui

# Common issues:
# - USB device not accessible (add --device flag)
# - Port 8091 already in use (change port mapping)
```

**Systemd:**
```bash
# Check status
systemctl status zwave-js-ui

# View logs
journalctl -u zwave-js-ui -n 100 --no-pager
```

### No MQTT Topics

1. Verify MQTT enabled in zwave-js-ui settings
2. Check broker address and port
3. Test broker connection: `mosquitto_sub -h <broker> -p <port> -t '#' -v`
4. Restart zwave-js-ui after MQTT config changes

### Device Not Responding to Commands

1. Verify topic structure matches zwave-js-ui configuration
2. Check payload format: `{"value": true}` not just `true`
3. Test with `mosquitto_pub` first
4. Check device is awake (for battery devices)
5. Verify QoS level (use QoS 1 for reliability)

### MCP Server Issues

1. Check MQTT connection in MCP server logs
2. Verify zwave-js-ui API is accessible
3. Test tools with MCP Inspector
4. Check Claude Desktop logs for errors

---

## Production Considerations

### Security

- **MQTT:** Enable authentication and TLS
- **zwave-js-ui:** Set admin password
- **Network:** Firewall rules to restrict access
- **Z-Wave:** Use S2 security for sensitive devices

### Reliability

- **MQTT QoS:** Use QoS 1 for device commands
- **Reconnection:** Implement auto-reconnect in MQTT client
- **Monitoring:** Add health checks for zwave-js-ui
- **Backups:** Backup zwave-js-ui configuration regularly

### Performance

- **Topic Filtering:** Subscribe only to needed topics
- **Batching:** Batch multiple commands when possible
- **Caching:** Cache device states to reduce DB queries

---

## References

- **zwave-js-ui GitHub:** https://github.com/zwave-js/zwave-js-ui
- **zwave-js-ui Documentation:** https://zwave-js.github.io/zwave-js-ui/
- **Z-Wave Command Classes:** https://www.silabs.com/documents/login/user-guides/INS12350-Serial-API-Host-Appl.-Prg.-Guide.pdf
- **MQTT Topics:** See zwave-js-ui Settings → MQTT → Topic Structure
- **MCP Server README:** `/apps/zwave-mcp-server/README.md`

---

**Related Documentation:**
- **MCP Architecture:** `/docs/mcp-architecture.md`
- **MQTT Setup:** `/docs/mqtt-setup.md`
- **MCP Setup Guide:** `/docs/mqtt-mcp-setup.md`
- **Performance Optimization:** `/docs/performance-optimization.md`
