#!/bin/bash

# MQTT Connection Test Script
# Tests environment variables and MQTT broker connectivity

echo "========================================"
echo "MQTT Connection Test"
echo "========================================"
echo ""

# Check environment variables
echo "1. Checking Environment Variables"
echo "-----------------------------------"

check_env() {
  local var_name=$1
  local var_value="${!var_name}"

  if [ -z "$var_value" ]; then
    echo "❌ $var_name: NOT SET"
    return 1
  else
    # Mask password partially
    if [[ "$var_name" == *"PASSWORD"* ]]; then
      local masked="${var_value:0:3}***${var_value: -2}"
      echo "✅ $var_name: $masked"
    else
      echo "✅ $var_name: $var_value"
    fi
    return 0
  fi
}

all_set=true
check_env "MQTT_BROKER_HOST" || all_set=false
check_env "MQTT_BROKER_PORT" || all_set=false
check_env "MQTT_USERNAME" || all_set=false
check_env "MQTT_PASSWORD" || all_set=false
check_env "MQTT_CLIENT_ID" || all_set=false

echo ""

if [ "$all_set" = false ]; then
  echo "⚠️  Some environment variables are missing!"
  echo ""
  echo "Add these to your ~/.zshrc or ~/.bashrc:"
  echo ""
  echo 'export MQTT_BROKER_HOST=10.0.0.58'
  echo 'export MQTT_BROKER_PORT=31883'
  echo 'export MQTT_USERNAME=jrg'
  echo 'export MQTT_PASSWORD=<your-password>'
  echo 'export MQTT_CLIENT_ID=claude_mcp'
  echo ""
  echo "Then run: source ~/.zshrc"
  exit 1
fi

echo "2. Testing Network Connectivity"
echo "-----------------------------------"

# Test if broker host is reachable
echo -n "Testing connection to $MQTT_BROKER_HOST:$MQTT_BROKER_PORT... "
if nc -zv -w 5 "$MQTT_BROKER_HOST" "$MQTT_BROKER_PORT" 2>&1 | grep -q succeeded; then
  echo "✅ Port is open"
else
  echo "❌ Cannot connect to broker"
  echo ""
  echo "Possible issues:"
  echo "  - HiveMQ pod not running: kubectl get pods -n communications"
  echo "  - Network issue: Check if 10.0.0.58 is reachable"
  echo "  - Firewall blocking port 31883"
  exit 1
fi

echo ""
echo "3. Testing MQTT Authentication"
echo "-----------------------------------"

# Check if mosquitto_pub is installed
if ! command -v mosquitto_pub &> /dev/null; then
  echo "⚠️  mosquitto_pub not found"
  echo ""
  echo "Install mosquitto-clients:"
  echo "  macOS: brew install mosquitto"
  echo "  Ubuntu: sudo apt-get install mosquitto-clients"
  echo ""
  exit 1
fi

# Test publish
test_topic="test/claude-mcp/connection-$(date +%s)"
test_message="Connection test from $(hostname) at $(date)"

echo -n "Publishing test message to $test_topic... "
if mosquitto_pub -h "$MQTT_BROKER_HOST" -p "$MQTT_BROKER_PORT" \
   -u "$MQTT_USERNAME" -P "$MQTT_PASSWORD" \
   -t "$test_topic" -m "$test_message" 2>&1; then
  echo "✅ Publish successful"
else
  echo "❌ Publish failed"
  echo ""
  echo "Possible issues:"
  echo "  - Wrong username/password"
  echo "  - RBAC permissions issue"
  echo "  - Check HiveMQ logs: kubectl logs -n communications deployment/comms-hivemq"
  exit 1
fi

echo ""
echo "4. Testing Python MQTT MCP Package"
echo "-----------------------------------"

echo -n "Checking Python version... "
if command -v python3 &> /dev/null; then
  python_version=$(python3 --version)
  echo "✅ $python_version"
else
  echo "❌ Python3 not found"
  exit 1
fi

echo -n "Checking mqtt-mcp package... "
if python3 -m pip show mqtt-mcp &> /dev/null; then
  mcp_version=$(python3 -m pip show mqtt-mcp | grep Version | cut -d' ' -f2)
  echo "✅ mqtt-mcp v$mcp_version installed"
else
  echo "❌ mqtt-mcp not installed"
  echo ""
  echo "Install with: pip install mqtt-mcp"
  exit 1
fi

echo -n "Testing mqtt-mcp module... "
if python3 -m mqtt_mcp --help &> /dev/null; then
  echo "✅ Module loads correctly"
else
  echo "❌ Module failed to load"
  exit 1
fi

echo ""
echo "========================================"
echo "✅ All Tests Passed!"
echo "========================================"
echo ""
echo "Your MQTT MCP configuration should work."
echo ""
echo "Next steps:"
echo "  1. Restart Claude Desktop to reload MCP servers"
echo "  2. Check logs: tail -f ~/Library/Logs/Claude/mcp*.log"
echo "  3. Test MCP Inspector: npx @modelcontextprotocol/inspector"
echo ""
