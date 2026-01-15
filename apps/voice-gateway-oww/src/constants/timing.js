/**
 * Timing Constants
 *
 * All timeout and duration constants used throughout the voice gateway.
 * Values are in milliseconds unless otherwise specified.
 */

/**
 * TOOL_EXECUTION_WARNING_MS - Threshold for logging slow tool executions
 *
 * Tool executions that take longer than this duration will be logged
 * as warnings to help identify performance bottlenecks.
 *
 * Value: 1000ms (1 second)
 * Rationale: Tools should execute quickly; 1s+ indicates potential issues
 */
export const TOOL_EXECUTION_WARNING_MS = 1000;

/**
 * TOOL_EXECUTION_TIMEOUT_MS - Maximum time to wait for tool execution
 *
 * If a tool takes longer than this, the execution is aborted with an error.
 * This prevents the system from hanging indefinitely on stuck tools.
 *
 * Value: 30000ms (30 seconds)
 * Rationale: Most tools should complete in <5s; 30s provides safety margin
 */
export const TOOL_EXECUTION_TIMEOUT_MS = 30000;

/**
 * WHISPER_TRANSCRIPTION_TIMEOUT_MS - Maximum time to wait for Whisper transcription
 *
 * Voice recordings must be transcribed within this time limit to maintain
 * acceptable response latency. Longer recordings may approach this limit.
 *
 * Value: 60000ms (60 seconds)
 * Rationale: Typical transcriptions take 1-3s; 60s handles worst-case scenarios
 */
export const WHISPER_TRANSCRIPTION_TIMEOUT_MS = 60000;

/**
 * WHISPER_PROCESS_DEFAULT_TIMEOUT_MS - Default timeout for Whisper process operations
 *
 * Used for general Whisper operations that don't have a specific timeout.
 *
 * Value: 30000ms (30 seconds)
 * Rationale: Standard timeout for subprocess operations
 */
export const WHISPER_PROCESS_DEFAULT_TIMEOUT_MS = 30000;

/**
 * MCP_CONNECTION_TIMEOUT_MS - Maximum time to wait for MCP server connection
 *
 * MCP servers must connect within this timeout or the connection is aborted.
 * This prevents infinite waiting for unresponsive servers.
 *
 * Value: 5000ms (5 seconds)
 * Rationale: Local MCP servers should connect quickly; 5s is generous
 */
export const MCP_CONNECTION_TIMEOUT_MS = 5000;

/**
 * MCP_STDERR_CAPTURE_MS - Duration to capture stderr from MCP server startup
 *
 * When an MCP server fails to start, we capture stderr for this duration
 * to provide useful error diagnostics.
 *
 * Value: 1000ms (1 second)
 * Rationale: Startup errors typically appear immediately
 */
export const MCP_STDERR_CAPTURE_MS = 1000;

/**
 * MCP_RETRY_BASE_DELAY_MS - Base delay for MCP connection retry backoff
 *
 * When retrying failed MCP connections, this is the base delay that gets
 * multiplied by the retry attempt number for exponential backoff.
 *
 * Value: 2000ms (2 seconds)
 * Rationale: Allows brief recovery time without excessive waiting
 */
export const MCP_RETRY_BASE_DELAY_MS = 2000;

/**
 * MQTT_CONNECTION_TIMEOUT_MS - Maximum time to wait for MQTT broker connection
 *
 * The MQTT client must connect to the broker within this timeout.
 *
 * Value: 5000ms (5 seconds)
 * Rationale: Local broker should connect quickly
 */
export const MQTT_CONNECTION_TIMEOUT_MS = 5000;

/**
 * MQTT_RECONNECT_INTERVAL_MS - Delay between MQTT reconnection attempts
 *
 * After losing connection to the MQTT broker, wait this long before
 * attempting to reconnect.
 *
 * Value: 60000ms (60 seconds / 1 minute)
 * Rationale: Avoids overwhelming broker with rapid reconnection attempts
 */
export const MQTT_RECONNECT_INTERVAL_MS = 60000;

/**
 * CONVERSATION_TIMEOUT_MS - Duration before conversation context expires
 *
 * After this period of inactivity, the conversation context is cleared
 * and the system treats subsequent queries as new conversations.
 *
 * Value: 0 (disabled - each request is standalone)
 * Rationale: For demo, avoid context confusion with small models
 */
export const CONVERSATION_TIMEOUT_MS = 0;

/**
 * DETECTOR_WARMUP_TIMEOUT_MS - Maximum time to wait for wake word detector warmup
 *
 * The wake word detector must complete initialization within this timeout.
 *
 * Value: 10000ms (10 seconds)
 * Rationale: Detector warmup is usually <1s; 10s provides safety margin
 */
export const DETECTOR_WARMUP_TIMEOUT_MS = 10000;

/**
 * ALSA_CHECK_TIMEOUT_MS - Timeout for ALSA device availability checks
 *
 * When checking if an ALSA audio device is available, abort after this time.
 *
 * Value: 5000ms (5 seconds)
 * Rationale: Device checks should be quick; 5s handles slow systems
 */
export const ALSA_CHECK_TIMEOUT_MS = 5000;

/**
 * WAV_WRITER_TIMEOUT_MS - Timeout for WAV file write operations
 *
 * WAV file writes must complete within this timeout to avoid blocking.
 *
 * Value: 5000ms (5 seconds)
 * Rationale: File I/O should be fast; 5s handles slow disks
 */
export const WAV_WRITER_TIMEOUT_MS = 5000;

/**
 * PROVIDER_HEALTH_CHECK_TIMEOUT_MS - Timeout for AI/TTS provider health checks
 *
 * Health check requests to external providers must complete within this time.
 *
 * Value: 5000ms (5 seconds)
 * Rationale: Health checks should be lightweight and fast
 */
export const PROVIDER_HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * MILLISECONDS_PER_SECOND - Conversion constant
 *
 * Used for converting between milliseconds and seconds in calculations.
 *
 * Value: 1000
 */
export const MILLISECONDS_PER_SECOND = 1000;

/**
 * MILLISECONDS_PER_MINUTE - Conversion constant
 *
 * Used for converting between milliseconds and minutes in calculations.
 *
 * Value: 60000 (60 * 1000)
 */
export const MILLISECONDS_PER_MINUTE = 60 * 1000;
