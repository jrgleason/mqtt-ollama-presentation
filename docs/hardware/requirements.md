# Hardware Quick Guide (Demo-Focused)

Battery-powered Z-Wave light control for portable demos. This is the minimal, reliable setup we actually use.

Last Updated: 2025-10-12

---

## What to Bring (Shopping List)

- Portable battery with 120V AC inverter (pure sine wave preferred)
  - Examples: Jackery Explorer 240, EcoFlow RIVER 2
- Z-Wave plug-in smart switch (no wiring)
  - Examples: GE/Jasco Z-Wave Plus Plug-In Switch (14288/ZW4103), Zooz ZEN15, Minoston plug
- Simple lamp (switch set to ON) + standard LED bulb (E26, 9–15W)
- Raspberry Pi with zwave-js-ui + Z-Wave USB stick (Aeotec Z‑Stick 7 or Zooz ZST10)
- USB microphone + speaker (for voice demo)

---

## Why Plug‑in Switch (and not in‑wall)
- True plug‑and‑play, no exposed wiring
- Faster setup (< 5 minutes)
- Works well with portable battery in a conference setting

(In‑wall wiring option is deprecated for demos. Use plug‑in modules.)

---

## Setup Steps (5 minutes)

1) Power
- Plug battery in; verify AC outlet is live.

2) Z‑Wave
- Pi running zwave‑js‑ui; pair the plug‑in switch (keep within 3 ft to include securely).
- Enable zwave‑js‑ui MQTT gateway → Broker: 10.0.0.58:31883, Prefix: `zwave`.

3) Lamp
- Lamp switch locked ON; bulb installed.
- Plug the lamp into the Z‑Wave plug; plug the Z‑Wave plug into the battery.

4) App
- Oracle app publishes MQTT command to the plug’s control topic.
- Verify on/off and dim (if dimmer).

---

## MQTT Topics (Typical)
- Control: `zwave/<DeviceName or nodeId>/<CC>/<endpoint>/targetValue/set`
- State: `zwave/<DeviceName or nodeId>/<CC>/<endpoint>/currentValue`
- Common CC: 37 (switch), 38 (dimmer)
- Payloads: `{ "value": true|false }` or `{ "value": 0..100 }`

---

## Safety & Reliability
- Keep total load < 100W; LED bulbs only (cool/efficient)
- Ensure proper grounding via the plug‑in module
- Ventilate the battery and keep electronics off carpeting
- Start with a fully charged battery; bring AC adapter as backup
- Test full flow 24 hours before presentation; bring a spare bulb

---

## Success Criteria
- Pairs with zwave‑js‑ui in ~30 seconds
- Responds to MQTT commands in < 1 second
- Runs entire session on battery without brownouts
- 10+ on/off cycles without issue; clearly visible to audience
- Packs into carry‑on

---

## Budget (Approx.)
- Battery: $200–250
- Z‑Wave plug‑in switch: $25–40
- Lamp + bulb: $15–25
- Z‑Wave stick (if needed): $50–60

---

## Notes
- Avoid smart bulbs (redundant).
- If dimmer behavior is inconsistent with very low‑watt LEDs, increase brightness or use a non‑dimming plug.
- For the demo environment, the MQTT broker is HiveMQ CE at 10.0.0.58:31883.
