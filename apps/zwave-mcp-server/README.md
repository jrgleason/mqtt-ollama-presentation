# Z-Wave MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with Z-Wave devices through Z-Wave JS UI.

## Features

- **Device Discovery**: List all Z-Wave devices with their status and MQTT topics
- **Node Details**: Get detailed information about specific nodes
- **Value Refresh**: Refresh sensor readings and device states
- **Node Re-interview**: Update device capabilities and information
- **Network Statistics**: Monitor Z-Wave network health
- **Authentication**: Secure access to Z-Wave JS UI API

## Available Tools

### 1. `list_zwave_devices`
Lists all Z-Wave devices reported by Z-Wave JS UI.

**Parameters:**
- `includeInactive` (boolean, optional): Include nodes that are not ready or unavailable
- `filter` (string, optional): Case-insensitive substring to match against name or location

**Example:**
```json
{
  "includeInactive": false,
  "filter": "bedroom"
}
```

### 2. `get_node_details`
Get detailed information about a specific Z-Wave node including all values, command classes, and capabilities.

**Parameters:**
- `nodeId` (number, required): The Z-Wave node ID

**Example:**
```json
{
  "nodeId": 3
}
```

### 3. `refresh_node_values`
Refresh all values for a specific Z-Wave node. Useful for getting updated sensor readings.

**Parameters:**
- `nodeId` (number, required): The Z-Wave node ID to refresh

### 4. `refresh_node_info`
Re-interview a Z-Wave node to get updated device information and capabilities. Use when a device was recently added or changed.

**Parameters:**
- `nodeId` (number, required): The Z-Wave node ID to re-interview

### 5. `get_network_statistics`
Get Z-Wave network statistics including message counts, errors, and overall network health.

**Parameters:** None

## Setup

### 1. Configure Z-Wave JS UI Authentication

First, enable authentication on your Z-Wave JS UI instance by setting environment variables:

```bash
DEFAULT_USERNAME=admin
DEFAULT_PASSWORD=your_secure_password
```

**IMPORTANT**: Even though Z-Wave JS UI runs locally on the Pi, you **MUST** enable authentication to prevent unauthorized access to your Z-Wave network.

### 2. Configure MCP Server

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set the following variables:

```bash
# Z-Wave JS UI Configuration
ZWAVE_UI_URL=http://localhost:8091
ZWAVE_UI_USERNAME=admin
ZWAVE_UI_PASSWORD=your_secure_password

# Enable authentication (REQUIRED for security)
ZWAVE_UI_AUTH_ENABLED=true

# Optional: Socket connection timeout in milliseconds (default: 5000)
# ZWAVE_UI_SOCKET_TIMEOUT_MS=10000

# MQTT Broker Configuration (if using MQTT features)
MQTT_BROKER_URL=mqtt://10.0.0.58:31883
MQTT_USERNAME=jrg
MQTT_PASSWORD=your_mqtt_password
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Build

```bash
npm run build
```

### 5. Run

```bash
npm start
```

Or use the MCP Inspector for testing:

```bash
npm run inspector
```

## Development

### Watch mode

```bash
npm run dev
```

This will rebuild the project automatically when you make changes.

## Security Considerations

### Why Authentication is Important

Even though this runs locally on your Raspberry Pi:

<<<<<<< HEAD
1. **Network Access**: Anyone on your local network could access Z-Wave JS UI without authentication
=======
1. **Network Access**: Anyone on your local network could access ZWaveJSUI without authentication
>>>>>>> 3aa7c77 (Good place to commit)
2. **Home Automation Control**: Unauthorized access means someone could control your lights, locks, thermostats, etc.
3. **Privacy**: Device names and locations may contain sensitive information
4. **Safety**: Some Z-Wave devices control critical systems (locks, thermostats, etc.)

### Best Practices

1. **Always enable authentication** (`ZWAVE_UI_AUTH_ENABLED=true`)
<<<<<<< HEAD
2. **Use strong passwords** for both Z-Wave JS UI and MQTT
3. **Keep credentials in `.env`** file (never commit to git)
4. **Rotate passwords regularly** especially if you suspect unauthorized access
5. **Use HTTPS/TLS** for production deployments (configure in Z-Wave JS UI)
=======
2. **Use strong passwords** for both ZWaveJSUI and MQTT
3. **Keep credentials in `.env`** file (never commit to git)
4. **Rotate passwords regularly** especially if you suspect unauthorized access
5. **Use HTTPS/TLS** for production deployments (configure in ZWaveJSUI)
>>>>>>> 3aa7c77 (Good place to commit)

## Architecture

```
┌─────────────┐
│   Claude    │
│    Code     │
└──────┬──────┘
       │ stdio
       ▼
┌─────────────────────┐
│  Z-Wave MCP Server  │
│  (This Package)     │
└──────┬──────────────┘
       │ HTTP + Socket.IO
       │ (with Bearer Auth)
       ▼
┌─────────────────────┐      ┌────────────┐
<<<<<<< HEAD
│   Z-Wave JS UI         │◄─────┤  Z-Wave    │
=======
│   ZWaveJSUI         │◄─────┤  Z-Wave    │
>>>>>>> 3aa7c77 (Good place to commit)
│   (Port 8091)       │      │  Devices   │
└─────────────────────┘      └────────────┘
```

<<<<<<< HEAD
## Z-Wave JS UI API Endpoints Used

- `POST /api/authenticate` - Authenticate and get bearer token
- `GET /api/exportConfig` - Get all nodes configuration
- `GET /api/settings` - Get Z-Wave JS UI settings
=======
## ZWaveJSUI API Endpoints Used

- `POST /api/authenticate` - Authenticate and get bearer token
- `GET /api/exportConfig` - Get all nodes configuration
- `GET /api/settings` - Get ZWaveJSUI settings
>>>>>>> 3aa7c77 (Good place to commit)
- `GET /api/driver/statistics` - Get network statistics
- `POST /api/refreshNodeValues` - Refresh node values
- `POST /api/refreshNodeInfo` - Re-interview node
- `POST /api/writeValue` - Write value to device
- Socket.IO `INITED` event - Get live node status

## Troubleshooting

### Authentication Failed

If you see "Authentication failed" errors:

<<<<<<< HEAD
1. Verify Z-Wave JS UI has authentication enabled
2. Check that `ZWAVE_UI_USERNAME` and `ZWAVE_UI_PASSWORD` match your Z-Wave JS UI credentials
=======
1. Verify ZWaveJSUI has authentication enabled
2. Check that `ZWAVE_UI_USERNAME` and `ZWAVE_UI_PASSWORD` match your ZWaveJSUI credentials
>>>>>>> 3aa7c77 (Good place to commit)
3. Ensure `ZWAVE_UI_AUTH_ENABLED=true` in your `.env` file

### Connection Timeout

If you see "Timed out while fetching nodes":

<<<<<<< HEAD
1. Verify Z-Wave JS UI is running: `curl http://localhost:8091/health`
=======
1. Verify ZWaveJSUI is running: `curl http://localhost:8091/health`
>>>>>>> 3aa7c77 (Good place to commit)
2. Check the `ZWAVE_UI_URL` in your `.env` file
3. Increase timeout: `ZWAVE_UI_SOCKET_TIMEOUT_MS=10000`

### No Devices Found

If `list_zwave_devices` returns empty:

<<<<<<< HEAD
1. Check that Z-Wave devices are paired in Z-Wave JS UI web UI
2. Try with `includeInactive: true` to see all nodes
3. Verify Z-Wave controller is connected to Z-Wave JS UI
=======
1. Check that Z-Wave devices are paired in ZWaveJSUI web UI
2. Try with `includeInactive: true` to see all nodes
3. Verify Z-Wave controller is connected to ZWaveJSUI
>>>>>>> 3aa7c77 (Good place to commit)

## License

GPL-3.0
