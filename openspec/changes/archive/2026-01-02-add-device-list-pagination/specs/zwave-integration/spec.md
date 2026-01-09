## ADDED Requirements

### Requirement: Device List Pagination

The Z-Wave MCP server SHALL provide a `list_devices` tool that returns paginated device listings with status information.

#### Scenario: List devices with default pagination

- **GIVEN** Z-Wave network has 25 registered devices
- **WHEN** `list_devices()` is called with no parameters
- **THEN** tool returns first 10 devices
- **AND** response includes: `{ devices: [...], total: 25, showing: 10, hasMore: true }`
- **AND** response message indicates "Showing 10 of 25 devices. Use offset parameter to see more."

#### Scenario: List devices with custom limit

- **GIVEN** Z-Wave network has 25 registered devices
- **WHEN** `list_devices({ limit: 5 })` is called
- **THEN** tool returns first 5 devices
- **AND** response includes: `{ devices: [...], total: 25, showing: 5, hasMore: true }`

#### Scenario: List devices with offset for pagination

- **GIVEN** Z-Wave network has 25 registered devices
- **WHEN** `list_devices({ limit: 10, offset: 10 })` is called
- **THEN** tool returns devices 11-20
- **AND** response includes: `{ devices: [...], total: 25, showing: 10, hasMore: true }`

#### Scenario: List all devices when count is small

- **GIVEN** Z-Wave network has 5 registered devices
- **WHEN** `list_devices()` is called with no parameters
- **THEN** tool returns all 5 devices
- **AND** response includes: `{ devices: [...], total: 5, showing: 5, hasMore: false }`
- **AND** no "more devices" message is shown

#### Scenario: Device entry includes status information

- **GIVEN** device "Living Room Light" exists and was seen 30 seconds ago
- **WHEN** device is included in `list_devices` response
- **THEN** device entry includes: `{ name: "Living Room Light", type: "switch", location: "Living Room", isActive: true, lastSeen: "30 seconds ago" }`

#### Scenario: Device entry shows inactive status

- **GIVEN** device "Garage Sensor" exists but hasn't responded in 10 minutes
- **WHEN** device is included in `list_devices` response
- **THEN** device entry includes: `{ name: "Garage Sensor", type: "sensor", location: "Garage", isActive: false, lastSeen: "10 minutes ago" }`

---

### Requirement: Device Verification

The Z-Wave MCP server SHALL provide a `verify_device` tool to check if a device exists and report its current status.

#### Scenario: Verify existing device

- **GIVEN** device "Kitchen Light" exists in Z-Wave network
- **AND** device responded to MQTT/API within last 2 minutes
- **WHEN** `verify_device({ deviceName: "Kitchen Light" })` is called
- **THEN** tool returns: `{ exists: true, name: "Kitchen Light", type: "switch", location: "Kitchen", isActive: true, lastSeen: "2 minutes ago" }`

#### Scenario: Verify existing but inactive device

- **GIVEN** device "Basement Sensor" exists in Z-Wave network
- **AND** device has not responded in 15 minutes
- **WHEN** `verify_device({ deviceName: "Basement Sensor" })` is called
- **THEN** tool returns: `{ exists: true, name: "Basement Sensor", type: "sensor", location: "Basement", isActive: false, lastSeen: "15 minutes ago" }`
- **AND** response includes warning: "Device exists but may not be responding"

#### Scenario: Verify non-existent device with suggestions

- **GIVEN** device "Kichen Light" (misspelled) does NOT exist
- **AND** device "Kitchen Light" DOES exist
- **WHEN** `verify_device({ deviceName: "Kichen Light" })` is called
- **THEN** tool returns: `{ exists: false, suggestions: ["Kitchen Light"] }`
- **AND** response message: "Device 'Kichen Light' not found. Did you mean: Kitchen Light?"

#### Scenario: Verify non-existent device with no similar names

- **GIVEN** device "Nonexistent Device XYZ" does NOT exist
- **AND** no similar device names exist
- **WHEN** `verify_device({ deviceName: "Nonexistent Device XYZ" })` is called
- **THEN** tool returns: `{ exists: false, suggestions: [] }`
- **AND** response message: "Device 'Nonexistent Device XYZ' not found. No similar devices found."

#### Scenario: Case-insensitive device verification

- **GIVEN** device "Living Room Light" exists
- **WHEN** `verify_device({ deviceName: "living room light" })` is called
- **THEN** tool finds the device (case-insensitive match)
- **AND** returns the canonical name: `{ exists: true, name: "Living Room Light", ... }`

---

### Requirement: Device Activity Tracking

The Z-Wave MCP server SHALL track device activity status based on recent MQTT messages or API responses.

#### Scenario: Device marked active on MQTT message

- **GIVEN** device "Temp Sensor 1" receives MQTT update
- **WHEN** MQTT message is processed
- **THEN** device lastSeen timestamp is updated to current time
- **AND** device isActive returns true (within 5 minute threshold)

#### Scenario: Device marked inactive after timeout

- **GIVEN** device "Motion Sensor" last seen 6 minutes ago
- **WHEN** isActive status is queried
- **THEN** device isActive returns false (exceeded 5 minute threshold)

#### Scenario: Activity threshold is configurable

- **GIVEN** DEVICE_ACTIVE_THRESHOLD_MS environment variable is set to 600000 (10 minutes)
- **WHEN** device "Sensor A" was seen 7 minutes ago
- **THEN** device isActive returns true (within custom 10 minute threshold)

#### Scenario: New device has unknown activity status

- **GIVEN** device "New Switch" was just discovered via API
- **AND** no MQTT messages have been received for this device
- **WHEN** activity status is queried
- **THEN** device isActive returns null (unknown)
- **AND** lastSeen is null or "Never"
