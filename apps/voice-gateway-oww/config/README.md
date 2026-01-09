# Voice Gateway Configuration

This directory contains systemd service configuration for deploying the voice gateway as a system service.

## Files

- **voice-gateway-oww.service** - Systemd service definition (safe to check into git)
- **secrets.env.example** - Example secrets file template (check into git)
- **secrets.env** - Actual secrets (DO NOT check into git - excluded by .gitignore)

## Setup Instructions

### 1. Create Secrets Directory on Server

SSH into your server and create the secrets directory:

```bash
sudo mkdir -p /etc/voice-gateway-oww
sudo chown pi:pi /etc/voice-gateway-oww
sudo chmod 755 /etc/voice-gateway-oww
```

### 2. Create Secrets File

Create the secrets file in your project directory and symlink it to /etc:

```bash
# On the server
cd ~/code/mqtt-ollama-presentation/apps/voice-gateway-oww/config

# Copy example and edit with your actual API keys
cp secrets.env.example secrets.env
nano secrets.env

# Set proper permissions
chmod 600 secrets.env

# Create symlink from /etc to project directory
sudo ln -sf ~/code/mqtt-ollama-presentation/apps/voice-gateway-oww/config/secrets.env /etc/voice-gateway-oww/secrets.env
```

**Required for Online Mode (Anthropic + ElevenLabs):**
```bash
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
ELEVENLABS_API_KEY=sk_your-actual-key-here
```

**Optional (if using authenticated services):**
```bash
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
ZWAVE_UI_USERNAME=admin
ZWAVE_UI_PASSWORD=your-password
```

### 3. Install Service File

```bash
sudo cp voice-gateway-oww.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable voice-gateway-oww
sudo systemctl start voice-gateway-oww
```

### 4. Verify Service

```bash
# Check service status
sudo systemctl status voice-gateway-oww

# View logs
journalctl -u voice-gateway-oww -f

# Verify secrets are loaded
journalctl -u voice-gateway-oww | grep "API Key Configuration"
```

## Security Notes

1. **Never commit secrets.env** - It's excluded by .gitignore but double-check before pushing
2. **File permissions** - secrets.env should be 600 (read/write by owner only)
3. **Service file is public** - Only contains config, no secrets
4. **Secrets location** - `/etc/voice-gateway-oww/secrets.env` is outside the code directory

## Switching Between Online/Offline Modes

The service file defaults to **Online Mode** (Anthropic + ElevenLabs).

To switch modes, edit the service file:

**Offline Mode** (Ollama + Piper - no API keys needed):
```bash
sudo nano /etc/systemd/system/voice-gateway-oww.service

# Change these lines:
Environment="AI_PROVIDER=ollama"
Environment="TTS_PROVIDER=Piper"

sudo systemctl daemon-reload
sudo systemctl restart voice-gateway-oww
```

**Hybrid Modes:**
- **Hybrid A** (Ollama + ElevenLabs): `AI_PROVIDER=ollama`, `TTS_PROVIDER=ElevenLabs`
- **Hybrid B** (Anthropic + Piper): `AI_PROVIDER=anthropic`, `TTS_PROVIDER=Piper`

## Troubleshooting

**Service fails to start:**
```bash
# Check for missing API keys
journalctl -u voice-gateway-oww | grep "API"

# Verify secrets file exists and has correct permissions
ls -la /etc/voice-gateway-oww/secrets.env

# Verify secrets file is loaded
sudo systemctl show voice-gateway-oww --property=Environment
```

**API key not being read:**
- Check file permissions (must be readable by `pi` user)
- Check EnvironmentFile directive in service file
- Verify no syntax errors in secrets.env (no quotes needed)

**Still seeing placeholder values:**
- Make sure you edited `config/secrets.env` not the example file
- Verify symlink is correct: `ls -la /etc/voice-gateway-oww/secrets.env`
- Restart service after changing secrets: `sudo systemctl restart voice-gateway-oww`
