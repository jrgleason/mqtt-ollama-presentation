# Z-Wave MCP Device State Delta

## MODIFIED Requirements

### Requirement: Device State in List Response

The `list_devices` tool MUST include current device state in its response.

#### Scenario: Switch Device State Displayed
GIVEN a switch device named "Switch One" is turned on
WHEN `list_devices` is called
THEN the response MUST include the state "ON" for that device
AND the format MUST be human-readable (e.g., `"Switch One" - ON`)

#### Scenario: Sensor Value Displayed
GIVEN a temperature sensor named "Temp Sensor 1" reads 61.8°F
WHEN `list_devices` is called
THEN the response MUST include the value "61.8°F" for that device

#### Scenario: Unknown State Handled
GIVEN a device has no retrievable state value
WHEN `list_devices` is called
THEN the response MUST indicate "unknown" or omit the state
AND MUST NOT show "null" or "undefined" to the user

### Requirement: AI Response Includes State

The AI MUST mention device states when listing devices.

#### Scenario: AI Lists Device States
GIVEN a user asks "What devices are available?"
WHEN the AI responds using `list_devices` tool data
THEN the response MUST include the on/off state or value of each device
AND the response MUST NOT just list device names without state

### Requirement: Cross-Provider State Reporting

Device state reporting MUST work with both AI providers.

#### Scenario: Ollama Reports Device State
GIVEN the AI provider is Ollama qwen3
WHEN a user asks about available devices
THEN the AI MUST mention device states in the response

#### Scenario: Anthropic Reports Device State
GIVEN the AI provider is Anthropic
WHEN a user asks about available devices
THEN the AI MUST mention device states in the response
