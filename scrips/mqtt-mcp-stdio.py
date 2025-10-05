#!/usr/bin/env python3
"""
Wrapper to run mqtt-mcp with stdio transport for Claude Code integration.
Usage: python3 mqtt-mcp-stdio.py
"""
import asyncio
import os
import sys

try:
    from mqtt_mcp.server import MQTTMCP
except ImportError:
    print("Error: mqtt-mcp not found. Install with: uv pip install mqtt-mcp", file=sys.stderr)
    sys.exit(1)

async def main():
    server = MQTTMCP()
    await server.run_async(transport="stdio")

if __name__ == "__main__":
    asyncio.run(main())
