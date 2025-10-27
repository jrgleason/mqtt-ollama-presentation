# Complete Setup Guide

**Last Updated:** 2025-10-23
**Project:** MQTT + Ollama Home Automation Demo

This guide covers the complete setup from hardware to running services. Follow the sections relevant to your deployment.

---

## Overview

This setup guide is organized into 8 parts:

| Part | Component | Purpose | Required? |
|------|-----------|---------|-----------|
| 1 | **Hardware Setup** | Raspberry Pi 5, Node.js, Docker, Ollama | ✅ Yes |
| 2 | **MQTT Broker** | Message bus for device communication (HiveMQ or Mosquitto) | ✅ Yes |
| 3 | **Z-Wave Setup** | Device gateway for Z-Wave smart home devices | ⚠️ Optional (but needed for physical devices) |
| 4 | **ALSA Audio** | Audio configuration for voice commands | ⚠️ Optional (only if using voice) |
| 5 | **Oracle App** | Web-based AI chatbot interface (Next.js + LangChain) | ✅ Yes |
| 6 | **Voice Gateway** | Wake word detection and voice command processing | ⚠️ Optional |
| 7 | **Z-Wave MCP** | Claude Desktop integration for Z-Wave | ⚠️ Optional |
| 8 | **Testing** | Validation and end-to-end testing | ✅ Yes |

**Minimum Setup:** Parts 1, 2, 5, and 8 (for web-only demo without physical devices)

**Full Setup:** All parts (for complete voice + physical device demo)

---

## Table of Contents

- [Quick Start (Development)](#quick-start-development)
- [Part 1: Hardware Setup (Raspberry Pi 5)](#part-1-hardware-setup-raspberry-pi-5)
- [Part 2: MQTT Broker Setup](#part-2-mqtt-broker-setup)
- [Part 3: Z-Wave Setup](#part-3-z-wave-setup-zwave-js-ui)
- [Part 4: ALSA Audio Setup](#part-4-alsa-audio-setup-for-voice-gateway)
- [Part 5: Oracle App Setup](#part-5-oracle-app-setup)
- [Part 6: Voice Gateway Setup](#part-6-voice-gateway-setup-optional)
- [Part 7: Z-Wave MCP Server Setup](#part-7-z-wave-mcp-server-setup-optional)
- [Part 8: Validation & Testing](#part-8-validation--testing)
- [Troubleshooting](#troubleshooting)
- [Production Security](#production-security)
- [Performance Optimization](#performance-optimization)

---

## Quick Start (Development)

**For impatient developers:**

```bash
# 1. Clone and install
git clone <your-repository-url>
cd mqtt-ollama-presentation
npm install --prefix apps/oracle

# 2. Pull Ollama models
ollama pull qwen2.5:0.5b  # For voice gateway (fast)
ollama pull qwen2.5:3b    # For Oracle app (accurate)

# 3. Configure environment
cp apps/oracle/.env.example apps/oracle/.env.local
# Edit .env.local with your MQTT broker URL and other settings

# 4. Start services with Docker Compose
docker compose up --build

# 5. Access applications
# - Oracle: http://localhost:3000
# - HiveMQ Control Center: http://localhost:8080
# - zwave-js-ui: http://localhost:8091
```

**For production deployment on Raspberry Pi, continue reading...**

---

## Part 1: Hardware Setup (Raspberry Pi 5)

### 1.1 Initial Raspberry Pi Setup

**Requirements:**
- Raspberry Pi 5 (4GB or 8GB RAM)
- microSD card (32GB+ recommended)
- USB-C power supply (5V/5A official recommended)
- Z-Wave USB controller (Aeotec Z-Stick 7, Zooz ZST10)
- USB microphone (optional, for voice)
- USB speaker or 3.5mm audio out (optional, for voice)

**Installation:**

```bash
# 1. Flash Raspberry Pi OS (64-bit)
# Use Raspberry Pi Imager: https://www.raspberrypi.com/software/

# 2. Enable SSH (add empty file named 'ssh' to boot partition)
touch /Volumes/boot/ssh

# 3. First boot - update system
sudo apt update && sudo apt upgrade -y

# 4. Install prerequisites
sudo apt install -y git curl build-essential
```

### 1.2 Install Node.js

**Using NVM (Recommended):**

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
npm --version
```

### 1.3 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again, then verify
docker --version
docker compose version
```

### 1.4 Install Ollama

**Option 1: Run on Pi 5 (Local)**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull lightweight model for voice gateway
ollama pull qwen2.5:0.5b

# Pull model for Oracle app
ollama pull qwen2.5:3b

# Verify
ollama list
```

**Option 2: Run on Separate Machine**

If running Ollama on a more powerful machine:
- Install Ollama on that machine
- Note the IP address (e.g., `192.168.1.100`)
- Configure `OLLAMA_BASE_URL=http://192.168.1.100:11434` in `.env` files

### 1.5 Z-Wave Controller Setup

**Identify USB Device:**

```bash
# Plug in Z-Wave USB controller
lsusb

# Find device path
ls -l /dev/ttyUSB* /dev/ttyACM*

# Common paths:
# /dev/ttyUSB0  - Most USB controllers
# /dev/ttyACM0  - Aeotec Z-Stick 7
```

**Add udev rule for stable device name:**

```bash
# Create udev rule
sudo tee /etc/udev/rules.d/99-zwave.rules <<EOF
SUBSYSTEM=="tty", ATTRS{idVendor}=="0658", ATTRS{idProduct}=="0200", SYMLINK+="zwave"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Verify
ls -l /dev/zwave
```

---

## Part 2: MQTT Broker Setup

### 2.1 HiveMQ CE Installation

**Option 1: Docker (Recommended)**

```bash
# Create docker-compose.yml for HiveMQ
mkdir -p ~/mqtt-broker
cd ~/mqtt-broker

cat > docker-compose.yml <<EOF
version: '3'
services:
  hivemq:
    image: hivemq/hivemq-ce:latest
    container_name: hivemq
    restart: always
    ports:
      - "1883:1883"    # MQTT
      - "8080:8080"    # Control Center
    volumes:
      - hivemq-data:/opt/hivemq/data
      - hivemq-log:/opt/hivemq/log
    environment:
      HIVEMQ_ALLOW_ANONYMOUS: "true"  # Demo mode - disable for production

volumes:
  hivemq-data:
  hivemq-log:
EOF

# Start broker
docker compose up -d

# Verify
docker logs hivemq
```

**Option 2: Mosquitto (Alternative)**

```bash
# Install Mosquitto
sudo apt install -y mosquitto mosquitto-clients

# Configure
sudo tee /etc/mosquitto/conf.d/custom.conf <<EOF
listener 1883
allow_anonymous true  # Demo mode - disable for production
EOF

# Restart
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
```

### 2.2 Test MQTT Broker

```bash
# Subscribe to test topic (terminal 1)
mosquitto_sub -h localhost -p 1883 -t 'test/#' -v

# Publish test message (terminal 2)
mosquitto_pub -h localhost -p 1883 -t 'test/hello' -m 'world'

# Should see: test/hello world
```

---

## Part 3: Z-Wave Setup (zwave-js-ui)

**📖 For detailed Z-Wave setup including device pairing, MQTT configuration, and troubleshooting, see [zwave-setup-guide.md](zwave-setup-guide.md)**

This section provides a quick setup. For comprehensive instructions, refer to the detailed guide.

### 3.1 Install zwave-js-ui

**Docker Installation:**

```bash
# Create docker-compose.yml
mkdir -p ~/zwave
cd ~/zwave

cat > docker-compose.yml <<EOF
version: '3'
services:
  zwave-js-ui:
    image: zwavejs/zwave-js-ui:latest
    container_name: zwave-js-ui
    restart: always
    tty: true
    stop_signal: SIGINT
    environment:
      - SESSION_SECRET=changeThisSecret
      - ZWAVEJS_EXTERNAL_CONFIG=/usr/src/app/store/.config-db
    ports:
      - "8091:8091"  # Web UI
      - "3000:3000"  # WebSocket
    devices:
      - '/dev/ttyACM0:/dev/ttyACM0'  # Adjust if needed
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
docker compose up -d

# Check logs
docker logs -f zwave-js-ui
```

### 3.2 Configure zwave-js-ui

1. **Open Web UI:** `http://<pi-ip>:8091`

2. **Configure Z-Wave Controller:**
   - Go to: **Settings** → **Z-Wave**
   - **Serial Port:** `/dev/ttyACM0` (or your device path)
   - **Network Key:** Generate new (for secure devices)
   - **Save** and wait for "Driver Ready"

3. **Enable MQTT Gateway:**
   - Go to: **Settings** → **MQTT**
   - **Enable MQTT:** ✅ Checked
   - **Host:** `localhost` (or broker IP)
   - **Port:** `1883`
   - **Prefix:** `zwave`
   - **Name:** Use friendly names ✅
   - **Payload Type:** JSON Time-Value
   - **Send Z-Wave Events:** ✅ Checked
   - **Save** and restart

4. **Pair Devices:**
   - Go to: **Control Panel**
   - Click **Start Inclusion**
   - Trigger device pairing mode (usually 3x button press)
   - Wait for interview to complete

5. **Verify MQTT Topics:**

```bash
# Subscribe to all Z-Wave topics
mosquitto_sub -h localhost -p 1883 -t 'zwave/#' -v

# Toggle a device and watch for messages
```

---

## Part 4: ALSA Audio Setup (For Voice Gateway)

### 4.1 Identify Audio Devices

```bash
# List microphones
arecord -l

# Example output:
# card 3: M0 [UM0], device 0: USB Audio [USB Audio]

# List speakers
aplay -l

# Example output:
# card 2: Headphones [bcm2835 Headphones], device 0
```

### 4.2 Test Audio

```bash
# Test microphone (record 3 seconds)
arecord -D plughw:3,0 -f S16_LE -r 16000 -d 3 test.wav

# Play it back
aplay -D plughw:2,0 test.wav
```

### 4.3 Configure .asoundrc (Optional)

If you want to set default devices:

```bash
cat > ~/.asoundrc <<EOF
pcm.!default {
    type asym
    playback.pcm "plughw:2,0"  # Speaker
    capture.pcm "plughw:3,0"   # Microphone
}
EOF
```

### 4.4 Fix Permissions

```bash
# Add user to audio group
sudo usermod -a -G audio $USER

# Logout and login again
# Verify
groups | grep audio
```

---

## Part 5: Oracle App Setup

### 5.1 Clone Repository

```bash
cd ~
git clone <your-repository-url>
cd mqtt-ollama-presentation
```

### 5.2 Install Dependencies

```bash
cd apps/oracle
npm install
```

### 5.3 Configure Environment

```bash
cp .env.example .env.local

# Edit .env.local
nano .env.local
```

**Required variables:**

```env
# Auth0 (for production - optional for dev)
AUTH0_SECRET=your-secret-key-here
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Database
DATABASE_URL=file:./dev.db

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

# App
NODE_ENV=development
PORT=3000
```

### 5.4 Seed Database

```bash
npx prisma migrate dev
npx prisma db seed
```

### 5.5 Build for Production

```bash
npm run build
```

### 5.6 Setup as Systemd Service

**Create service file:**

```bash
sudo tee /etc/systemd/system/oracle.service <<EOF
[Unit]
Description=Oracle - AI Home Automation Assistant
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/mqtt-ollama-presentation/apps/oracle
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="PATH=/home/$USER/.nvm/versions/node/current/bin:/usr/local/bin:/usr/bin:/bin"
Environment="OLLAMA_BASE_URL=http://localhost:11434"
Environment="OLLAMA_MODEL=qwen2.5:3b"
Environment="DATABASE_URL=file:./dev.db"
Environment="MQTT_BROKER_URL=mqtt://localhost:1883"
ExecStart=/home/$USER/.nvm/versions/node/current/bin/node node_modules/.bin/next start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable oracle.service
sudo systemctl start oracle.service

# Check status
systemctl status oracle.service

# View logs
journalctl -u oracle.service -f
```

---

## Part 6: Voice Gateway Setup (Optional)

### 6.1 Install Dependencies

```bash
cd ~/mqtt-ollama-presentation/apps/voice-gateway-oww
npm install

# Install Python dependencies (for Piper TTS alternative if needed)
python3 -m venv .venv
source .venv/bin/activate
pip install piper-tts
```

### 6.2 Download Models

```bash
# Run setup script
./setup.sh

# Or manually:
mkdir -p models

# Download OpenWakeWord models
wget https://github.com/dscripka/openWakeWord/releases/download/v0.1.1/openwakeword_melspectrogram.onnx -O models/openwakeword_melspectrogram.onnx
wget https://github.com/dscripka/openWakeWord/releases/download/v0.1.1/openwakeword_embedding_model.onnx -O models/openwakeword_embedding_model.onnx
wget https://github.com/fwartner/home-assistant-wakewords-collection/raw/refs/heads/main/en/Hey%20Luna/hey_jarvis_v0.1.onnx

# Download Whisper model (via Ollama)
ollama pull whisper:latest
```

### 6.3 Configure Environment

```bash
cp .env.example .env
nano .env
```

**Configuration:**

```env
# OpenWakeWord
OWW_MODEL_PATH=models/hey_jarvis_v0.1.onnx
OWW_THRESHOLD=0.25

# Audio
AUDIO_MIC_DEVICE=plughw:3,0    # From arecord -l
AUDIO_SPEAKER_DEVICE=plughw:2,0 # From aplay -l
AUDIO_SAMPLE_RATE=16000
AUDIO_CHANNELS=1

# Whisper
WHISPER_MODEL=tiny
WHISPER_MODEL_PATH=models/ggml-tiny.bin

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:0.5b

# ElevenLabs TTS
ELEVENLABS_API_KEY=your-api-key-here
ELEVENLABS_VOICE_ID=your-voice-id

# Health check
HEALTHCHECK_PORT=3002
```

### 6.4 Setup as Systemd Service

```bash
sudo tee /etc/systemd/system/voice-gateway-oww.service <<EOF
[Unit]
Description=Voice Gateway OWW - Wake Word Detection and Voice Commands
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/mqtt-ollama-presentation/apps/voice-gateway-oww
Environment="NODE_ENV=production"
Environment="LOG_LEVEL=info"
Environment="VIRTUAL_ENV=$HOME/mqtt-ollama-presentation/apps/voice-gateway-oww/.venv"
Environment="PATH=$HOME/mqtt-ollama-presentation/apps/voice-gateway-oww/.venv/bin:$HOME/.nvm/versions/node/current/bin:/usr/local/bin:/usr/bin:/bin"

# Configuration from .env file
EnvironmentFile=$HOME/mqtt-ollama-presentation/apps/voice-gateway-oww/.env

ExecStart=/home/$USER/.nvm/versions/node/current/bin/node src/main.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable voice-gateway-oww.service
sudo systemctl start voice-gateway-oww.service

# Check status
systemctl status voice-gateway-oww.service
```

---

## Part 7: Z-Wave MCP Server Setup (Optional)

For Claude Desktop integration:

```bash
cd ~/mqtt-ollama-presentation/apps/zwave-mcp-server
npm install
npm run build
```

**Configure in Claude Desktop:**

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent:

```json
{
  "mcpServers": {
    "zwave": {
      "command": "node",
      "args": ["$HOME/mqtt-ollama-presentation/apps/zwave-mcp-server/dist/index.js"],
      "env": {
        "MQTT_BROKER_URL": "mqtt://<pi-ip>:1883",
        "ZWAVE_UI_URL": "http://<pi-ip>:8091"
      }
    }
  }
}
```

Replace `<pi-ip>` with your Raspberry Pi's IP address (e.g., `192.168.1.100`).

---

## Part 8: Validation & Testing

### 8.1 Service Status Check

```bash
# Check all services
systemctl status ollama.service
systemctl status oracle.service
systemctl status voice-gateway-oww.service
docker ps  # Check HiveMQ and zwave-js-ui
```

### 8.2 Network Connectivity

```bash
# Test MQTT
mosquitto_sub -h localhost -p 1883 -t '#' -v

# Test Ollama
curl http://localhost:11434/api/tags

# Test Oracle
curl http://localhost:3000

# Test zwave-js-ui
curl http://localhost:8091
```

### 8.3 End-to-End Test

1. **Web Interface:**
   - Open `http://<pi-ip>:3000`
   - Type: "Turn on the living room light"
   - Verify device responds

2. **Voice Interface (if enabled):**
   - Say: "Hey Jarvis"
   - Wait for beep
   - Say: "Turn on the living room light"
   - Listen for confirmation

3. **MQTT Verification:**
   ```bash
   mosquitto_sub -h localhost -p 1883 -t 'zwave/#' -v
   # Toggle a device and watch for messages
   ```

---

## Troubleshooting

### Common Issues

**Ollama connection failed:**
```bash
# Check if Ollama is running
systemctl status ollama.service

# Check if model is pulled
ollama list

# Test API
curl http://localhost:11434/api/tags
```

**MQTT connection failed:**
```bash
# Check broker is running
docker ps | grep hivemq
# OR
systemctl status mosquitto

# Test connection
mosquitto_pub -h localhost -p 1883 -t 'test' -m 'hello'
```

**Z-Wave devices not responding:**
```bash
# Check zwave-js-ui logs
docker logs zwave-js-ui

# Verify device paired
# Open http://localhost:8091 → Nodes

# Test MQTT control
mosquitto_pub -h localhost -p 1883 \
  -t 'zwave/Living_Room/switch_binary/endpoint_0/targetValue/set' \
  -m '{"value":true}'
```

**Voice gateway not detecting wake word:**
```bash
# Check logs
journalctl -u voice-gateway-oww.service -f

# Test microphone
arecord -D plughw:3,0 -f S16_LE -r 16000 -d 3 test.wav
aplay test.wav

# Lower detection threshold
# Edit .env: OWW_THRESHOLD=0.15
sudo systemctl restart voice-gateway-oww.service
```

**Service won't start:**
```bash
# Check logs
journalctl -u oracle.service -n 100 --no-pager
journalctl -u voice-gateway-oww.service -n 100 --no-pager

# Common issues:
# - Missing npm build: cd apps/oracle && npm run build
# - Wrong paths in service file
# - Missing environment variables
# - Port already in use
```

---

## Production Security

### MQTT Security

```bash
# Create password file
mosquitto_passwd -c /etc/mosquitto/passwd mqtt_user

# Update /etc/mosquitto/conf.d/custom.conf
cat <<EOF | sudo tee /etc/mosquitto/conf.d/custom.conf
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
EOF

# Restart
sudo systemctl restart mosquitto
```

### zwave-js-ui Security

1. Open `http://localhost:8091`
2. Go to **Settings** → **Security**
3. Set admin password
4. Enable HTTPS (optional)

### Firewall

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow Oracle web UI
sudo ufw allow 3000/tcp

# Allow zwave-js-ui
sudo ufw allow 8091/tcp

# Enable firewall
sudo ufw enable
```

---

## Performance Optimization

### For Raspberry Pi 5

**CPU Governor:**
```bash
# Set to performance mode
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

**Memory Split:**
```bash
# Edit /boot/config.txt
sudo nano /boot/config.txt

# Add:
gpu_mem=64  # Minimum for headless

# Reboot
sudo reboot
```

**Ollama Memory:**
```bash
# Limit Ollama to 3GB RAM (for 4GB Pi)
echo 'OLLAMA_MAX_LOADED_MODELS=1' | sudo tee -a /etc/systemd/system/ollama.service.d/override.conf
sudo systemctl daemon-reload
sudo systemctl restart ollama.service
```

---

## Related Documentation

- **Architecture:** `/docs/ARCHITECTURE.md`
- **OpenWakeWord Guide:** `/docs/openwakeword-guide.md`
- **MCP Architecture:** `/docs/mcp-architecture.md`
- **Performance Tuning:** `/docs/performance-optimization.md`
- **Troubleshooting:** `/apps/voice-gateway-oww/TROUBLESHOOTING.md`
- **Project Guidelines:** `/CLAUDE.md`

---

**Setup complete! 🎉**

For development workflow, see `/docs/repository-guidelines.md`
For current tasks, see `/docs/tasks.md`
