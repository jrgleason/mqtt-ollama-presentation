# Oracle App - Systemd Service Setup

This guide explains how to configure the Oracle Next.js app to start automatically on boot using systemd.

**Prerequisites:**
- Oracle app checked out to `~/code/mqtt-ollama-presentation/oracle`
- Node.js installed
- Dependencies installed (`npm install`)
- Production build completed (`npm run build`)

---

## Quick Setup

### 1. Build the Production App

```bash
cd ~/code/mqtt-ollama-presentation/oracle
npm run build
```

### 2. Create Systemd Service File

```bash
sudo nano /etc/systemd/system/oracle.service
```

Paste the following configuration:

```ini
[Unit]
Description=Oracle - AI Home Automation Assistant
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/code/mqtt-ollama-presentation/oracle
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings (optional but recommended)
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**Note:** If your username is not `pi`, replace `User=pi` and the path accordingly.

### 3. Enable and Start Service

```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable oracle

# Start service now
sudo systemctl start oracle

# Check status
sudo systemctl status oracle
```

### 4. Verify App is Running

```bash
# Check if app is listening on port 3000
curl http://localhost:3000

# View logs
sudo journalctl -u oracle -f
```

---

## Service Management Commands

```bash
# Start service
sudo systemctl start oracle

# Stop service
sudo systemctl stop oracle

# Restart service
sudo systemctl restart oracle

# Check status
sudo systemctl status oracle

# View logs (last 50 lines)
sudo journalctl -u oracle -n 50

# Follow logs in real-time
sudo journalctl -u oracle -f

# View logs since boot
sudo journalctl -u oracle -b

# Disable auto-start on boot
sudo systemctl disable oracle

# Enable auto-start on boot
sudo systemctl enable oracle
```

---

## Environment Variables

### Method 1: Using .env File (Recommended)

Create production environment file:

```bash
cd ~/code/mqtt-ollama-presentation/oracle
cp .env.example .env
nano .env
```

Add your production values:

```bash
# Database
DATABASE_URL=file:./prod.db

# Auth0
AUTH0_SECRET=your-production-secret-here
AUTH0_BASE_URL=http://your-pi-ip-or-domain
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# App
NODE_ENV=production
PORT=3000
```

The systemd service will automatically load the `.env` file.

### Method 2: Environment Variables in Service File

Alternatively, add environment variables directly to the service file:

```bash
sudo nano /etc/systemd/system/oracle.service
```

```ini
[Service]
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="DATABASE_URL=file:./prod.db"
Environment="OLLAMA_BASE_URL=http://localhost:11434"
Environment="OLLAMA_MODEL=llama3.2:3b"
Environment="MQTT_BROKER_URL=mqtt://localhost:1883"
Environment="AUTH0_SECRET=your-secret"
Environment="AUTH0_BASE_URL=http://your-pi-ip"
# ... etc
```

After editing, reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart oracle
```

---

## Complete Installation Script

Save this as `~/code/mqtt-ollama-presentation/oracle/install-service.sh`:

```bash
#!/bin/bash
# Oracle Systemd Service Installation Script

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_NAME="oracle"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
USER=$(whoami)

echo "Installing Oracle systemd service..."
echo "Working directory: $SCRIPT_DIR"
echo "User: $USER"

# Check if .env exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "⚠️  Warning: .env file not found. Creating from example..."
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "⚠️  Please edit .env with your production values before starting the service"
    echo "   nano $SCRIPT_DIR/.env"
fi

# Build the app
echo "Building production app..."
cd "$SCRIPT_DIR"
npm run build

# Create systemd service file
echo "Creating systemd service file..."
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Oracle - AI Home Automation Assistant
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
echo "Reloading systemd..."
sudo systemctl daemon-reload

# Enable service
echo "Enabling service to start on boot..."
sudo systemctl enable "$SERVICE_NAME"

# Start service
echo "Starting service..."
sudo systemctl start "$SERVICE_NAME"

# Check status
echo ""
echo "✅ Installation complete!"
echo ""
echo "Service status:"
sudo systemctl status "$SERVICE_NAME" --no-pager
echo ""
echo "Useful commands:"
echo "  View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "  Restart:   sudo systemctl restart $SERVICE_NAME"
echo "  Stop:      sudo systemctl stop $SERVICE_NAME"
echo "  Status:    sudo systemctl status $SERVICE_NAME"
echo ""
echo "Access the app at: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
```

Make it executable and run:

```bash
cd ~/code/mqtt-ollama-presentation/oracle
chmod +x install-service.sh
./install-service.sh
```

---

## Troubleshooting

### Service fails to start

**Check logs:**
```bash
sudo journalctl -u oracle -n 100 --no-pager
```

**Common issues:**

1. **Build not completed:**
   ```bash
   cd ~/code/mqtt-ollama-presentation/oracle
   npm run build
   sudo systemctl restart oracle
   ```

2. **Missing dependencies:**
   ```bash
   cd ~/code/mqtt-ollama-presentation/oracle
   npm install
   sudo systemctl restart oracle
   ```

3. **Port already in use:**
   ```bash
   # Check what's using port 3000
   sudo lsof -i :3000

   # Kill the process or change PORT in service file
   ```

4. **Environment variables not set:**
   ```bash
   # Verify .env file exists and has correct values
   cat ~/code/mqtt-ollama-presentation/oracle/.env
   ```

5. **Permission errors:**
   ```bash
   # Ensure user owns the directory
   sudo chown -R $USER:$USER ~/code/mqtt-ollama-presentation
   ```

### App crashes on startup

**Check for missing environment variables:**
```bash
# View service environment
sudo systemctl show oracle | grep Environment
```

**Test app manually first:**
```bash
cd ~/code/mqtt-ollama-presentation/oracle
npm start
# Press Ctrl+C to stop
```

If it works manually but not as a service, the issue is likely environment variables.

### High memory usage

**Check memory:**
```bash
free -h
```

**Monitor service memory:**
```bash
sudo systemctl status oracle
```

If needed, add memory limits to service file:

```ini
[Service]
MemoryLimit=1G
```

### Logs not showing

**Verify journald is running:**
```bash
sudo systemctl status systemd-journald
```

**View all logs:**
```bash
sudo journalctl -u oracle --all
```

---

## Updating the App

When you update the code:

```bash
cd ~/code/mqtt-ollama-presentation/oracle

# Pull latest changes
git pull

# Install dependencies (if package.json changed)
npm install

# Rebuild
npm run build

# Restart service
sudo systemctl restart oracle

# Verify it's running
sudo systemctl status oracle
```

---

## Uninstalling the Service

```bash
# Stop service
sudo systemctl stop oracle

# Disable auto-start
sudo systemctl disable oracle

# Remove service file
sudo rm /etc/systemd/system/oracle.service

# Reload systemd
sudo systemctl daemon-reload
```

---

## Integration with Nginx

If you configured nginx to proxy port 80 to 3000, verify the full chain:

```bash
# Check oracle service
sudo systemctl status oracle

# Check nginx service
sudo systemctl status nginx

# Test local app
curl http://localhost:3000

# Test via nginx
curl http://localhost
```

---

## Production Checklist

Before going to production:

- [ ] `.env` file configured with production values
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] Auth0 configured with correct callback URLs
- [ ] MQTT broker accessible and tested
- [ ] Ollama service running with desired model
- [ ] Nginx configured and tested
- [ ] Firewall rules configured (ports 80, 443)
- [ ] Service starts on boot (test with `sudo reboot`)
- [ ] Logs reviewed for errors
- [ ] Backup strategy in place for database

---

**Last Updated:** December 10, 2025
