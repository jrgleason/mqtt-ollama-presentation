# Documentation Index

Use this map to find the right level of detail. Each entry links to the original deep-dive so you can keep the main flow lightweight.

## Start Here
- [GETTING-STARTED.md](GETTING-STARTED.md) – Checklist that walks you from blank machine to working demo
- [raspberry-pi-setup.md](raspberry-pi-setup.md) – Hardware prep, NVM/Node symlink pattern, and Pi-specific tuning
- [mqtt-setup.md](mqtt-setup.md) & [zwave-js-ui-deploy.md](zwave-js-ui-deploy.md) – Broker configuration plus Z-Wave controller bring-up

## Services & Apps
- [voice-gateway-architecture.md](voice-gateway-architecture.md) – How wake-word detection, Whisper transcription, MQTT intents, and TTS cooperate
- [oracle-systemd-setup.md](oracle-systemd-setup.md) – Run the Oracle Next.js app as a managed service on Raspberry Pi
- [mqtt-mcp-setup.md](mqtt-mcp-setup.md) & [mqtt-mcp-testing-session.md](mqtt-mcp-testing-session.md) – MCP bridge notes and validation logs
- [zwave-mcp-findings.md](zwave-mcp-findings.md) – Observations from integrating the MCP bridge with zwave-js-ui

## Voice, Audio & Models
- [openwakeword-embedding-extraction.md](openwakeword-embedding-extraction.md) – Custom wake-word training workflow
- [piper-tts-guide.md](piper-tts-guide.md), [piper-voice-options.md](piper-voice-options.md), [piper-glados-voice.md](piper-glados-voice.md) – TTS model selection, tuning, and fun extras
- [piper-tts-streaming-analysis.md](piper-tts-streaming-analysis.md) – Streaming constraints and audio latency notes
- [alsa-setup.md](alsa-setup.md) – ALSA configuration examples for USB microphones and speakers

## Architecture & Planning
- [architecture-decision-nextjs-vs-react-native.md](architecture-decision-nextjs-vs-react-native.md) – Rationale for choosing Next.js
- [project-architecture-clarification.md](project-architecture-clarification.md) – System boundaries and messaging flows spelled out
- [performance-optimization.md](performance-optimization.md) – Headroom analysis and tuning ideas for the Pi build
- [network-dependencies.md](network-dependencies.md) – Which pieces require outbound internet and how to mitigate it

## Operational Notes & History
- [critical-actions-summary.md](critical-actions-summary.md) & [critical-fixes-implementation-summary.md](critical-fixes-implementation-summary.md) – What was fixed urgently and how
- [delivered.md](delivered.md) – Finished features with dates
- [requirements.md](requirements.md) – Comprehensive functional and non-functional requirements
- [tasks.md](tasks.md) & [tasks-active.md](tasks-active.md) – Planning snapshots (helpful if you need backlog context)
- [notes.md](notes.md) & [questions.md](questions.md) – Raw research dumps and open questions worth revisiting

## Supporting Materials
- `hardware/` – Wiring diagrams and component photos used during the build
- `prompts/` – Prompt engineering experiments captured during the presentation prep
- [mcp-web-access-recommendation.md](mcp-web-access-recommendation.md) & [mqtt-mcp-research.md](mqtt-mcp-research.md) – Long-form investigations into MCP integrations
- [outline.md](outline.md) – Slide/presentation structure from the talk

> Looking for something not listed? Run `rg --files docs` to see every note, or skim the Git history for richer narrative context.
