# MQTT Broker Setup Guide

**[← Back to README][readme]** | **[Getting Started Guide][getting-started]** | **[ZWave-JS-UI Setup][zwave-deploy]**

---

This guide provides comprehensive instructions for setting up and configuring Mosquitto MQTT broker on Raspberry Pi for
home automation.

**What you'll learn:**

- Install and configure Mosquitto MQTT broker
- Set up authentication and security
- Integrate ZWave-JS-UI with MQTT
- Monitor and troubleshoot MQTT messages
- Understand MQTT topics and message structure

---

## Table of Contents

1. [What is MQTT?](#what-is-mqtt)
2. [Installing Mosquitto](#installing-mosquitto)
3. [Basic Configuration](#basic-configuration)
4. [Authentication Setup](#authentication-setup)
5. [ZWave-JS-UI Integration](#zwave-js-ui-integration)
6. [Testing MQTT](#testing-mqtt)
7. [Understanding Topics](#understanding-topics)
8. [Monitoring Tools](#monitoring-tools)
9. [Advanced Configuration](#advanced-configuration)
10. [Troubleshooting](#troubleshooting)

---

## What is MQTT?

**MQTT (Message Queuing Telemetry Transport)** is a lightweight messaging protocol designed for IoT and home automation.

### Why MQTT?

**Benefits for Home Automation:**

- ✅ **Lightweight** - Low bandwidth, perfect for Raspberry Pi
- ✅ **Publish/Subscribe** - Many clients can react to the same event
- ✅ **Retained Messages** - New clients get device state immediately
- ✅ **QoS Levels** - Guaranteed delivery when needed
- ✅ **Last Will** - Know when devices disconnect
- ✅ **Widely Supported** - Works with everything (ZWave, Zigbee, ESP32, etc.)

### How MQTT Works

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│ Publisher   │────────>│ MQTT Broker  │<────────│ Subscriber   │
│ (ZWave-UI)  │ Publish │ (Mosquitto)  │ Sub     │ (Oracle App) │
└─────────────┘         └──────────────┘         └──────────────┘
                               │
                               │ Topic: zwave/living-room/switch
                               │ Payload: {"value": true}
                               │
                        ┌──────▼──────┐
                        │ Subscriber  │
                        │ (Voice GW)  │
                        └─────────────┘
```

**Key Concepts:**

- **Broker:** Central server that routes messages (Mosquitto)
- **Publisher:** Sends messages to topics (ZWave-JS-UI)
- **Subscriber:** Listens to topics (Oracle app, Voice gateway)
- **Topic:** Address for messages (`zwave/living-room/switch`)
- **Payload:** Message content (usually JSON)
- **QoS:** Quality of Service (0, 1, or 2)
- **Retained:** Last message saved for new subscribers

---

## Installing Mosquitto

### Install on Raspberry Pi

```bash
# Update package list
sudo apt update

# Install Mosquitto broker and client tools
sudo apt install -y mosquitto mosquitto-clients

# Verify installation
mosquitto -h
mosquitto_sub --help
mosquitto_pub --help
```

### Verify Service

```bash
# Check if Mosquitto is running
sudo systemctl status mosquitto

# Enable auto-start on boot
sudo systemctl enable mosquitto

# Start the service
sudo systemctl start mosquitto
```

**Expected Output:**

```
● mosquitto.service - Mosquitto MQTT Broker
   Loaded: loaded (/lib/systemd/system/mosquitto.service; enabled)
   Active: active (running) since ...
```

---

## Basic Configuration

### Default Configuration

By default, Mosquitto:

- Listens only on `localhost:1883` (not accessible from network)
- Requires authentication (no anonymous access)
- Has minimal logging

We need to customize this for home automation.

### Create Custom Configuration

```bash
# Create custom config directory
sudo mkdir -p /etc/mosquitto/conf.d

# Create custom configuration file
sudo nano /etc/mosquitto/conf.d/custom.conf
```

### Development Configuration (No Auth)

**Use this for initial setup and testing:**

```conf
# ===============================================
# Mosquitto MQTT Broker - Development Config
# ===============================================
# WARNING: This allows anonymous access
# DO NOT use in production or exposed to internet
# ===============================================

# Allow connections without username/password
allow_anonymous true

# Listen on all network interfaces (not just localhost)
listener 1883 0.0.0.0

# Enable message persistence (survive broker restarts)
persistence true
persistence_location /var/lib/mosquitto/

# Logging configuration
log_dest file /var/log/mosquitto/mosquitto.log
log_dest stdout
log_type error
log_type warning
log_type notice
log_type information

# Log client connections and disconnections
connection_messages true

# Allow retained messages (important for device state)
retain_available true

# Maximum queued messages per client
max_queued_messages 1000

# Allow clients to set their own client ID
allow_zero_length_clientid false
```

**Save and restart:**

```bash
# Test configuration syntax
sudo mosquitto -c /etc/mosquitto/mosquitto.conf -v

# Restart Mosquitto
sudo systemctl restart mosquitto

# Check status
sudo systemctl status mosquitto
```

---

## Authentication Setup

### Why Authentication?

**Security reasons:**

- Prevent unauthorized device control
- Isolate different clients (zwave, oracle, voice-gateway)
- Audit who published what message
- Comply with security best practices

### Create Password File

```bash
# Create password file for user 'zwave'
sudo mosquitto_passwd -c /etc/mosquitto/passwd zwave
# Enter password when prompted

# Add user 'oracle'
sudo mosquitto_passwd /etc/mosquitto/passwd oracle

# Add user 'voice-gateway'
sudo mosquitto_passwd /etc/mosquitto/passwd voice-gateway

# Verify users were created
sudo cat /etc/mosquitto/passwd
```

**Expected output:**

```
zwave:$7$101$hashed_password...
oracle:$7$101$hashed_password...
voice-gateway:$7$101$hashed_password...
```

### Update Configuration for Auth

Edit the config file:

```bash
sudo nano /etc/mosquitto/conf.d/custom.conf
```

**Production Configuration (With Auth):**

```conf
# ===============================================
# Mosquitto MQTT Broker - Production Config
# ===============================================
# Uses password authentication
# ===============================================

# Disable anonymous access
allow_anonymous false

# Use password file for authentication
password_file /etc/mosquitto/passwd

# Listen on all network interfaces
listener 1883 0.0.0.0

# Enable message persistence
persistence true
persistence_location /var/lib/mosquitto/

# Logging configuration
log_dest file /var/log/mosquitto/mosquitto.log
log_dest stdout
log_type error
log_type warning
log_type notice
log_type information
log_timestamp true

# Log client connections and disconnections
connection_messages true

# Allow retained messages
retain_available true

# Maximum queued messages per client
max_queued_messages 1000

# Maximum message size (10MB)
message_size_limit 10485760

# Client connection limits
max_connections 100
```

**Restart Mosquitto:**

```bash
sudo systemctl restart mosquitto

# Check for errors
sudo journalctl -u mosquitto -n 20
```

---

## ZWave-JS-UI Integration

### Configure MQTT in ZWave-JS-UI

1. **Open Web Interface:**
   ```
   http://<pi-ip>:8091
   ```

2. **Navigate to Settings:**
    - Click **Settings** in left sidebar
    - Click **MQTT** tab

3. **Basic Settings:**

   | Field | Value | Description |
      |-------|-------|-------------|
   | **Name** | `Mosquitto Local` | Friendly name |
   | **Host** | `localhost` or `127.0.0.1` | MQTT broker address |
   | **Port** | `1883` | Default MQTT port |
   | **Reconnect Period** | `3000` | Reconnect delay (ms) |
   | **Prefix** | `zwave` | Topic prefix |

4. **Authentication (if enabled):**

   | Field | Value |
      |-------|-------|
   | **Username** | `zwave` |
   | **Password** | `your-password` |

   Leave blank if using anonymous mode.

5. **Advanced Settings:**

   | Field | Value | Description |
      |-------|-------|-------------|
   | **QoS** | `1` | At-least-once delivery |
   | **Retain** | `true` | Retain device state messages |
   | **Clean** | `true` | Clean session on connect |

6. **Gateway Settings:**

   Toggle **Gateway Enabled** to **ON**

   | Field | Value | Description |
      |-------|-------|-------------|
   | **Gateway Type** | `Manual` | Manual device control |
   | **Payload Type** | `JSON with time` | Include timestamp |
   | **Send Z-Wave Events** | `ON` | Publish state changes |
   | **Include Node Info** | `ON` | Include device metadata |

7. **Click Save**

   You should see:
    - ✅ Green success message
    - ✅ Connection status: **Connected**

### Verify Connection

```bash
# In a terminal, subscribe to ZWave topics
mosquitto_sub -h localhost -t "zwave/#" -v

# With authentication:
mosquitto_sub -h localhost -t "zwave/#" -v -u zwave -P your-password
```

Now toggle a device in ZWave-JS-UI and watch messages appear.

---

## Testing MQTT

### Two-Terminal Test

**Terminal 1 - Subscriber (listen for messages):**

```bash
# Subscribe to test topic
mosquitto_sub -h localhost -t "test/topic" -v

# With auth:
mosquitto_sub -h localhost -t "test/topic" -v -u oracle -P your-password
```

**Terminal 2 - Publisher (send messages):**

```bash
# Publish a message
mosquitto_pub -h localhost -t "test/topic" -m "Hello MQTT!"

# With auth:
mosquitto_pub -h localhost -t "test/topic" -m "Hello MQTT!" -u oracle -P your-password
```

**Expected in Terminal 1:**

```
test/topic Hello MQTT!
```

### Test Retained Messages

```bash
# Publish with retain flag
mosquitto_pub -h localhost -t "device/state" -m "online" -r

# New subscriber gets last message immediately
mosquitto_sub -h localhost -t "device/state" -v
# Output: device/state online (appears immediately)
```

### Test QoS Levels

```bash
# QoS 0 (fire and forget - fastest)
mosquitto_pub -h localhost -t "test" -m "qos0" -q 0

# QoS 1 (at least once - guaranteed delivery)
mosquitto_pub -h localhost -t "test" -m "qos1" -q 1

# QoS 2 (exactly once - slowest, most reliable)
mosquitto_pub -h localhost -t "test" -m "qos2" -q 2
```

**QoS Recommendations:**

- **QoS 0:** Non-critical updates (temperature readings)
- **QoS 1:** Important events (motion detection, device commands)
- **QoS 2:** Critical operations (security system, locks)

---

## Understanding Topics

### Topic Structure

MQTT topics use `/` as hierarchical separator:

```
<prefix>/<location>/<device>/<attribute>
```

### ZWave-JS-UI Topic Format

```
zwave/<node_name>/<command_class>/<property>/set
```

**Examples:**

```bash
# Binary switch (on/off light)
zwave/Living Room Light/switch_binary/currentValue/set

# Multilevel switch (dimmer)
zwave/Bedroom Dimmer/switch_multilevel/currentValue/set

# Sensor reading
zwave/Temperature Sensor/sensor_multilevel/Air temperature/set

# Device status
zwave/Living Room Light/status
```

### Topic Wildcards

When subscribing, use wildcards to match multiple topics:

```bash
# + matches one level
mosquitto_sub -t "zwave/+/status"
# Matches: zwave/Light1/status, zwave/Switch2/status
# Doesn't match: zwave/room/Light1/status

# # matches all remaining levels
mosquitto_sub -t "zwave/#"
# Matches: zwave/Light1/status, zwave/room/Light1/status, etc.

# Subscribe to ALL topics (useful for debugging)
mosquitto_sub -t "#" -v
```

### Message Payloads

ZWave-JS-UI sends JSON payloads:

```json
{
  "time": 1697558400,
  "value": true
}
```

**Device state update:**

```json
{
  "status": "alive",
  "lastSeen": 1697558400
}
```

**Sensor data:**

```json
{
  "time": 1697558400,
  "value": 72.5,
  "unit": "°F"
}
```

---

## Monitoring Tools

### 1. Command Line (mosquitto_sub)

**Basic monitoring:**

```bash
# All messages (verbose)
mosquitto_sub -h localhost -t "#" -v

# Only ZWave messages
mosquitto_sub -h localhost -t "zwave/#" -v

# Specific device
mosquitto_sub -h localhost -t "zwave/Living Room Light/#" -v

# With timestamp
mosquitto_sub -h localhost -t "zwave/#" -v -F "%I:%M:%S %t %p"
```

**Advanced filtering:**

```bash
# Only status messages
mosquitto_sub -h localhost -t "zwave/+/status" -v

# Only switch commands
mosquitto_sub -h localhost -t "zwave/+/switch_binary/#" -v
```

### 2. MQTT Explorer (GUI Tool)

**Best for visual exploration of topics.**

**Installation (on your laptop, not Pi):**

1. Download from: https://mqtt-explorer.com/
2. Install for your OS (Windows, macOS, Linux)

**Connect to Pi:**

- **Host:** `<pi-ip>`
- **Port:** `1883`
- **Username/Password:** (if configured)
- Click **Connect**

**Features:**

- ✅ Visual topic tree
- ✅ Message history
- ✅ Publish messages
- ✅ Payload formatting (JSON, text, hex)
- ✅ Real-time updates

### 3. Mosquitto Log Files

```bash
# View real-time logs
sudo tail -f /var/log/mosquitto/mosquitto.log

# View last 100 lines
sudo tail -n 100 /var/log/mosquitto/mosquitto.log

# Search for errors
sudo grep ERROR /var/log/mosquitto/mosquitto.log

# View connections
sudo grep "New connection" /var/log/mosquitto/mosquitto.log
```

### 4. Node-RED (Advanced Automation)

**Install Node-RED:**

```bash
# Install globally
sudo npm install -g --unsafe-perm node-red

# Start Node-RED
node-red

# Access at: http://<pi-ip>:1880
```

**Use Node-RED to:**

- Create visual MQTT workflows
- Transform messages
- Create automation rules
- Debug message flow

---

## Advanced Configuration

### Access Control Lists (ACLs)

Restrict which users can access which topics.

**Create ACL file:**

```bash
sudo nano /etc/mosquitto/acl
```

**Example ACL:**

```conf
# User 'zwave' can read/write all zwave topics
user zwave
topic readwrite zwave/#

# User 'oracle' can read all topics, write to oracle topics
user oracle
topic read #
topic write oracle/#

# User 'voice-gateway' can read zwave, write to voice topics
user voice-gateway
topic read zwave/#
topic write voice/#
```

**Enable ACL in config:**

```bash
sudo nano /etc/mosquitto/conf.d/custom.conf
```

Add:

```conf
# Use ACL file
acl_file /etc/mosquitto/acl
```

**Restart Mosquitto:**

```bash
sudo systemctl restart mosquitto
```

### WebSocket Support

Allow browser clients to connect via WebSocket.

**Edit config:**

```bash
sudo nano /etc/mosquitto/conf.d/custom.conf
```

**Add WebSocket listener:**

```conf
# WebSocket listener on port 9001
listener 9001
protocol websockets

# Or use path-based routing with reverse proxy
listener 8080
protocol websockets
http_dir /var/www/mosquitto
```

**Restart:**

```bash
sudo systemctl restart mosquitto
```

**Test WebSocket:**

```javascript
// In browser console
const client = new Paho.MQTT.Client("ws://<pi-ip>:9001", "clientId");
client.connect({onSuccess: () => console.log("Connected!")});
```

### Bridge to Cloud MQTT

Connect local broker to cloud MQTT service (AWS IoT, HiveMQ Cloud, etc.)

**Example bridge config:**

```conf
# Bridge to HiveMQ Cloud
connection hivemq-bridge
address <cluster-id>.s1.eu.hivemq.cloud:8883
remote_username <your-username>
remote_password <your-password>
bridge_cafile /etc/ssl/certs/ca-certificates.crt
bridge_tls_version tlsv1.2

# Forward local zwave topics to cloud
topic zwave/# out 1

# Subscribe to cloud commands
topic cloud/commands/# in 1
```

### Logging Levels

**Adjust logging verbosity:**

```conf
# Minimal logging (production)
log_type error
log_type warning

# Verbose logging (debugging)
log_type error
log_type warning
log_type notice
log_type information
log_type debug
log_type subscribe
log_type unsubscribe
```

### Performance Tuning

**For high-traffic setups:**

```conf
# Increase maximum connections
max_connections 1000

# Increase message queue per client
max_queued_messages 10000

# Increase max message size (50MB)
message_size_limit 52428800

# Disable persistence for speed (lose messages on restart)
persistence false
```

---

## Troubleshooting

### Mosquitto Won't Start

**Check logs:**

```bash
sudo journalctl -u mosquitto -n 50
```

**Common issues:**

**1. Port already in use:**

```bash
# Check what's using port 1883
sudo lsof -i :1883

# Kill the process
sudo kill <PID>
```

**2. Configuration syntax error:**

```bash
# Test configuration
sudo mosquitto -c /etc/mosquitto/mosquitto.conf -v

# Look for errors like:
# Error: Unknown configuration variable
```

**3. Permission errors:**

```bash
# Fix ownership
sudo chown -R mosquitto:mosquitto /var/lib/mosquitto
sudo chmod 755 /var/lib/mosquitto

# Fix log permissions
sudo chown mosquitto:mosquitto /var/log/mosquitto/mosquitto.log
sudo chmod 644 /var/log/mosquitto/mosquitto.log
```

### Connection Refused

**Symptom:** `Connection refused` when connecting

**Solutions:**

```bash
# 1. Check if Mosquitto is running
sudo systemctl status mosquitto

# 2. Check listener configuration
sudo grep listener /etc/mosquitto/conf.d/custom.conf
# Should show: listener 1883 0.0.0.0

# 3. Test from localhost first
mosquitto_sub -h localhost -t "test" -v

# 4. Test from network
mosquitto_sub -h <pi-ip> -t "test" -v

# 5. Check firewall
sudo ufw status
sudo ufw allow 1883/tcp
```

### Authentication Errors

**Symptom:** `Connection error: Not authorized`

**Solutions:**

```bash
# 1. Verify password file exists
sudo cat /etc/mosquitto/passwd

# 2. Reset password
sudo mosquitto_passwd /etc/mosquitto/passwd zwave

# 3. Check allow_anonymous setting
sudo grep allow_anonymous /etc/mosquitto/conf.d/custom.conf

# 4. Verify password_file path in config
sudo grep password_file /etc/mosquitto/conf.d/custom.conf

# 5. Restart Mosquitto
sudo systemctl restart mosquitto
```

### No Messages Appearing

**Symptom:** Subscribed but not receiving messages

**Solutions:**

```bash
# 1. Subscribe to ALL topics
mosquitto_sub -h localhost -t "#" -v

# 2. Check if publisher is connected
# Look for "New connection" in logs
sudo tail -f /var/log/mosquitto/mosquitto.log

# 3. Verify topic name matches exactly
# Topics are case-sensitive!

# 4. Try different QoS levels
mosquitto_sub -h localhost -t "test" -q 0 -v
mosquitto_sub -h localhost -t "test" -q 1 -v

# 5. Check for ACL restrictions
sudo cat /etc/mosquitto/acl
```

### ZWave-JS-UI Disconnected

**Symptom:** ZWave-JS-UI shows "MQTT Disconnected"

**Solutions:**

```bash
# 1. Verify Mosquitto is running
sudo systemctl status mosquitto

# 2. Test connection manually
mosquitto_sub -h localhost -t "test" -v

# 3. Check credentials match
# ZWave-JS-UI username/password must match Mosquitto passwd file

# 4. Check host and port in ZWave-JS-UI
# Settings → MQTT → Host: localhost, Port: 1883

# 5. Check ZWave-JS-UI logs
sudo journalctl -u zwave-js-ui -n 50

# 6. Restart ZWave-JS-UI
sudo systemctl restart zwave-js-ui
```

### High CPU Usage

**Symptom:** Mosquitto using high CPU

**Causes:**

- Too many log messages
- Thousands of retained messages
- Message loops (clients republishing to same topic)

**Solutions:**

```bash
# 1. Reduce logging
sudo nano /etc/mosquitto/conf.d/custom.conf
# Change to:
log_type error
log_type warning

# 2. Clear retained messages
mosquitto_sub -h localhost -t "#" -v --retained-only --remove-retained

# 3. Reduce max queued messages
max_queued_messages 100

# 4. Check for message loops
# Monitor topics for rapid republishing
mosquitto_sub -h localhost -t "#" -v -F "%I:%M:%S.%U %t %p"

# 5. Restart Mosquitto
sudo systemctl restart mosquitto
```

### High Memory Usage

**Symptom:** Mosquitto using too much RAM

**Solutions:**

```bash
# 1. Disable persistence
persistence false

# 2. Reduce max queued messages
max_queued_messages 100

# 3. Set max message size limit
message_size_limit 1048576  # 1MB

# 4. Clear old retained messages
mosquitto_sub -h localhost -t "#" --retained-only --remove-retained

# 5. Restart Mosquitto
sudo systemctl restart mosquitto
```

---

## Quick Reference

### Common Commands

```bash
# Service Management
sudo systemctl start mosquitto
sudo systemctl stop mosquitto
sudo systemctl restart mosquitto
sudo systemctl status mosquitto
sudo systemctl enable mosquitto

# Password Management
sudo mosquitto_passwd -c /etc/mosquitto/passwd username  # Create
sudo mosquitto_passwd /etc/mosquitto/passwd username     # Add/update
sudo mosquitto_passwd -D /etc/mosquitto/passwd username  # Delete

# Testing
mosquitto_sub -h localhost -t "topic" -v
mosquitto_pub -h localhost -t "topic" -m "message"

# With authentication
mosquitto_sub -h localhost -t "topic" -v -u user -P pass
mosquitto_pub -h localhost -t "topic" -m "msg" -u user -P pass

# Monitoring
sudo tail -f /var/log/mosquitto/mosquitto.log
sudo journalctl -u mosquitto -f
```

### Configuration Files

| File                                | Purpose                  |
|-------------------------------------|--------------------------|
| `/etc/mosquitto/mosquitto.conf`     | Main config (don't edit) |
| `/etc/mosquitto/conf.d/custom.conf` | Custom config            |
| `/etc/mosquitto/passwd`             | Password file            |
| `/etc/mosquitto/acl`                | Access control list      |
| `/var/log/mosquitto/mosquitto.log`  | Log file                 |
| `/var/lib/mosquitto/`               | Persistence directory    |

### Default Ports

| Port | Protocol | Purpose          |
|------|----------|------------------|
| 1883 | TCP      | Standard MQTT    |
| 8883 | TCP      | MQTT over TLS    |
| 9001 | WS       | WebSocket MQTT   |
| 8080 | WSS      | Secure WebSocket |

---

## Next Steps

**After setting up MQTT:**

1. **Integrate with Oracle App**
    - Configure MQTT client in Oracle app
    - Subscribe to ZWave device topics
    - Publish device control commands

2. **Set Up Voice Gateway**
    - Connect voice gateway to MQTT
    - Subscribe to transcription topics
    - Publish AI responses

3. **Create Automation Rules**
    - Use Node-RED for complex workflows
    - Set up time-based automations
    - Create device trigger rules

4. **Harden Security**
    - Enable authentication (if not already)
    - Set up ACLs for topic access control
    - Configure TLS/SSL for encrypted connections

5. **Monitor and Optimize**
    - Use MQTT Explorer to visualize topics
    - Monitor logs for errors
    - Tune performance settings

---

**Last Updated:** October 17, 2025

**[← Back to README][readme]** | **[Getting Started Guide][getting-started]** | **[View All Documentation][docs-dir]**

---

<!-- Reference Links - All links defined here for easy maintenance -->

<!-- Main Documentation -->

[readme]: ../README.md

[docs-dir]: .

[getting-started]: GETTING-STARTED.md

<!-- Setup Guides -->

[zwave-deploy]: zwave-js-ui-deploy.md

[oracle-setup]: oracle-systemd-setup.md

[pi-setup]: raspberry-pi-setup.md

<!-- External Resources -->

[mqtt-org]: https://mqtt.org/

[mosquitto-docs]: https://mosquitto.org/documentation/

[mqtt-explorer]: https://mqtt-explorer.com/

[hivemq-guide]: https://www.hivemq.com/mqtt-essentials/
