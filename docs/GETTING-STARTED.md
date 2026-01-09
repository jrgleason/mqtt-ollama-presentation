# Getting Started Checklist

This page gives the fastest path to a functioning demo. Use it as a checklist, then dive into the linked runbooks when
you need deeper detail.

---

## 1. Pick Your Environment

### Laptop or Desktop (Fastest Way to Try It)

- Install Node.js 20+, Docker, Docker Compose, and Ollama.
- Clone the repo and install web dependencies:
  ```bash
  git clone https://github.com/yourusername/mqtt-ollama-presentation.git
  cd mqtt-ollama-presentation
  npm install --prefix apps/oracle
  ```
- Launch Ollama and pull a chat model (`ollama pull llama3.2:1b` is sufficient for demos).

### Raspberry Pi 5 (Demo Hardware Build)

- Flash Raspberry Pi OS 64-bit, enable SSH, and apply updates (`sudo apt update && sudo apt upgrade -y`).
- Follow the hardware preparation guide for the Z-Pi 7 HAT, audio devices, and cooling.
  See [Raspberry Pi 5 Setup][pi-setup].
- Install Node.js 20 (via NVM), Docker, Docker Compose, and Ollama. If Ollama runs on another machine, note its URL for
  later.

---

## 2. Configure Services

1. Copy the example environment file and supply Auth0 + MQTT credentials:
   ```bash
   cp apps/oracle/.env.tmp.example apps/oracle/.env.tmp.local
   ```
   Required values:
    - `AUTH0_SECRET`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
    - `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`
    - `OLLAMA_BASE_URL` (default expects Ollama on the host)
2. If you plan to use voice support, repeat the env setup for `apps/voice-gateway-oww` (`.env.example` is inside that
   folder) and run `npm install --prefix apps/voice-gateway-oww`.
3. For Pi deployments, provision Mosquitto and zwave-js-ui services using the steps in [MQTT Setup][mqtt-setup]
   and [zwave-js-ui Deploy][zwave-deploy].

---

## 3. Launch the Stack

```bash
docker compose up --build
```

- This starts Oracle, Mosquitto, and zwave-js-ui.
- Add `--profile voice` if you want the wake-word service (requires microphone/speaker access to the host).
- When running on a Pi, ensure `/dev/ttyACM0` is the correct Z-Wave device; update `docker-compose.yml` otherwise.

---

## 4. Validate the Setup

1. Visit `http://localhost:3000` (or the Pi hostname) and sign in with Auth0 credentials.
2. Open `http://localhost:8091` to confirm zwave-js-ui is connected to your controller.
3. Send a few commands in the Oracle UI:
    - “Turn on the living room lights”
    - “Dim the bedroom to 40%”
4. Watch the Mosquitto logs (`docker compose logs mosquitto -f`) to confirm messages are flowing.

---

## 5. Next Steps & Production Hardening

- Configure Oracle as a systemd service on the Pi with the [Oracle Systemd Setup][oracle-systemd] guide.
- Lock down MQTT credentials and broker ACLs (see [MQTT Setup][mqtt-setup]).
- Explore voice control, wake-word tuning, and TTS pipelines via the [Voice Gateway Overview][voice-doc] and related
  audio notes.
- Review the [Documentation Index][docs-index] for research notes, troubleshooting tips, and historical decisions.

---

### Quick Reference

| Task                      | Reference                              |
|---------------------------|----------------------------------------|
| Hardware prep & Pi tuning | [Raspberry Pi 5 Setup][pi-setup]       |
| MQTT broker configuration | [MQTT Setup][mqtt-setup]               |
| zwave-js-ui install       | [zwave-js-ui Deploy][zwave-deploy]     |
| Oracle background service | [Oracle Systemd Setup][oracle-systemd] |
| Voice pipeline            | [Voice Gateway Overview][voice-doc]    |

[pi-setup]: SETUP.md#part-1-hardware-setup-raspberry-pi-5

[mqtt-setup]: SETUP.md#part-2-mqtt-broker-setup

[zwave-deploy]: zwave-setup-guide.md

[oracle-systemd]: DEPLOYMENT.md

[voice-doc]: ../apps/voice-gateway-oww/README.md

[docs-index]: README.md
