# Clarifying Questions for CodeMash 2026 Presentation (Condensed)

Last Updated: 2025-10-12

---

## ✅ Decisions (Current)

- Q1. Z-Wave JS UI Integration: Use zwave-js-ui as-is (built-in MQTT, low maintenance)
- Q2. Frontend Architecture: Next.js (App Router, TS). See architecture decision doc for details.
- Q4. Wake Word: OpenWakeWord (ONNX, offline), wake word "Hey Jarvis". Porcupine path deprecated.
- Q5. Ollama: Runs natively (likely Pi 5). Prefer models with reliable tool-calling: llama3.2:1b (Pi) / 3b, or mistral.
  Avoid qwen/gemma/phi variants for tool-calling in practice.
- Q6. MQTT Broker: HiveMQ CE at mqtt://localhost:1883. zwave-js-ui publishes to HiveMQ. Client uses mqtt.js.
- Q7. Voice Input Method: Dedicated service selected — voice-gateway-oww (Node.js + ALSA). Browser-based mic approach is
  deprecated for the demo.
- Q8. Auth: Auth0 (Next.js SDK v4) is recommended, but optional and currently deferred for the live demo to keep it
  fully local/offline-friendly. If enabled, follow quickstart and env config.

See also: voice-gateway-architecture.md (final voice stack), network-dependencies.md (what needs internet), outline.md (
presentation flow).

---

## 📝 Implementation Inputs (kept succinct)

- Q3. Database Schema: Start minimal and expand as needed. Initial tables: Users (optional if Auth disabled), Devices (
  mqttTopic, room, type), UserPreferences. ConversationHistory can be a stretch goal.
- Q5. Model Selection: Hardcode model via env for demo (LLM_MODEL=llama3.2:1b on Pi; 3b/mistral on desktop).
- Q6. MQTT Security: For demo, basic username/password or open; document TLS for production later.
- Q7. Voice Triggering: Wake-word UX with OWW; push-to-talk option not used for demo.
- Q9. Hardware: Raspberry Pi 5 + Z-Wave daughter board (or USB stick) + 2–3 physical devices.
- Q10. Mock Devices: Real devices preferred; mock interface as fallback/stretch.
- Q11. AI Personality: Deferred (stretch).
- Q12. Live Demo: Yes. Prepare offline/backup flows.
- Q13. Code Walkthrough Depth: 60 minutes total. See outline.md for time breakdown.
- Q14. Audience Interaction: None (time constraints).
- Q15. Stretch Goals: 1) Conversation history, 2) Personality system, 3) ESP32 example.

---

## 📊 Decision Log (Key updates)

| Date       | Item | Decision                   | Notes                                               |
|------------|------|----------------------------|-----------------------------------------------------|
| 2025-09-29 | Q1   | Use zwave-js-ui as-is      | Built-in MQTT, well-maintained                      |
| 2025-09-29 | Q2   | Next.js with App Router    | See architecture-decision-nextjs-vs-react-native.md |
| 2025-09-29 | Q8   | Auth0 SDK v4 (Recommended) | Decision stands but is optional for demo            |
| 2025-10-12 | Q4   | OpenWakeWord selected      | Porcupine path deprecated                           |
| 2025-10-12 | Q5   | Prefer llama3.2/mistral    | Reliable tool-calling                               |
| 2025-10-12 | Q7   | Dedicated Voice Service    | Browser mic approach deprecated                     |

---

## 📋 Status Summary

- Fully Answered: 6/15
    - Q1, Q2, Q4, Q5, Q6, Q7
- Optional/Deferred: 1/15
    - Q8 (Auth0 – recommended but optional for demo)
- Remaining (implementation detail choices as we build): Q3, Q9–Q15

---

## 🔗 References

- Architecture Decision: Next.js vs React Native — architecture-decision-nextjs-vs-react-native.md
- Voice Gateway Architecture — voice-gateway-architecture.md
- Network Dependencies — network-dependencies.md
- Requirements — requirements.md
- Outline — outline.md
