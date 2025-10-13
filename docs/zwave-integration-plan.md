# Z-Wave Integration Plan (Demo-Focused)

**Goal:** Replace mocks with real Z-Wave device data via zwave-js-ui MQTT gateway and control devices from the app.

**Last Updated:** 2025-10-12

---

## Overview
- Use zwave-js-ui on a Raspberry Pi with a Z-Wave USB stick
- Enable its MQTT gateway, pointing to HiveMQ at 10.0.0.58:31883
- Discover devices and store minimal metadata in Prisma (name, type, location, nodeId, control topic)
- Control devices by publishing to zwave-js-ui topics from the app

---

## Prerequisites
- Raspberry Pi with zwave-js-ui installed and reachable (e.g., http://<pi-ip>:8091)
- Z-Wave controller (Aeotec Z-Stick 7, Zooz ZST10)
- 1–2 paired Z-Wave devices (switch/dimmer)
- MQTT broker: HiveMQ CE at 10.0.0.58:31883

---

## Configure zwave-js-ui MQTT Gateway
1) In zwave-js-ui: Settings → MQTT → Enable
2) Broker: host 10.0.0.58, port 31883 (demo: no auth)
3) Prefix: `zwave`
4) Enable "Send Z-Wave Events" and Named Topics (optional)
5) Save and restart

Verify topics:
- Run: mosquitto_sub -h 10.0.0.58 -p 31883 -t 'zwave/#' -v
- Expect currentValue updates when toggling devices

---

## Topic Patterns (Reference)
- State (read): `zwave/<DeviceName or nodeId>/<CommandClass>/<Endpoint>/currentValue`
- Control (write): `zwave/<DeviceName or nodeId>/<CommandClass>/<Endpoint>/targetValue/set`
- Common CCs: 37 = Binary Switch, 38 = Multilevel Switch
- Payloads: `{ "value": true|false }` or `{ "value": 0..100 }`

---

## App Changes (Minimal)
- Add MQTT client singleton (reconnect, QoS 1)
- Update LangChain tools:
  - list_devices → read from Prisma
  - control_device → publish to device.mqttTopic with `{ value }`
- Optional: subscribe to `zwave/+/+/+/currentValue` and update DB state

---

## Device Discovery (Lightweight)
- One-time/manual import acceptable for demo:
  - In zwave-js-ui, note each device’s friendly name and CC/endpoint
  - Construct control topic: `zwave/<Name or nodeId>/<CC>/<endpoint>/targetValue/set`
  - Insert into Prisma (name, type, location, nodeId, mqttTopic)
- Optional script for auto-import can be added later

---

## Test Plan
1) Use mosquitto_pub to toggle a real device via a control topic
2) Call control_device tool from the app; verify device toggles
3) If state subscription enabled, confirm DB reflects currentValue
4) Run full demo path: text → MQTT → device

---

## Troubleshooting
- No topics? Re-check zwave-js-ui MQTT settings and broker reachability
- Device not responding? Verify control topic and payload; test with mosquitto_pub
- State not updating? Confirm currentValue topics and subscription pattern

---

**Status:** DEMO CRITICAL
