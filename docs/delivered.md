# Delivered Features & Completed Tasks (Summary)

Last Updated: 2025-10-12

This summarizes completed work for the MQTT + Ollama Home Automation demo.

---

## Core Platform

- Next.js (Oracle) app scaffolded with TypeScript and Tailwind
- Prisma + SQLite database with seed devices and client singleton
- Ollama integrated; models pulled and inference tested (local)
- Chat API with streaming SSE; LangChain agent and tools wired (mock → ready for DB)

## Messaging & Infrastructure

- HiveMQ CE broker available at localhost:1883; connectivity verified
- Project docs created: setup, requirements, decisions, and network dependencies

## Voice (Foundation)

- Voice gateway service skeleton in place
- Chosen stack: OpenWakeWord + Whisper via Ollama + Piper (offline)
- MQTT contracts defined for voice/req, voice/res, voice/status

## Z-Wave (Prep)

- Plan set to use zwave-js-ui MQTT gateway
- Pi + Z-Wave USB stick identified for pairing demo devices

---

## Notable Artifacts

- App structure established (app/api/chat, lib/ollama, lib/langchain/tools)
- Seed DB with sample devices
- Docs: outline, requirements (condensed), tasks, network-dependencies

---

## Next Up (handoff to active tasks)

- Replace mock tools with Prisma-backed queries and MQTT publishes
- Add robust MQTT client (singleton, reconnect, QoS 1)
- Stabilize voice gateway (timeouts, re-enable wake word) and add Piper playback
- End-to-end demo pass (text + voice)

Refer to `docs/tasks-active.md` for the current sprint plan.
