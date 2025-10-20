# Oracle App - Systemd Service Setup

**[← Back to README][readme]** | **[Getting Started Guide][getting-started]** | **[Raspberry Pi Setup][pi-setup]**

---

This guide explains how to configure the Oracle Next.js app to start automatically on boot using systemd.

**Prerequisites:**
- Oracle app checked out to `~/code/mqtt-ollama-presentation/apps/oracle`
- Node.js installed (see [Node.js Installation][pi-setup-node])
- Dependencies installed (`npm install`)
- Production build completed (`npm run build`)

**IMPORTANT:** This guide reflects lessons learned from production deployment. The two most common issues are:
1. Incorrect directory path (must be `/apps/oracle` not `/oracle`)
2. Missing production build (must run `npm run build` first)

For complete setup from scratch, see the [Getting Started Guide][getting-started].

---

## Quick Setup

### 1. Build the Production App

**CRITICAL FIRST STEP:** You MUST build the production bundle before starting the service.

```bash
cd ~/code/mqtt-ollama-presentation/apps/oracle
npm run build
```

Verify the build succeeded by checking for the `.next` directory:
```bash
ls -la .next/
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
WorkingDirectory=/home/pi/code/mqtt-ollama-presentation/apps/oracle
Environment="NODE_ENV=production"
Environment="LOG_LEVEL=info"
Environment="PORT=3000"
Environment="PATH=/home/pi/.nvm/versions/node/current/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="OLLAMA_BASE_URL=http://localhost:11434"
Environment="OLLAMA_MODEL=llama3.2:3b"
Environment="DATABASE_URL=file:./dev.db"
Environment="MQTT_BROKER_URL=mqtt://127.0.0.1:1883"
ExecStart=/home/pi/.nvm/versions/node/current/bin/node /home/pi/code/mqtt-ollama-presentation/apps/oracle/node_modules/.bin/next start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**IMPORTANT Configuration Notes:**

1. **WorkingDirectory:** Must be `/apps/oracle` NOT `/oracle`
   - Common mistake: Using `/home/pi/code/mqtt-ollama-presentation/oracle`
   - ✅ Correct: `/home/pi/code/mqtt-ollama-presentation/apps/oracle`

2. **ExecStart - Node path:** Use the `current` symlink for version-agnostic Node.js management
   - ✅ Recommended: `/home/pi/.nvm/versions/node/current/bin/node`
   - This symlink points to your active Node version (created in [Raspberry Pi setup](raspberry-pi-setup.md#3-create-node-version-symlink-important))
   - When you upgrade Node.js, just update the symlink - no need to edit service files!

3. **ExecStart - Application path:** Must match WorkingDirectory
   - Full path: `<node-binary> <WorkingDirectory>/node_modules/.bin/next start`
   - Using `next start` directly is more reliable than `npm start` for production deployments

4. **Environment variables:** All required variables must be defined in the service file
   - Add Auth0 credentials if using authentication
   - Adjust MQTT broker URL if not running locally
   - Environment PATH must include NVM's node binary location

5. **LOG_LEVEL:** Controls verbosity of MQTT client and other logging
   - `info` (default): Production mode - only errors and important events
   - `debug`: Development/troubleshooting mode - verbose logging for MQTT operations
   - When troubleshooting, change to `debug` and restart service to see detailed MQTT publish/subscribe logs

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
cd ~/code/mqtt-ollama-presentation/apps/oracle
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

Save this as `~/code/mqtt-ollama-presentation/apps/oracle/install-service.sh`:

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
Environment="LOG_LEVEL=info"
Environment="PORT=3000"
Environment="PATH=/home/$USER/.nvm/versions/node/current/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/home/$USER/.nvm/versions/node/current/bin/npm start
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
cd ~/code/mqtt-ollama-presentation/apps/oracle
chmod +x install-service.sh
./install-service.sh
```

---

## Troubleshooting

### Critical Issues (Based on Production Experience)

#### Issue 1: "Could not find a production build in the '.next' directory"

**Symptoms:**
- Service fails immediately after starting
- Logs show: `Error: Could not find a production build in the '.next' directory. Try building your app with 'next build'`

**Cause:**
The Next.js production build was not created before starting the service.

**Fix:**
```bash
cd ~/code/mqtt-ollama-presentation/apps/oracle
npm run build
sudo systemctl restart oracle.service
```

**Verify build completed:**
```bash
ls -la .next/
```

**Prevention:**
Always run `npm run build` before deploying or updating the service. Consider adding a pre-deployment script to automate this.

---

#### Issue 2: "Changing to the requested working directory failed: No such file or directory"

**Symptoms:**
- Service shows status code `200/CHDIR`
- Service status shows: "activating (auto-restart)"
- Logs show: `Main process exited, code=exited, status=200/CHDIR`

**Cause:**
The `WorkingDirectory` path in the service file is incorrect. This commonly happens when the path points to `/oracle` instead of `/apps/oracle`.

**Diagnosis:**
```bash
# Check if the directory exists
ls -la /home/pi/code/mqtt-ollama-presentation/apps/oracle

# Check current service configuration
sudo cat /etc/systemd/system/oracle.service | grep WorkingDirectory
```

**Fix:**
1. Edit the service file:
   ```bash
   sudo nano /etc/systemd/system/oracle.service
   ```

2. Update BOTH `WorkingDirectory` and `ExecStart` to use `/apps/oracle`:
   ```ini
   WorkingDirectory=/home/pi/code/mqtt-ollama-presentation/apps/oracle
   ExecStart=/home/pi/.nvm/versions/node/current/bin/node /home/pi/code/mqtt-ollama-presentation/apps/oracle/node_modules/.bin/next start
   ```

3. Reload and restart:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart oracle.service
   ```

4. Verify it's running:
   ```bash
   systemctl status oracle.service
   ```

**Prevention:**
Double-check the directory structure before creating the service file. The correct structure is:
- ✅ `/mqtt-ollama-presentation/apps/oracle`
- ❌ `/mqtt-ollama-presentation/oracle`

---

### Other Common Issues

**Check logs:**
```bash
sudo journalctl -u oracle -n 100 --no-pager
```

**Common issues:**

1. **Missing dependencies:**
   ```bash
   cd ~/code/mqtt-ollama-presentation/apps/oracle
   npm install
   npm run build
   sudo systemctl restart oracle
   ```

3. **Port already in use:**
   ```bash
   # Check what's using port 3000
   sudo lsof -i :3000

   # Kill the process or change PORT in service file
   ```

2. **Environment variables not set:**
   ```bash
   # Verify .env file exists and has correct values
   cat ~/code/mqtt-ollama-presentation/apps/oracle/.env
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
cd ~/code/mqtt-ollama-presentation/apps/oracle
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
cd ~/code/mqtt-ollama-presentation/apps/oracle

# Pull latest changes (from repo root)
cd /home/pi/code/mqtt-ollama-presentation
git pull
cd apps/oracle

# Install dependencies (if package.json changed)
npm install

# Rebuild (CRITICAL - don't forget this!)
npm run build

# Restart service
sudo systemctl restart oracle

# Verify it's running
sudo systemctl status oracle

# Check logs for errors
journalctl -u oracle -n 50 --no-pager
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

### Nginx 502 Bad Gateway Error

**Symptoms:**
- Nginx returns "502 Bad Gateway"
- Nginx error log shows: `connect() failed (111: Connection refused) while connecting to upstream`

**Cause:**
The backend service (oracle.service) on port 3000 is not running or not accessible.

**Diagnosis:**
```bash
# Check if oracle service is running
systemctl status oracle.service

# Check if port 3000 is listening
ss -tlnp | grep 3000

# Check nginx error logs
sudo tail -50 /var/log/nginx/error.log
```

**Fix:**
1. Ensure oracle service is running:
   ```bash
   sudo systemctl start oracle.service
   systemctl status oracle.service
   ```

2. If service fails to start, check the logs:
   ```bash
   journalctl -u oracle.service -n 100 --no-pager
   ```

3. Common causes of service failure:
   - Missing production build → Run `npm run build`
   - Incorrect directory path → Fix `WorkingDirectory` in service file
   - See "Critical Issues" in Troubleshooting section above

4. After fixing, restart nginx:
   ```bash
   sudo systemctl restart oracle.service
   sudo systemctl restart nginx
   ```

5. Test again:
   ```bash
   curl -I http://localhost
   ```
   Should return `HTTP/1.1 200 OK`

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

**Last Updated:** October 17, 2025

**[← Back to README][readme]** | **[Getting Started Guide][getting-started]** | **[All Documentation][docs-dir]**

---

<!-- Reference Links - All links defined here for easy maintenance -->

<!-- Internal Documentation -->
[readme]: ../README.md
[getting-started]: GETTING-STARTED.md
[pi-setup]: raspberry-pi-setup.md
[pi-setup-node]: raspberry-pi-setup.md#3-create-node-version-symlink-important
[zwave-deploy]: zwave-js-ui-deploy.md
[docs-dir]: .
