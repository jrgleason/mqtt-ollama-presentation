#!/bin/bash
# Oracle Systemd Service Installation Script

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_NAME="oracle"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
USER=$(whoami)
NODE_PATH=$(which node)
NPM_PATH=$(which npm)

echo "Installing Oracle systemd service..."
echo "Working directory: $SCRIPT_DIR"
echo "User: $USER"
echo "Node path: $NODE_PATH"
echo "NPM path: $NPM_PATH"

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
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
Environment="DATABASE_URL=file:./prisma/dev.db"
Environment="OLLAMA_BASE_URL=http://localhost:11434"
Environment="OLLAMA_MODEL=llama3.2:3b"
Environment="MQTT_BROKER_URL=mqtt://127.0.0.1:1883"
ExecStart=$NODE_PATH $SCRIPT_DIR/node_modules/.bin/next start
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

# Wait a moment for service to start
sleep 2

# Check status
echo ""
echo "✅ Installation complete!"
echo ""
echo "Service status:"
sudo systemctl status "$SERVICE_NAME" --no-pager || true
echo ""
echo "Useful commands:"
echo "  View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "  Restart:   sudo systemctl restart $SERVICE_NAME"
echo "  Stop:      sudo systemctl stop $SERVICE_NAME"
echo "  Status:    sudo systemctl status $SERVICE_NAME"
echo ""
echo "Access the app at: http://$(hostname -I | awk '{print $1}'):3000"
echo "Or via nginx at:   http://$(hostname -I | awk '{print $1}')"
echo ""
