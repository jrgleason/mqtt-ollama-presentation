# Raspberry Pi 5 Setup Guide

**Hardware:**
- Raspberry Pi 5 (8GB recommended)
- Aeotec Z-Pi 7 HAT (Z-Wave 700 series controller)
- MicroSD card (32GB+ recommended)

**Software Stack:**
- Raspberry Pi OS (64-bit)
- zwave-js-ui (Z-Wave MQTT gateway)
- Ollama (Local LLM runtime)
- Qwen2.5:3b model

---

## Table of Contents

1. [Initial Pi Setup](#initial-pi-setup)
2. [Z-Pi 7 HAT Configuration](#z-pi-7-hat-configuration)
3. [ZWaveJsUI Installation](#zwavejsui-installation)
4. [Mosquitto MQTT Broker Installation](#mosquitto-mqtt-broker-installation)
5. [Ollama Installation](#ollama-installation)
6. [Testing & Verification](#testing--verification)
7. [Troubleshooting](#troubleshooting)

---

## Initial Pi Setup

### 1. Flash Raspberry Pi OS

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Flash **Raspberry Pi OS (64-bit)** to microSD card
3. Enable SSH and set hostname during imaging process

### 2. First Boot Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y git curl wget vim nano build-essential

# Install Node.js (required for zwave-js-ui)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node --version  # Should be v20.x
npm --version
```

---

## Z-Pi 7 HAT Configuration

The Aeotec Z-Pi 7 uses the GPIO UART (`/dev/ttyAMA0`) which conflicts with the Linux console by default.

### 1. Disable Bluetooth (Required for Pi 5)

Edit boot configuration:

```bash
sudo nano /boot/firmware/config.txt
```

Add these lines at the end under `[all]`:

```ini
[all]
dtoverlay=disable-bt-pi5
enable_uart=1
```

**Explanation:**
- `disable-bt-pi5`: Frees up the UART from Bluetooth
- `enable_uart=1`: Enables the primary UART for serial communication

### 2. Disable Serial Console (Critical!)

The Linux console outputs to `serial0` (alias for `ttyAMA0`), which interferes with Z-Wave communication.

Edit kernel command line:

```bash
sudo nano /boot/firmware/cmdline.txt
```

**Remove** `console=serial0,115200` from the line. The file should look like:

```
console=tty1 root=PARTUUID=fd281b1c-02 rootfstype=ext4 fsck.repair=yes rootwait quiet splash plymouth.ignore-serial-consoles cfg80211.ieee80211_regdom=GB
```

**Quick fix command:**

```bash
sudo sed -i 's/console=serial0,115200 //' /boot/firmware/cmdline.txt
```

### 3. Set Permissions for Serial Port

```bash
# Add your user to dialout group (allows access to serial ports)
sudo usermod -a -G dialout $USER

# Verify group membership
groups $USER
```

### 4. Reboot

```bash
sudo reboot
```

### 5. Verify Serial Port

After reboot, check that the serial port is accessible:

```bash
ls -la /dev/ttyAMA0
# Should show: crw-rw---- 1 root dialout ...

# Check dmesg for conflicts (should see NO console on ttyAMA0)
dmesg | grep ttyAMA0
```

---

## ZWaveJsUI Installation

### 1. Clone Repository

```bash
cd ~
mkdir -p code
cd code
git clone https://github.com/zwave-js/zwave-js-ui.git
cd zwave-js-ui
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Application

```bash
npm run build
```

### 4. Initial Configuration

Create initial settings file:

```bash
mkdir -p store
cat > store/settings.json <<EOF
{
  "mqtt": {
    "name": "zwave-js-ui",
    "host": "10.0.0.58",
    "port": 31883,
    "reconnectPeriod": 3000,
    "prefix": "zwave",
    "disabled": false
  },
  "gateway": {
    "type": 1,
    "payloadType": 1,
    "nodeNames": true
  },
  "zwave": {
    "port": "/dev/ttyAMA0",
    "networkKey": "",
    "serverEnabled": false,
    "scales": []
  }
}
EOF
```

**Key settings:**
- `mqtt.host`: Your MQTT broker IP (HiveMQ Kubernetes NodePort)
- `mqtt.port`: MQTT broker port (31883 for HiveMQ NodePort)
- `zwave.port`: Serial port for Z-Pi 7 HAT (`/dev/ttyAMA0`)

### 5. Start ZWaveJsUI

```bash
npm start
```

**Expected output:**

```
2025-10-05 17:00:00.000 DRIVER   version 15.15.0
2025-10-05 17:00:00.000 DRIVER   starting driver...
2025-10-05 17:00:00.000 DRIVER   opening serial port /dev/ttyAMA0
2025-10-05 17:00:00.000 DRIVER   serial port opened
2025-10-05 17:00:01.000 CNTRLR   querying Serial API capabilities...
2025-10-05 17:00:01.000 CNTRLR   received API capabilities
```

### 6. Access Web Interface

Open browser to: `http://<pi-ip>:8091`

- Default port: 8091
- No authentication by default (configure in Settings)

### 7. Configure as System Service (Optional)

```bash
# Create systemd service
sudo nano /etc/systemd/system/zwave-js-ui.service
```

```ini
[Unit]
Description=ZWave JS UI
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/code/zwave-js-ui
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable zwave-js-ui
sudo systemctl start zwave-js-ui

# Check status
sudo systemctl status zwave-js-ui
```

---

## Mosquitto MQTT Broker Installation

### Why Mosquitto?

**Eclipse Mosquitto** is the recommended MQTT broker for Raspberry Pi due to:
- Extremely lightweight (~200KB footprint)
- Minimal CPU/RAM usage
- Single apt command installation
- Most proven and stable (10k+ GitHub stars)
- Perfect for home automation scale
- Best compatibility with zwave-js-ui

**Alternative considered:** NanoMQ offers 10x faster performance on multi-core CPUs but uses more resources. Mosquitto is ideal for demos and local development.

### 1. Install Mosquitto

```bash
sudo apt install -y mosquitto mosquitto-clients
```

### 2. Configure Mosquitto

Default configuration is in `/etc/mosquitto/mosquitto.conf`. For development/demo purposes:

```bash
# Backup original config
sudo cp /etc/mosquitto/mosquitto.conf /etc/mosquitto/mosquitto.conf.backup

# Create custom config
sudo nano /etc/mosquitto/conf.d/custom.conf
```

Add the following configuration:

```conf
# Allow anonymous connections (for demo/development)
# WARNING: Do NOT use in production!
allow_anonymous true

# Listen on all interfaces
listener 1883 0.0.0.0

# Enable persistence
persistence true
persistence_location /var/lib/mosquitto/

# Logging
log_dest file /var/log/mosquitto/mosquitto.log
log_dest stdout
log_type error
log_type warning
log_type notice
log_type information

# Connection messages
connection_messages true
```

**Production configuration** (optional - for after demo):

```bash
sudo nano /etc/mosquitto/conf.d/production.conf
```

```conf
# Disable anonymous access
allow_anonymous false

# Password file
password_file /etc/mosquitto/passwd

# ACL file for permissions
acl_file /etc/mosquitto/acl

listener 1883 0.0.0.0

persistence true
persistence_location /var/lib/mosquitto/

log_dest file /var/log/mosquitto/mosquitto.log
log_type error
log_type warning
log_type notice
```

Create password file:

```bash
# Create user with password
sudo mosquitto_passwd -c /etc/mosquitto/passwd zwave

# Add more users (without -c flag to append)
sudo mosquitto_passwd /etc/mosquitto/passwd oracle
```

### 3. Start Mosquitto Service

```bash
# Enable on boot
sudo systemctl enable mosquitto

# Start service
sudo systemctl start mosquitto

# Check status
sudo systemctl status mosquitto
```

### 4. Test MQTT Broker

Open two terminal windows:

**Terminal 1 - Subscribe:**
```bash
mosquitto_sub -h localhost -t "test/topic" -v
```

**Terminal 2 - Publish:**
```bash
mosquitto_pub -h localhost -t "test/topic" -m "Hello from Mosquitto!"
```

You should see the message appear in Terminal 1.

### 5. Update ZWaveJsUI to Use Local Mosquitto

Edit zwave-js-ui settings to point to local broker:

```bash
cd ~/code/zwave-js-ui
nano store/settings.json
```

Change MQTT configuration:

```json
{
  "mqtt": {
    "name": "zwave-js-ui",
    "host": "localhost",
    "port": 1883,
    "reconnectPeriod": 3000,
    "prefix": "zwave",
    "disabled": false
  }
}
```

Or keep using your existing HiveMQ broker at `10.0.0.58:31883` if you prefer.

### 6. Configure Firewall (Optional)

If you want to access Mosquitto from other devices on your network:

```bash
# Allow MQTT port
sudo ufw allow 1883/tcp

# Check firewall status
sudo ufw status
```

### 7. Monitor Mosquitto

```bash
# View real-time logs
sudo journalctl -u mosquitto -f

# View log file
sudo tail -f /var/log/mosquitto/mosquitto.log

# Check all topics (verbose)
mosquitto_sub -h localhost -t "#" -v
```

---

## Ollama Installation

### 1. Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Verify Installation

```bash
ollama --version
```

### 3. Choose and Pull Model

**IMPORTANT: Tool Calling Support Required**

This project uses LangChain's ToolCallingAgent to control smart home devices. **You must use a model that supports tool/function calling.**

**Recommended Models (Tool Calling Supported):**

| Model | Size | Speed | Tool Support | Best For |
|-------|------|-------|--------------|----------|
| `llama3.2:1b` | 1.3GB | ⚡⚡⚡ Fast | ✅ Yes | **Recommended** - Fastest with tools |
| `llama3.2:3b` | 2GB | ⚡⚡ Medium | ✅ Yes | Best accuracy, acceptable speed |
| `qwen3:1.7b` | 1.9GB | ⚡⚡⚡ Fast | ✅ Yes | Good alternative to llama3.2 |
| `mistral` | 4.1GB | ⚡ Slow | ✅ Yes | Best accuracy, slow on Pi |
| `smollm2:1.7b` | 1.7GB | ⚡⚡⚡ Fast | ✅ Yes | Experimental, fast |

**Models WITHOUT Tool Support (DO NOT USE):**

| Model | Why It Fails |
|-------|-------------|
| `qwen2.5:3b` | ❌ Qwen 2.5 series lacks tool calling |
| `gemma2:2b` | ❌ No function calling support |
| `phi3:3.8b` | ❌ Does not support tools |
| `phi3.5:3.8b` | ❌ No tool calling capability |

**Installation:**

```bash
# Recommended for demos (fastest with tool support)
ollama pull llama3.2:1b

# Alternative (better accuracy, slightly slower)
ollama pull llama3.2:3b
```

**Testing Tool Support:**

After pulling a model, verify it works with your LangChain agent. You should see log messages like:
```
Using list_devices...
Using control_device...
```

If you see errors like `"registry.ollama.ai/library/MODEL does not support tools"`, the model is incompatible.

### 4. Test Ollama

```bash
ollama run qwen2.5:3b "What is the capital of France?"
```

### 5. Configure Ollama as System Service

Ollama should auto-configure as a systemd service during installation.

```bash
# Check status
sudo systemctl status ollama

# Enable on boot
sudo systemctl enable ollama
```

### 6. Configure Ollama for Network Access (Optional)

By default, Ollama only listens on localhost. To allow access from other machines:

```bash
sudo nano /etc/systemd/system/ollama.service
```

Add environment variable:

```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
```

Restart service:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

**Test from another machine:**

```bash
curl http://<pi-ip>:11434/api/generate -d '{
  "model": "qwen2.5:3b",
  "prompt": "Why is the sky blue?"
}'
```

---

## Testing & Verification

### 1. Test Z-Wave Controller

```bash
# Check ZWaveJsUI logs
cd ~/code/zwave-js-ui
tail -f store/logs/zwavejs_*.log
```

Look for:
- ✅ `DRIVER serial port opened`
- ✅ `CNTRLR received API capabilities`
- ❌ Avoid: `invalid data`, `no response from controller`

### 2. Test MQTT Connection

Install MQTT client:

```bash
sudo apt install -y mosquitto-clients
```

Subscribe to Z-Wave topics:

```bash
mosquitto_sub -h 10.0.0.58 -p 31883 -t "zwave/#" -v
```

You should see MQTT messages when devices are added or state changes occur.

### 3. Test Ollama

```bash
# Simple chat
ollama run qwen2.5:3b

# API test
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:3b",
  "prompt": "List the planets in our solar system",
  "stream": false
}'
```

### 4. Check Resource Usage

```bash
# CPU and memory
htop

# Disk space
df -h

# Temperature
vcgencmd measure_temp
```

**Recommended monitoring:**
- Temperature should stay < 70°C under load
- Free RAM > 2GB when running all services
- CPU usage spikes during Ollama inference are normal

---

## Troubleshooting

### ZWaveJsUI Issues

#### "Failed to initialize the driver, no response from controller"

**Cause:** Linux console is using `/dev/ttyAMA0`

**Fix:**
1. Check `/boot/firmware/cmdline.txt` - ensure `console=serial0,115200` is removed
2. Check `/boot/firmware/config.txt` - ensure `enable_uart=1` and `dtoverlay=disable-bt-pi5`
3. Reboot: `sudo reboot`

#### "Permission denied" when accessing `/dev/ttyAMA0`

**Cause:** User not in `dialout` group

**Fix:**
```bash
sudo usermod -a -G dialout $USER
# Log out and back in, or reboot
```

#### Invalid serial data / garbage bytes

**Cause:** Serial console conflict or baud rate mismatch

**Fix:**
1. Verify console is disabled in cmdline.txt
2. Try different baud rates in ZWaveJsUI settings (115200 is default for Z-Pi 7)
3. Check physical HAT connection

### Ollama Issues

#### "Connection refused" on port 11434

**Cause:** Ollama service not running

**Fix:**
```bash
sudo systemctl start ollama
sudo systemctl status ollama
```

#### Slow inference (< 1 token/sec)

**Cause:** Model too large or insufficient RAM

**Fix:**
- Use smaller model: `ollama pull qwen2.5:1.5b`
- Check RAM: `free -h` (should have 2GB+ free)
- Close other applications

#### Model download fails

**Cause:** Network issues or disk space

**Fix:**
```bash
# Check disk space
df -h

# Check network
ping ollama.com

# Retry download
ollama pull qwen2.5:3b
```

### MQTT Connection Issues

#### Cannot connect to broker

**Cause:** Firewall or incorrect broker address

**Fix:**
```bash
# Test MQTT connection
mosquitto_sub -h 10.0.0.58 -p 31883 -t "test" -v

# Check network connectivity
ping 10.0.0.58

# Verify broker is running (on broker host)
kubectl get pods -n mqtt
```

---

## Performance Tips

### 1. Optimize for Headless Operation

If not using desktop environment:

```bash
sudo systemctl set-default multi-user.target
sudo reboot
```

**Frees up ~500MB RAM**

### 2. Overclock (Optional)

Edit `/boot/firmware/config.txt`:

```ini
# Already enabled by default
arm_boost=1
```

### 3. Monitor Temperature

If Pi gets hot (>70°C):
- Add heatsink or active cooling
- Ensure good airflow around Z-Pi 7 HAT

---

## Reference Links

- **Z-Pi 7 User Guide:** https://aeotec.freshdesk.com/support/solutions/articles/6000230551-z-pi-7-user-guide-
- **ZWaveJsUI Documentation:** https://zwave-js.github.io/zwave-js-ui/
- **Ollama Documentation:** https://github.com/ollama/ollama
- **Raspberry Pi UART Configuration:** https://www.raspberrypi.com/documentation/computers/configuration.html#configuring-uarts

---

## Next Steps

After completing this setup:

1. **Pair Z-Wave Devices** via ZWaveJsUI web interface
2. **Import Devices to Database** using `scripts/discover-zwave-devices.ts`
3. **Test Device Control** via MQTT commands
4. **Integrate with Oracle App** (Next.js + LangChain)

See main project README for application setup: `../README.md`

---

**Last Updated:** October 5, 2025
