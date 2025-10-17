# Getting Started - Complete Setup Guide

**[← Back to README][readme]** | **[Raspberry Pi Setup Details][pi-setup]** | **[Oracle Setup Details][oracle-setup]**

---

This guide walks you through setting up the complete MQTT + Ollama home automation system from scratch on a Raspberry Pi 5.

**What you'll build:**
- Z-Wave device control via zwave-js-ui
- Local AI assistant powered by Ollama
- Voice control with microphone and speakers
- Web interface for device management
- All running locally on your network

**Estimated time:** 2-3 hours

**Detailed Guides:**
- For more Pi configuration details, see [Raspberry Pi 5 Setup Guide][pi-setup]
- For ZWave-JS-UI details, see [ZWave-JS-UI Deployment][zwave-deploy]
- For Oracle app service details, see [Oracle Systemd Setup][oracle-setup]

---

## Table of Contents

1. [Hardware Setup](#1-hardware-setup)
2. [Initial Raspberry Pi Configuration](#2-initial-raspberry-pi-configuration)
3. [Z-Pi 7 HAT Installation](#3-z-pi-7-hat-installation)
4. [USB Audio Setup](#4-usb-audio-setup)
5. [Node.js Installation](#5-nodejs-installation)
6. [ZWave-JS-UI Setup](#6-zwave-js-ui-setup)
7. [Adding Z-Wave Devices](#7-adding-z-wave-devices)
8. [MQTT Broker Setup](#8-mqtt-broker-setup)
9. [Nginx Installation](#9-nginx-installation)
10. [Ollama Installation](#10-ollama-installation)
11. [Oracle App Setup](#11-oracle-app-setup)
12. [Testing Everything](#12-testing-everything)
13. [Next Steps](#13-next-steps)

---

## 1. Hardware Setup

### Required Hardware

- **Raspberry Pi 5** (8GB RAM recommended)
- **Aeotec Z-Pi 7 HAT** (Z-Wave 700 series controller)
- **MicroSD card** (32GB+ recommended)
- **USB microphone** (for voice commands)
- **USB speakers** or 3.5mm speakers
- **Z-Wave devices** (switches, dimmers, sensors)
- **Power supply** for Raspberry Pi 5

### Physical Installation

1. **Install Z-Pi 7 HAT on Raspberry Pi**
   - Power off the Pi completely
   - Align the 40-pin GPIO header
   - Press down firmly until seated
   - Secure with standoffs if provided

2. **Connect Audio Devices**
   - Plug USB microphone into any USB port
   - Connect speakers (USB or 3.5mm jack)

3. **Insert MicroSD Card**
   - Use Raspberry Pi Imager to flash Raspberry Pi OS (64-bit)
   - Configure hostname, SSH, and WiFi during imaging

4. **Power On**
   - Connect power supply
   - Wait for boot (first boot takes 2-3 minutes)

---

## 2. Initial Raspberry Pi Configuration

### SSH into Your Pi

```bash
# Find your Pi's IP address (check your router or use nmap)
ssh pi@<pi-ip-address>
# Default password: raspberry (if you didn't set one during imaging)
```

### Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Install Essential Tools

```bash
sudo apt install -y git curl wget vim nano build-essential htop
```

### Configure Time Zone (Optional)

```bash
sudo raspi-config
# System Options → Localisation → Change Timezone
```

---

## 3. Z-Pi 7 HAT Installation

The Z-Pi 7 uses the GPIO UART which conflicts with the Linux console by default. We need to disable Bluetooth and the serial console.

### Disable Bluetooth

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

Save and exit (Ctrl+X, Y, Enter).

### Disable Serial Console

```bash
sudo nano /boot/firmware/cmdline.txt
```

**Remove** `console=serial0,115200` from the line.

**Quick fix command:**

```bash
sudo sed -i 's/console=serial0,115200 //' /boot/firmware/cmdline.txt
```

### Set Permissions

```bash
# Add your user to dialout group
sudo usermod -a -G dialout $USER

# Verify group membership
groups $USER
```

### Reboot

```bash
sudo reboot
```

### Verify Serial Port

After reboot:

```bash
ls -la /dev/ttyAMA0
# Should show: crw-rw---- 1 root dialout ...

# Verify no console conflicts
dmesg | grep ttyAMA0
# Should NOT show "console [ttyAMA0]"
```

---

## 4. USB Audio Setup

### List Audio Devices

```bash
# List playback devices
aplay -l

# List recording devices
arecord -l
```

You should see your USB microphone and speakers listed.

### Test Microphone

```bash
# Record 5 seconds of audio
arecord -D plughw:1,0 -d 5 -f cd test.wav

# Play it back
aplay test.wav
```

### Test Speakers

```bash
speaker-test -t wav -c 2
# Press Ctrl+C to stop
```

### Set Default Audio Devices (Optional)

If you want to make USB audio the default:

```bash
nano ~/.asoundrc
```

Add:

```
pcm.!default {
    type hw
    card 1
}

ctl.!default {
    type hw
    card 1
}
```

**Note:** Card number (1) may vary. Check with `aplay -l` and `arecord -l`.

---

## 5. Node.js Installation

### Install Node.js via NVM

NVM allows easy Node version management.

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js LTS
nvm install 20
nvm use 20

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### Create Node Version Symlink

This allows easy version switching without updating service files:

```bash
# Create a "current" symlink pointing to your active Node version
ln -sfn ~/.nvm/versions/node/$(node --version | sed 's/v//') ~/.nvm/versions/node/current

# Verify
ls -la ~/.nvm/versions/node/
```

**To switch Node versions in the future:**

```bash
# Install new version
nvm install 22
nvm use 22

# Update symlink
ln -sfn ~/.nvm/versions/node/v22.0.0 ~/.nvm/versions/node/current

# Restart services
sudo systemctl restart zwave-js-ui
sudo systemctl restart oracle
```

---

## 6. ZWave-JS-UI Setup

### Clone Repository

```bash
cd ~
mkdir -p code
cd code
git clone [zwave-repo]
cd zwave-js-ui
```

### Install Dependencies

```bash
npm install
```

### Build Application

```bash
npm run build
```

This takes 5-10 minutes on a Pi 5.

### Create Systemd Service

```bash
sudo nano /etc/systemd/system/zwave-js-ui.service
```

Paste this configuration:

```ini
[Unit]
Description=ZWave JS UI
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/code/zwave-js-ui
Environment="PATH=/home/pi/.nvm/versions/node/current/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/home/pi/.nvm/versions/node/current/bin/node --preserve-symlinks server/bin/www.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Note:** Using the `current` symlink allows Node version changes without editing the service file.

### Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable zwave-js-ui

# Start service
sudo systemctl start zwave-js-ui

# Check status
sudo systemctl status zwave-js-ui
```

### Access Web Interface

Open your browser to: `http://<pi-ip>:8091`

You should see the ZWave-JS-UI interface.

---

## 7. Adding Z-Wave Devices

### Initial Setup in ZWave-JS-UI

1. Open `http://<pi-ip>:8091`
2. Go to **Settings** → **Z-Wave**
3. Configure:
   - **Serial Port:** `/dev/ttyAMA0`
   - **Network Key:** Generate a new one (click Generate)
   - Click **Save**
4. Click **Start Driver**

Wait 30-60 seconds for the driver to initialize.

### Include Your First Device (Switch)

1. Click **Control Panel** in the top menu
2. Click **Start Inclusion** (blue button)
3. On your Z-Wave switch:
   - Press the inclusion button 3 times quickly
   - Or follow manufacturer instructions
4. Wait 10-30 seconds for the device to appear
5. Click **Stop Inclusion**

### Name Your Device

1. Find the device in the **Nodes** list
2. Click on the node
3. Edit the **Name** field (e.g., "Living Room Light")
4. Click **Save**

### Test the Device

1. In **Control Panel**, find your device
2. Click the **On/Off** toggle
3. Verify the physical device responds

**Troubleshooting:**
- If inclusion fails, try **Exclusion** first, then re-include
- Ensure device is within 10 feet of the Pi during inclusion
- Check ZWave-JS-UI logs for errors

---

## 8. MQTT Broker Setup

MQTT (Message Queuing Telemetry Transport) is the messaging backbone for your home automation system. It allows ZWave-JS-UI, the Oracle app, and other services to communicate about device states and commands.

**For detailed MQTT configuration, see the [MQTT Setup Guide][mqtt-setup].**

This section provides quick setup steps. For advanced configuration, troubleshooting, ACLs, and WebSocket support, refer to the detailed guide.

### Install Mosquitto

Mosquitto is a lightweight, open-source MQTT broker.

```bash
sudo apt install -y mosquitto mosquitto-clients
```

### Configure Mosquitto

Create a custom configuration file:

```bash
sudo nano /etc/mosquitto/conf.d/custom.conf
```

**For Development (Anonymous Access):**

Add this configuration:

```conf
# Development configuration - DO NOT use in production!
# This allows connections without authentication

# Allow anonymous connections (no username/password)
allow_anonymous true

# Listen on all network interfaces
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

# Log when clients connect/disconnect
connection_messages true

# Allow retained messages
retain_available true

# Maximum queued messages per client
max_queued_messages 1000
```

**For Production (With Authentication):**

If you want to enable authentication (recommended for production):

```bash
# Create password file
sudo mosquitto_passwd -c /etc/mosquitto/passwd zwave

# You'll be prompted to enter a password for 'zwave' user

# Add more users
sudo mosquitto_passwd /etc/mosquitto/passwd oracle
```

Then update `/etc/mosquitto/conf.d/custom.conf`:

```conf
# Production configuration with authentication

# Disable anonymous access
allow_anonymous false

# Use password file
password_file /etc/mosquitto/passwd

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

connection_messages true
retain_available true
max_queued_messages 1000
```

### Verify Mosquitto Service

```bash
# Check if Mosquitto is enabled to start on boot
sudo systemctl is-enabled mosquitto
# Should output: enabled

# Check service status
sudo systemctl status mosquitto

# If not running, start it
sudo systemctl start mosquitto

# Enable auto-start on boot
sudo systemctl enable mosquitto
```

### Test MQTT Connection

Open **two terminal windows** to test the broker:

**Terminal 1 - Subscribe (Receiver):**
```bash
# Subscribe to test topic
mosquitto_sub -h localhost -t "test/topic" -v

# With authentication (if enabled):
mosquitto_sub -h localhost -t "test/topic" -v -u zwave -P your-password
```

**Terminal 2 - Publish (Sender):**
```bash
# Publish a test message
mosquitto_pub -h localhost -t "test/topic" -m "Hello MQTT!"

# With authentication (if enabled):
mosquitto_pub -h localhost -t "test/topic" -m "Hello MQTT!" -u zwave -P your-password
```

You should see `test/topic Hello MQTT!` appear in Terminal 1.

**Tip:** Keep Terminal 1 running while testing other integrations to monitor messages.

### Configure ZWave-JS-UI MQTT Integration

Now connect ZWave-JS-UI to your MQTT broker:

1. **Open ZWave-JS-UI Web Interface:**
   ```
   http://<pi-ip>:8091
   ```

2. **Navigate to Settings:**
   - Click **Settings** in the left sidebar
   - Click **MQTT** tab

3. **Configure MQTT Connection:**

   **Basic Settings:**
   - **Name:** `Mosquitto Local`
   - **Host:** `localhost` (or `127.0.0.1`)
   - **Port:** `1883`
   - **Reconnect Period (ms):** `3000`
   - **Prefix:** `zwave` (all topics will start with `zwave/`)

   **Authentication (if enabled):**
   - **Username:** `zwave`
   - **Password:** `your-password`
   - Leave blank if using anonymous mode

   **Advanced Settings:**
   - **QoS:** `1` (at least once delivery)
   - **Retain:** `true` (retain state messages)
   - **Clean:** `true`

4. **Enable MQTT Gateway:**
   - Scroll down to **Gateway** section
   - Toggle **Gateway Enabled** to ON
   - **Gateway Type:** `Manual` (recommended for control)
   - **Payload Type:** `JSON with time`
   - **Send Z-Wave Events:** ON (to publish device state changes)
   - **Include Node Info:** ON (useful for debugging)

5. **Click Save:**
   - Green success message should appear
   - Connection status should show: **Connected**

6. **Verify Connection Status:**
   - Look for green **Connected** indicator in MQTT section
   - If red/disconnected, check broker status and credentials

### Verify MQTT Messages from ZWave-JS-UI

Now test that ZWave-JS-UI is publishing messages to MQTT:

**Terminal 1 - Monitor all Z-Wave topics:**
```bash
# Subscribe to all topics under zwave/
mosquitto_sub -h localhost -t "zwave/#" -v

# With authentication:
mosquitto_sub -h localhost -t "zwave/#" -v -u zwave -P your-password
```

**Expected Output (when you toggle a device in ZWave-JS-UI):**

```
zwave/Living Room Light/switch_binary/currentValue/set {"time":1697558400,"value":true}
zwave/Living Room Light/status {"status":"alive","lastSeen":1697558400}
zwave/_CLIENTS/ZWAVE_GATEWAY-mqtt-client/status {"value":true,"time":1697558400}
```

**Test in ZWave-JS-UI:**
1. Go to **Control Panel**
2. Find your Z-Wave device
3. Click **On** or **Off** toggle
4. Watch Terminal 1 - you should see MQTT messages appear immediately

### Understanding MQTT Topic Structure

ZWave-JS-UI publishes messages in this format:

```
<prefix>/<node_name>/<command_class>/<property>/set
```

**Examples:**

```bash
# Binary switch (on/off)
zwave/Living Room Light/switch_binary/currentValue/set
# Payload: {"time":1697558400,"value":true}

# Multilevel switch (dimmer, 0-99)
zwave/Bedroom Dimmer/switch_multilevel/currentValue/set
# Payload: {"time":1697558400,"value":75}

# Sensor data (motion, temperature, etc.)
zwave/Motion Sensor/notification/status
# Payload: {"time":1697558400,"value":"motion detected"}

# Node status
zwave/Living Room Light/status
# Payload: {"status":"alive","lastSeen":1697558400}
```

### Control Devices via MQTT

You can also **send commands** to devices via MQTT:

```bash
# Turn device ON
mosquitto_pub -h localhost -t "zwave/Living Room Light/switch_binary/targetValue/set" -m '{"value":true}'

# Turn device OFF
mosquitto_pub -h localhost -t "zwave/Living Room Light/switch_binary/targetValue/set" -m '{"value":false}'

# Set dimmer level to 50%
mosquitto_pub -h localhost -t "zwave/Bedroom Dimmer/switch_multilevel/targetValue/set" -m '{"value":50}'
```

**Note:** The topic uses `targetValue` (command to send) vs `currentValue` (state update from device).

### MQTT Monitoring Tools

**Option 1: Command Line (mosquitto_sub)**
```bash
# All topics
mosquitto_sub -h localhost -t "#" -v

# Only Z-Wave topics
mosquitto_sub -h localhost -t "zwave/#" -v

# Specific device
mosquitto_sub -h localhost -t "zwave/Living Room Light/#" -v
```

**Option 2: MQTT Explorer (GUI Tool)**
```bash
# Install MQTT Explorer (on your laptop, not Pi)
# Download from: https://mqtt-explorer.com/

# Connect to your Pi's MQTT broker
Host: <pi-ip>
Port: 1883
Username/Password: (if configured)
```

MQTT Explorer provides a visual tree of all topics and messages.

**Option 3: Node-RED (Advanced)**
```bash
# Install Node-RED for visual MQTT workflow automation
sudo npm install -g --unsafe-perm node-red

# Start Node-RED
node-red

# Access at http://<pi-ip>:1880
```

### Troubleshooting MQTT

**Mosquitto won't start:**
```bash
# Check logs
sudo journalctl -u mosquitto -n 50

# Check configuration syntax
sudo mosquitto -c /etc/mosquitto/mosquitto.conf -v

# Common issues:
# 1. Port already in use
sudo lsof -i :1883

# 2. Permission errors
sudo chown -R mosquitto:mosquitto /var/lib/mosquitto
sudo chmod 755 /var/lib/mosquitto
```

**ZWave-JS-UI shows "Disconnected":**
```bash
# 1. Verify Mosquitto is running
sudo systemctl status mosquitto

# 2. Test connection from command line
mosquitto_sub -h localhost -t "test" -v

# 3. Check authentication credentials (if enabled)
# Username/password must match /etc/mosquitto/passwd

# 4. Check ZWave-JS-UI logs
sudo journalctl -u zwave-js-ui -n 50
```

**No messages appearing in mosquitto_sub:**
```bash
# 1. Verify you're subscribed to the right topic
mosquitto_sub -h localhost -t "#" -v  # Subscribe to ALL topics

# 2. Check MQTT Gateway is enabled in ZWave-JS-UI
# Settings → MQTT → Gateway Enabled: ON

# 3. Verify device is responding in ZWave-JS-UI
# Control Panel → Toggle device → Check for "Success" message

# 4. Check QoS level
# Try QoS 0 (faster but less reliable)
mosquitto_sub -h localhost -t "zwave/#" -q 0 -v
```

**Authentication errors:**
```bash
# Verify password file exists
sudo cat /etc/mosquitto/passwd

# Reset password
sudo mosquitto_passwd /etc/mosquitto/passwd zwave

# Restart Mosquitto
sudo systemctl restart mosquitto
```

**High memory usage:**
```bash
# Check number of retained messages
# Edit /etc/mosquitto/conf.d/custom.conf
max_queued_messages 100  # Reduce from 1000

# Clear retained messages (careful!)
mosquitto_sub -h localhost -t "#" -v --retained-only --remove-retained
```

### Next Steps

With MQTT working, you can now:
- ✅ See real-time device state changes
- ✅ Control devices via command line
- ✅ Build integrations that react to device events
- ✅ Monitor all home automation messages in one place

**Coming up:**
- Section 9: Install Nginx to expose the Oracle web app
- Section 10: Install Ollama for local AI processing
- Section 11: Set up the Oracle app to control devices via AI chat

---

## 9. Nginx Installation

### Install Nginx

```bash
sudo apt install -y nginx
```

### Configure Nginx for Oracle App

Create site configuration:

```bash
sudo nano /etc/nginx/sites-available/oracle
```

Paste:

```nginx
server {
    listen 80;
    server_name _;

    # Proxy to Oracle Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-running chat requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Enable Site

```bash
# Create symlink to enable
sudo ln -s /etc/nginx/sites-available/oracle /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Verify Nginx

```bash
sudo systemctl status nginx

# Test health endpoint
curl http://localhost/health
# Should return: healthy
```

---

## 10. Ollama Installation

### Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Verify Installation

```bash
ollama --version
```

### Pull Recommended Models

For the Oracle app (conversational AI):

```bash
# Recommended: Fast and accurate
ollama pull llama3.2:1b

# Alternative: Better accuracy, slightly slower
ollama pull llama3.2:3b
```

**IMPORTANT:** This project requires models with **tool calling support**. Do NOT use:
- `qwen3:1.7b` (no tool support)
- `gemma2:2b` (no tool support)

### Test Ollama

```bash
ollama run llama3.2:1b "What is 2+2?"
```

Press Ctrl+D to exit the chat.

### Configure Ollama Service

```bash
# Check service status
sudo systemctl status ollama

# Enable on boot
sudo systemctl enable ollama
```

### Test API

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:1b",
  "prompt": "Why is the sky blue?",
  "stream": false
}'
```

---

## 11. Oracle App Setup

### Clone Repository

```bash
cd ~/code
git clone [github-repo]
cd mqtt-ollama-presentation/apps/oracle
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

```bash
cp .env.example .env
nano .env
```

Update these values:

```bash
# Database
DATABASE_URL=file:./prod.db

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b

# Auth0 (configure later or use mock auth)
AUTH0_SECRET=your-secret-here
AUTH0_BASE_URL=http://<pi-ip>
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# App
NODE_ENV=production
PORT=3000
```

### Setup Database

```bash
npx prisma generate
npx prisma migrate deploy
```

### Build Application

```bash
npm run build
```

### Create Systemd Service

```bash
sudo nano /etc/systemd/system/oracle.service
```

Paste:

```ini
[Unit]
Description=Oracle - AI Home Automation Assistant
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/code/mqtt-ollama-presentation/apps/oracle
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/home/pi/.nvm/versions/node/current/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable oracle

# Start service
sudo systemctl start oracle

# Check status
sudo systemctl status oracle
```

### Access Oracle App

Open your browser to: `http://<pi-ip>`

(Nginx proxies port 80 to port 3000)

---

## 12. Testing Everything

### Test ZWave-JS-UI

1. Open `http://<pi-ip>:8091`
2. Verify driver is running
3. Toggle a Z-Wave device
4. Check MQTT messages:
   ```bash
   mosquitto_sub -h localhost -t "zwave/#" -v
   ```

### Test Ollama

```bash
# Test via command line
ollama run llama3.2:1b "List 3 planets"

# Test via API
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:1b",
  "prompt": "What is the capital of France?",
  "stream": false
}'
```

### Test Oracle App

1. Open `http://<pi-ip>`
2. Log in (or skip if using mock auth)
3. Go to **Dashboard**
4. Verify your Z-Wave devices are listed
5. Try a command: "Turn on the living room light"
6. Verify the device responds

### Test Voice (If Implemented)

```bash
cd ~/code/mqtt-ollama-presentation/apps/voice-gateway-oww

# Install dependencies
npm install

# Setup (download models)
./setup.sh

# Setup Piper TTS (optional - for voice responses)
python3 -m venv venvs/piper-tts
source venvs/piper-tts/bin/activate
pip install piper-tts
python3 -m piper.download_voices en_US-amy-medium
deactivate

# Start voice gateway
npm start
```

Say "Hey Oracle" followed by a command.

For detailed voice setup instructions, see [Voice Gateway README][voice-readme].

### Check System Resources

```bash
# CPU and memory usage
htop

# Temperature
vcgencmd measure_temp

# Disk space
df -h

# Service status
sudo systemctl status zwave-js-ui
sudo systemctl status oracle
sudo systemctl status ollama
sudo systemctl status mosquitto
sudo systemctl status nginx
```

---

## 13. Next Steps

### Production Hardening

- [ ] **Enable MQTT authentication**
  ```bash
  sudo mosquitto_passwd -c /etc/mosquitto/passwd zwave
  sudo mosquitto_passwd /etc/mosquitto/passwd oracle
  ```

- [ ] **Configure Auth0** properly (if not using mock auth)

- [ ] **Setup SSL/HTTPS** with Let's Encrypt
  ```bash
  sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx -d your-domain.com
  ```

- [ ] **Configure firewall**
  ```bash
  sudo ufw allow 22/tcp   # SSH
  sudo ufw allow 80/tcp   # HTTP
  sudo ufw allow 443/tcp  # HTTPS
  sudo ufw enable
  ```

- [ ] **Setup automatic backups** for database

- [ ] **Configure log rotation**

### Add More Devices

- Include more Z-Wave devices via ZWave-JS-UI
- Test multi-room scenarios
- Create automation scenes

### Voice Commands

- Set up voice gateway (see [Voice Gateway README][voice-readme])
- Configure wake word detection
- Test voice control

### Customize AI Personality

Edit Oracle app personality settings to make your AI assistant:
- Helpful and friendly
- Sarcastic and witty
- Enthusiastic and energetic
- Or create your own!

---

## Troubleshooting

### ZWave-JS-UI won't start

```bash
# Check logs
sudo journalctl -u zwave-js-ui -n 50

# Common issues:
# 1. Serial port permissions
sudo usermod -a -G dialout pi
sudo reboot

# 2. Serial console conflict
sudo sed -i 's/console=serial0,115200 //' /boot/firmware/cmdline.txt
sudo reboot

# 3. Node.js not found
which node
# Should show: /home/pi/.nvm/versions/node/current/bin/node
```

### Oracle app won't start

```bash
# Check logs
sudo journalctl -u oracle -n 50

# Common issues:
# 1. Build not completed
cd ~/code/mqtt-ollama-presentation/apps/oracle
npm run build

# 2. Database not initialized
npx prisma generate
npx prisma migrate deploy

# 3. Environment variables missing
cat .env
# Verify all required vars are set
```

### Ollama is slow

```bash
# Check model size
ollama list

# Use smaller model
ollama pull llama3.2:1b

# Update Oracle app config
nano ~/code/mqtt-ollama-presentation/apps/oracle/.env
# Change: OLLAMA_MODEL=llama3.2:1b

# Restart Oracle
sudo systemctl restart oracle
```

### No audio

```bash
# List devices
aplay -l
arecord -l

# Test microphone
arecord -D plughw:1,0 -d 5 test.wav
aplay test.wav

# Test speakers
speaker-test -t wav -c 2
```

### MQTT not working

```bash
# Check Mosquitto status
sudo systemctl status mosquitto

# View logs
sudo tail -f /var/log/mosquitto/mosquitto.log

# Test connection
mosquitto_sub -h localhost -t "test" -v
mosquitto_pub -h localhost -t "test" -m "hello"
```

---

## Support and Documentation

For more detailed information on specific components:

- **[Project README][readme]** - Main project overview and quick start
- **[Raspberry Pi 5 Setup][pi-setup]** - Detailed Pi configuration with Z-Pi 7 HAT
- **[ZWave-JS-UI Deployment][zwave-deploy]** - Z-Wave controller setup
- **[MQTT Broker Setup][mqtt-setup]** - Comprehensive MQTT configuration guide
- **[Oracle Systemd Setup][oracle-setup]** - Oracle service configuration
- **[Voice Gateway][voice-readme]** - Voice command integration
- **[ALSA Audio Setup][alsa-setup]** - Detailed audio configuration
- **[Network Dependencies][network-deps]** - Internet requirements

---

## Quick Reference Commands

```bash
# Service Management
sudo systemctl status zwave-js-ui
sudo systemctl status oracle
sudo systemctl status ollama
sudo systemctl status mosquitto
sudo systemctl status nginx

# View Logs
sudo journalctl -u zwave-js-ui -f
sudo journalctl -u oracle -f
sudo journalctl -u ollama -f

# Restart Services
sudo systemctl restart zwave-js-ui
sudo systemctl restart oracle

# MQTT Testing
mosquitto_sub -h localhost -t "zwave/#" -v
mosquitto_pub -h localhost -t "test/topic" -m "test message"

# System Monitoring
htop                           # CPU/RAM
vcgencmd measure_temp          # Temperature
df -h                          # Disk space
```

---

**Last Updated:** October 17, 2025

**Questions or issues?** Check the troubleshooting section above or review the detailed guides in the `docs/` directory.

**[← Back to README][readme]** | **[View All Documentation][docs-dir]**

---

<!-- Reference Links - All links defined here for easy maintenance -->

<!-- Main Documentation -->
[readme]: ../README.md
[docs-dir]: .

<!-- Setup Guides -->
[pi-setup]: raspberry-pi-setup.md
[zwave-deploy]: zwave-js-ui-deploy.md
[oracle-setup]: oracle-systemd-setup.md
[mqtt-setup]: mqtt-setup.md
[voice-readme]: ../apps/voice-gateway-oww/README.md

<!-- Additional Documentation -->
[alsa-setup]: alsa-setup.md
[network-deps]: network-dependencies.md

<!-- External Links -->
[github-repo]: https://github.com/yourusername/mqtt-ollama-presentation.git
[zwave-repo]: https://github.com/zwave-js/zwave-js-ui.git
