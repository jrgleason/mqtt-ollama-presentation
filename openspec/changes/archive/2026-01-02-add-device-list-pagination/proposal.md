# Change: Add Device List Pagination and Status Checking

## Why

When a Z-Wave network has many devices (10+), listing all devices creates overwhelming responses for the AI and user. Additionally, there's no way to verify if a device ID exists before attempting to control it, or to check if a device is currently responding/active.

## What Changes

- Add pagination to device list: show first 10 devices, indicate if more are available
- Add `verify_device` tool to confirm a device ID exists and check its status
- Include device health/activity status when searching for or verifying devices
- Add `list_devices` tool with pagination support

## Impact

- Affected specs: `zwave-integration`
- Affected code: `apps/zwave-mcp-server/src/mcp-client.js`, `apps/zwave-mcp-server/src/device-registry.js`
- New tools will be exposed to voice-gateway for AI tool calling
