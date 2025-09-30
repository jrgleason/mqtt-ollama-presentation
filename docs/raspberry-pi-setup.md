
# Raspberry Pi 5 Setup (for zwave-js-ui)
This document is a task-oriented checklist describing how to prepare a Raspberry Pi 5 (recommended) to run zwave-js-ui via Docker. It's written as a series of steps you can follow during setup.

Prereqs & hardware
- Raspberry Pi 5 (8GB recommended)
- Active cooling (fan or case with airflow)
- NVMe SSD recommended (via PCIe) or at least fast USB storage
- USB Z‑Wave stick (e.g., Aeotec Z‑Stick 7)
- Reliable power supply

Steps
1. Flash OS
   - Use Raspberry Pi OS 64-bit (Bullseye/Bookworm) or Ubuntu Server ARM64.
   - Use Raspberry Pi Imager or balenaEtcher to flash the image to your SD/NVMe.

2. First boot & basic updates
   - Boot the Pi, enable SSH if needed, login and run:
     sudo apt update && sudo apt upgrade -y
   - Reboot if kernel updated.

3. Install Docker
   - Install Docker using the official convenience script:
     curl -fsSL https://get.docker.com | sh
   - Add your pi user to docker group:
     sudo usermod -aG docker $USER
   - Install the Docker Compose plugin (if required):
     sudo apt install -y docker-compose-plugin
   - Logout/login (or reboot) so the docker group takes effect.

4. Configure storage & networking
   - Mount NVMe/SSD and ensure it is auto-mounted on boot.
   - Optionally set a static IP or reserved DHCP entry for the Pi.
   - Optional: set up UFW firewall to allow only needed ports (SSH, 8091 for zwave-js-ui, MQTT port if local broker).

5. Device permissions (Z‑Wave USB stick)
   - Plug in the stick and check the device path: ls -l /dev/serial/by-id/ or dmesg | tail
   - Prefer using the stable /dev/serial/by-id/ path in docker-compose to avoid switching device names
   - If permissions errors occur, create a udev rule or add the docker user to the dialout group:
     sudo usermod -aG dialout $USER
   - Example udev rule (optional): create `/etc/udev/rules.d/99-zwave.rules` and map by serial number to a stable symlink.

6. Install monitoring & backups (recommended)
   - Cron or systemd-timers to snapshot the zwave-js-ui data directory (volume) before upgrades.
   - rsync or simple tar backups to another host or external USB drive.

7. Choose container runtime and image architecture
   - Prefer Docker with the compose plugin on Pi 5 (ARM64).
   - When pulling images, use the correct image tag for arm64/armv7. Check Docker Hub or the zwave-js-ui repo for recommended tags.

8. Test Docker with a sample container
   - Run: docker run --rm hello-world
   - Verify `docker compose` is available: docker compose version

9. Security notes
   - Change default passwords, keep OS updated, and limit SSH access if exposed to the network.
   - Store credentials in an env file outside version control (.env and add to .gitignore).

10. Operational notes for presentation
   - Keep a backup of the zwave-js-ui data volume or store an exported backup before upgrading the container.
   - Prepare a small cheat-sheet with commands to start/stop the container and to view logs:
     - docker compose -f docker-compose.pi.yml up -d
     - docker compose -f docker-compose.pi.yml logs -f zwave-js-ui
     - docker compose -f docker-compose.pi.yml down

Troubleshooting
- If the Z‑Wave stick is not detected: check dmesg, ensure dialout group membership, try a different USB port.
- If container cannot access device: verify device path used in compose and permissions.
- If image is the wrong architecture: pull a different tag or check upstream for arm64 builds.

References
- zwave-js-ui docs: https://zwave-js.github.io/zwave-js-ui/
- Docker install: https://docs.docker.com/engine/install/




