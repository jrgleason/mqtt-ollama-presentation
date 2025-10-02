# Requirements Document

## Introduction

This feature implements a local AI-powered home automation system for the CodeMash 2026 presentation (January 12, 2026). The system demonstrates how to build intelligent home automation using MQTT + Ollama that runs entirely on local infrastructure without cloud dependencies, providing natural language control of Z-Wave devices through a conversational AI interface.

**Project Deadline:** January 1, 2026
**Deliverables:** 
- Functional demo application for live presentation
- Presentation materials and slide deck
- Complete working system that can be deployed and demonstrated

## Requirements

### Requirement 1: Natural Language Command Processing

**User Story:** As a homeowner, I want to control my smart home devices using natural language commands, so that I can interact with my home automation system conversationally without memorizing specific commands or using multiple apps.

#### Acceptance Criteria

1. WHEN a user enters a text command like "Turn off all the lights" THEN the system SHALL parse the command using the local Ollama LLM
2. WHEN a user provides contextual commands like "turn it off" after mentioning a device THEN the system SHALL maintain conversation context and execute the command on the previously referenced device
3. WHEN a user enters an ambiguous command THEN the system SHALL ask clarifying questions to determine the intended action
4. WHEN the system processes a command THEN it SHALL provide conversational responses with configurable personality (helpful, sarcastic, enthusiastic)
5. WHEN a user enters a complex scene command like "Make the living room cozy for movie night" THEN the system SHALL execute multiple device actions (dim lights, adjust temperature)

### Requirement 2: MQTT Device Communication

**User Story:** As a system administrator, I want the AI system to communicate with smart home devices via MQTT, so that I can integrate with existing home automation infrastructure and maintain reliable device control.

#### Acceptance Criteria

1. WHEN the system needs to control a device THEN it SHALL publish commands to the appropriate MQTT broker topics
2. WHEN device states change THEN the system SHALL subscribe to device state topics and update its internal cache
3. WHEN the system starts up THEN it SHALL discover available devices by scanning MQTT topics
4. WHEN a device goes offline THEN the system SHALL handle device unavailable states gracefully and inform the user
5. WHEN device state updates occur THEN the system SHALL maintain a real-time device state cache for quick responses

### Requirement 3: Z-Wave Device Integration

**User Story:** As a homeowner with Z-Wave devices, I want the system to control my existing Z-Wave switches, dimmers, and sensors, so that I can use natural language to control my current smart home setup without replacing hardware.

#### Acceptance Criteria

1. WHEN the system integrates with Z-Wave devices THEN it SHALL use zwave-js-ui via MQTT gateway
2. WHEN Z-Wave devices are available THEN the system SHALL support binary switches (on/off), multilevel switches (dimmers), sensors (temperature, motion, door/window), and thermostats
3. WHEN Z-Wave devices are discovered THEN the system SHALL map device IDs to friendly names and room assignments
4. WHEN Z-Wave device events occur THEN the system SHALL handle and respond to device state changes and events
5. WHEN users reference devices by friendly names THEN the system SHALL translate these to appropriate Z-Wave device commands

### Requirement 4: User Authentication and Authorization

**User Story:** As a system owner, I want secure access to my home automation system, so that only authorized users can control my devices and access my home automation data.

#### Acceptance Criteria

1. WHEN a user accesses the system THEN they SHALL authenticate using Auth0 OIDC SPA authentication
2. WHEN API endpoints are accessed THEN they SHALL be protected with JWT validation
3. WHEN users log in THEN the system SHALL maintain user sessions with automatic token refresh
4. WHEN authentication tokens expire THEN the system SHALL handle token refresh transparently
5. WHEN users access protected resources THEN the system SHALL validate their authorization

### Requirement 5: Data Persistence and Management

**User Story:** As a user, I want my device configurations, preferences, and conversation history to be saved, so that the system remembers my setup and provides consistent experiences across sessions.

#### Acceptance Criteria

1. WHEN user preferences are set THEN the system SHALL store them in SQLite database
2. WHEN devices are configured THEN the system SHALL store device mappings (MQTT topic → friendly name → room)
3. WHEN conversations occur THEN the system SHALL optionally store conversation history for context
4. WHEN users create shortcuts THEN the system SHALL store command templates and shortcuts
5. WHEN data backup is needed THEN the system SHALL support data export/import functionality

### Requirement 6: Voice Commands (Stretch Goal)

**User Story:** As a user, I want to control my home automation system using voice commands, so that I can operate devices hands-free and have a more natural interaction experience.

#### Acceptance Criteria

1. WHEN a user speaks into their microphone THEN the system SHALL accept voice input via browser microphone API
2. WHEN voice input is received THEN the system SHALL transcribe speech using local Whisper model
3. WHEN voice commands are processed THEN the system SHALL provide audio feedback for voice interactions
4. WHEN background noise is present THEN the system SHALL handle noise gracefully and request clarification if needed
5. IF wake word detection is implemented THEN the system SHALL start listening when the wake word is detected

### Requirement 7: Demo Application and Presentation

**User Story:** As a presenter at CodeMash 2026, I want a fully functional demo application that showcases the home automation system capabilities, so that I can deliver an engaging live demonstration and provide attendees with a working example they can recreate.

#### Acceptance Criteria

1. WHEN the demo application is deployed THEN it SHALL be ready for live presentation by January 1, 2026
2. WHEN demonstrating the system THEN it SHALL include a working Next.js web interface with authentication
3. WHEN showing device control THEN the demo SHALL control at least 2-3 physical Z-Wave devices (switches, dimmers, sensors)
4. WHEN demonstrating AI capabilities THEN the system SHALL respond to natural language commands with configurable personality
5. WHEN presenting the architecture THEN the demo SHALL show MQTT communication, Ollama integration, and real-time device updates
6. WHEN the presentation concludes THEN attendees SHALL have access to complete source code and deployment instructions
7. WHEN technical issues occur THEN the demo SHALL have backup mechanisms (recorded video, mock devices) to ensure presentation success

### Requirement 8: ESP32 Integration (Stretch Goal)

**User Story:** As a maker, I want to integrate custom ESP32 devices with the home automation system, so that I can add custom sensors and actuators to my smart home setup.

#### Acceptance Criteria

1. WHEN ESP32 devices are available THEN the system SHALL support them via MQTT communication
2. WHEN demonstrating ESP32 integration THEN the system SHALL include at least one example (temperature/humidity sensor, LED strip control, or button/switch input)
3. WHEN ESP32 devices connect THEN the system SHALL discover and control them through the same natural language interface
4. WHEN developers want to add ESP32 devices THEN the system SHALL provide firmware templates for ESP32
5. WHEN ESP32 devices publish data THEN the system SHALL integrate sensor data into the conversational AI responses