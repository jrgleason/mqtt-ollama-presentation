# zwave-js-ui Deployment Notes

This document contains step-by-step deployment guidance and example configuration for running the official zwave-js-ui Docker image on a Raspberry Pi or other host.

Quick start (Pi)
1. Ensure the Pi is prepared (see docs/raspberry-pi-setup.md).
2. Copy deployment/zwave-js-ui/docker-compose.pi.yml to the Pi or use it from repo.
3. Create an env file next to the compose file (e.g. .env.zwave) with any MQTT credentials.
4. Start the container:
   docker compose -f docker-compose.pi.yml --env-file .env.zwave up -d
5. Access UI: http://<pi-host>:8091

MQTT gateway configuration (recommended)
- Configure the MQTT gateway from the zwave-js-ui web UI (Settings → Add-ons or Integrations → MQTT Gateway) or provide env values at container start.

Example environment variables (docker-compose.pi.yml supports these placeholders):
- MQTT_BROKER_URL (e.g. mqtt://mosquitto:1883 or tcp://192.168.1.10:1883)
- MQTT_USERNAME
- MQTT_PASSWORD
- MQTT_TOPIC_PREFIX (default: zwave)

Example .env.zwave
MQTT_BROKER_URL=mqtt://mosquitto:1883
MQTT_USERNAME=zwaveuser
MQTT_PASSWORD=change-me
MQTT_TOPIC_PREFIX=zwave
TZ=America/Los_Angeles

Persistence and backups
- The compose file mounts a data volume (zwavejs-data) at /usr/src/app/data inside the container.
- Backup strategy:
  - Stop container: docker compose down
  - Copy data: docker cp zwave-js-ui:/usr/src/app/data ./zwavejs-data-backup
  - Or tar the volume contents from the host path if using a host mount.
- Before upgrading the container, export or snapshot the data directory.

Device mapping and permissions
- Use a stable device path (prefer /dev/serial/by-id/) when mapping the Z‑Wave stick in compose to avoid device renaming.
- Example devices section in compose:
  devices:
    - /dev/serial/by-id/:/dev/serial/by-id/:ro
- If you encounter permission issues, ensure the host user is in the dialout group or add udev rules.

Choosing an image tag for Pi
- Check Docker Hub / project docs for arm64 vs armv7 tags. On Pi 5 use arm64 builds when available.
- If `latest` pulls the wrong architecture, switch to a specific tag recommended upstream.

Troubleshooting
- UI unreachable: confirm container status (docker ps), check port mapping, check firewall.
- Z‑Wave stick not detected: check dmesg, ensure correct /dev path and that container has access.
- MQTT not publishing: verify gateway settings in UI, test broker reachability from the Pi: mosquitto_sub / mosquitto_pub or `docker exec -it <container> sh` then use curl or mosquitto client.

Operational commands
- Start: docker compose -f docker-compose.pi.yml --env-file .env.zwave up -d
- Stop: docker compose -f docker-compose.pi.yml down
- Logs: docker compose -f docker-compose.pi.yml logs -f zwave-js-ui
- Upgrade: pull new image, stop container, backup data, start with new image

References
- zwave-js-ui docs: https://zwave-js.github.io/zwave-js-ui/
- MQTT: https://mosquitto.org/


