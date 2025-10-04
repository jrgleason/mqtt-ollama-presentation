# Hardware Design: Battery-Powered Z-Wave Light Switch Demo

## Design Overview

This document provides detailed design specifications, wiring diagrams, and assembly instructions for creating a portable, battery-powered Z-Wave light switch demonstration unit for the CodeMash 2026 presentation.

## Design Philosophy

**Keep It Simple, Make It Reliable**

The design prioritizes:
1. **Plug-and-Play**: No permanent wiring modifications
2. **Safety First**: All connections meet electrical codes
3. **Demo Reliability**: Works consistently in live presentations
4. **Portability**: Fits in travel luggage
5. **Quick Setup**: <5 minutes from box to working demo

## Recommended Configuration

### Solution A: Plug-In Switch (Recommended)

This is the **simplest and most reliable** approach for presentations.

```
┌─────────────────────────────────────────────────────────┐
│                    PORTABLE DEMO UNIT                    │
│                                                           │
│  ┌──────────────────┐                                    │
│  │  Battery Pack    │                                    │
│  │  with 120V AC    │                                    │
│  │  Inverter        │                                    │
│  └────────┬─────────┘                                    │
│           │                                               │
│           │ 120V AC                                       │
│           ↓                                               │
│  ┌───────────────────┐                                   │
│  │  AC Outlet        │                                   │
│  │  (from inverter)  │                                   │
│  └────────┬──────────┘                                   │
│           │                                               │
│           │ Plug in switch                                │
│           ↓                                               │
│  ┌───────────────────┐         Z-Wave                    │
│  │  Z-Wave Plug-In   │◄────────────────────┐             │
│  │  Smart Switch     │                     │             │
│  │  (GE 14288 or     │                     │             │
│  │   Zooz ZEN15)     │                     │             │
│  └────────┬──────────┘                     │             │
│           │                                 │             │
│           │ Pass-through outlet             │             │
│           ↓                                 │             │
│  ┌───────────────────┐                     │             │
│  │  Lamp Plug        │                     │             │
│  └────────┬──────────┘                     │             │
│           │                                 │             │
│           ↓                                 │             │
│  ┌───────────────────┐                     │             │
│  │  Light Bulb       │                     │             │
│  │  (LED, 9-15W)     │                     │             │
│  └───────────────────┘                     │             │
│                                             │             │
└─────────────────────────────────────────────┼─────────────┘
                                              │
                                              │
                                 ┌────────────▼────────────┐
                                 │  Raspberry Pi 4         │
                                 │  + Z-Stick 7            │
                                 │  + zwave-js-ui          │
                                 │  + Mosquitto MQTT       │
                                 └─────────────────────────┘
```

### Components List (Solution A)

1. **Battery Power Station**: Jackery Explorer 240 (~$200)
   - 240Wh capacity
   - 200W pure sine wave inverter
   - 2x 120V AC outlets
   - USB charging ports
   - Weight: 6.6 lbs

2. **Z-Wave Smart Switch**: GE Z-Wave Plus Plug-In Switch 14288 (~$40)
   - Z-Wave Plus certified
   - 1 grounded outlet
   - Blue LED indicator
   - 600W max load (incandescent)
   - Dimensions: 2.5" x 2" x 3.5"

3. **Lamp**: Basic desk lamp or ceramic socket (~$15)
   - Standard E26 socket
   - On/off switch locked to "on" position
   - Stable base
   - Power cord 6ft+

4. **LED Bulb**: Standard 60W equivalent (~$8)
   - 9W actual draw
   - 800 lumens
   - E26 base
   - Bright white (4000-5000K) for visibility

5. **Total Physical Setup**: <10 lbs, fits in medium backpack

### Assembly Instructions (Solution A)

**Step 1: Prepare Components**
1. Charge battery to 100%
2. Unbox Z-Wave switch
3. Ensure lamp switch is in "on" position
4. Install LED bulb in lamp

**Step 2: Physical Assembly**
1. Place battery on table/demo surface
2. Plug Z-Wave switch into battery AC outlet
3. Plug lamp into Z-Wave switch pass-through outlet
4. Verify LED on Z-Wave switch lights up (may be red/amber before pairing)

**Step 3: Z-Wave Pairing**
1. Ensure Raspberry Pi with Z-Stick is powered on
2. Access zwave-js-ui interface (http://localhost:8091)
3. Click "Add Node" / "Include Device"
4. Press pairing button on Z-Wave switch (usually top paddle, 3 quick presses)
5. Wait for device to appear in zwave-js-ui (~15-30 seconds)
6. Assign friendly name: "Demo Light"

**Step 4: MQTT Configuration**
1. In zwave-js-ui, enable MQTT integration
2. Configure MQTT topics:
   - Command topic: `zwave/demo_light/set`
   - State topic: `zwave/demo_light/status`
3. Test with MQTT client:
   ```bash
   # Turn on
   mosquitto_pub -t 'zwave/demo_light/set' -m '{"value": true}'

   # Turn off
   mosquitto_pub -t 'zwave/demo_light/set' -m '{"value": false}'
   ```

**Step 5: Verification**
- [ ] Light responds to MQTT commands
- [ ] Response time <1 second
- [ ] No flickering or dropout
- [ ] Battery shows >80% charge
- [ ] All connections secure

**Setup Time**: 3-5 minutes (after initial pairing)

---

## Alternative: In-Wall Switch Design

### Solution B: Custom Wired Box (Advanced)

For a more "professional" look or to demonstrate actual switch installation.

```
                    WIRED DEMO BOX
┌──────────────────────────────────────────────────┐
│                                                   │
│  ┌────────────────┐                              │
│  │  Extension     │                              │
│  │  Cord with     │ 120V AC                      │
│  │  Plug          │────────────┐                 │
│  └────────────────┘            │                 │
│                                 │                 │
│                    ┌────────────▼──────────────┐ │
│                    │  Electrical Box           │ │
│                    │  (single gang)            │ │
│                    │                           │ │
│                    │  ┌─────────────────────┐ │ │
│                    │  │  Z-Wave Switch      │ │ │
│                    │  │  (Eaton RF9601 or   │ │ │
│                    │  │   Zooz ZEN71)       │ │ │
│                    │  └──┬────────────────┬─┘ │ │
│                    │     │                │   │ │
│                    │   LINE             LOAD  │ │
│                    │     │                │   │ │
│                    └─────┼────────────────┼───┘ │
│                          │                │     │
│                          │                │     │
│                    ┌─────▼────────────────▼───┐ │
│                    │  Wire Nuts / Junction   │ │
│                    │                          │ │
│                    │  Hot: Black              │ │
│                    │  Neutral: White          │ │
│                    │  Ground: Bare/Green      │ │
│                    └─────┬──────────────┬─────┘ │
│                          │              │       │
│                    Output Wire      To Lamp    │
│                          │              │       │
└──────────────────────────┼──────────────┼───────┘
                           │              │
                           │    ┌─────────▼─────┐
                           │    │  Lamp Socket  │
                           │    │  + LED Bulb   │
                           │    └───────────────┘
                           │
                  ┌────────▼─────────┐
                  │  Battery Inverter │
                  │  120V AC Outlet   │
                  └───────────────────┘
```

### Detailed Wiring Diagram (Solution B)

```
ELECTRICAL BOX INTERIOR VIEW:

                    ┌─────────────────────────────┐
                    │  Z-Wave Switch              │
                    │                             │
                    │  ┌─────────┐                │
                    │  │ LINE    │ ← Black (Hot)  │
                    │  │ (Input) │                │
                    │  └────┬────┘                │
                    │       │                     │
                    │  ┌────▼────┐                │
                    │  │ NEUTRAL │ ← White        │
                    │  └────┬────┘                │
                    │       │                     │
                    │  ┌────▼────┐                │
                    │  │ GROUND  │ ← Bare/Green   │
                    │  └────┬────┘                │
                    │       │                     │
                    │  ┌────▼────┐                │
                    │  │ LOAD    │ → Black (Hot)  │
                    │  │ (Output)│   to lamp      │
                    │  └─────────┘                │
                    └─────────────────────────────┘

Wire Connections:
┌─────────────┬───────────────┬──────────────────┐
│  Source     │  Switch       │  Destination     │
├─────────────┼───────────────┼──────────────────┤
│  Hot (Blk)  │  LINE         │  From AC plug    │
│  Neutral(W) │  NEUTRAL      │  Shared          │
│  Ground(Gr) │  GROUND       │  Shared          │
│  ---        │  LOAD         │  To Lamp Hot     │
│  Neutral(W) │  ---          │  To Lamp Neutral │
└─────────────┴───────────────┴──────────────────┘
```

### Components List (Solution B)

1. **Battery Power Station**: Same as Solution A (~$200)

2. **Z-Wave In-Wall Switch**: Eaton RF9601DRB (~$55-75)
   - Z-Wave Plus certified
   - 15A rating
   - Neutral required
   - Push-button rocker style
   - Available in multiple finishes

3. **Electrical Box**: Single-gang old-work box (~$2-5)
   - PVC or metal
   - 18-22 cubic inches
   - Mounting ears for portable box

4. **Wire**: 14 AWG Romex or THHN (~$10 for 25ft)
   - Black (hot)
   - White (neutral)
   - Bare copper (ground)
   - Recommended: Pre-made pigtails

5. **AC Cord**: Heavy-duty extension cord (cut) or appliance cord (~$8-12)
   - 14 AWG, 3-wire
   - NEMA 5-15P plug
   - At least 6 feet

6. **Lamp Cord**: Standard lamp cord or extension cord section (~$5)
   - 16 or 18 AWG acceptable for low-watt LED
   - 3-wire recommended

7. **Wire Nuts**: Assorted pack (~$5)
   - Yellow (for 2x 14 AWG)
   - Red (for 3+ 14 AWG)

8. **LED Bulb & Lamp**: Same as Solution A (~$23)

**Total**: ~$310-340 for complete setup

### Assembly Instructions (Solution B)

**Step 1: Prepare Electrical Box**
1. Mount electrical box to piece of plywood or sturdy base
2. Ensure box is stable and won't tip over
3. Knock out appropriate openings for wires

**Step 2: Prepare Input Power Cord**
1. Cut extension cord to desired length (6-10 feet)
2. Strip outer jacket 6-8 inches from cut end
3. Strip individual wires 3/4 inch
4. Label: Black = Line Hot, White = Neutral, Green/Bare = Ground

**Step 3: Prepare Output Lamp Cord**
1. Cut lamp cord to desired length (3-6 feet)
2. Strip outer jacket 6-8 inches from one end
3. Strip individual wires 3/4 inch
4. Add plug to other end (or use pre-made lamp cord)
5. Install lamp socket if using bare wire

**Step 4: Wire the Switch**

⚠️ **SAFETY**: Ensure power cord is NOT plugged in during wiring!

1. **Connect LINE (Input Hot)**:
   - Input cord black wire → Switch LINE terminal (brass screw or marked)
   - Tighten securely

2. **Connect NEUTRAL**:
   - Input cord white wire → Switch NEUTRAL terminal (silver screw)
   - Use wire nut to also connect to output cord white wire
   - May need pigtail (short wire to switch, wire nut joins all whites)

3. **Connect GROUND**:
   - Input cord green/bare wire → Switch GROUND (green screw)
   - Use wire nut to also connect to output cord ground
   - May need pigtail

4. **Connect LOAD (Output Hot)**:
   - Output cord black wire → Switch LOAD terminal (brass screw, marked "LOAD")
   - Tighten securely

5. **Verify Connections**:
   - Tug test each wire
   - Ensure no bare copper visible outside wire nuts
   - Ensure wires aren't crossing or touching

**Step 5: Mount Switch in Box**
1. Carefully fold wires into box
2. Screw switch to box ears
3. Install wall plate (decorator style)

**Step 6: Z-Wave Pairing**
Same as Solution A, Step 3

**Step 7: Testing**
1. Plug input cord into battery
2. Plug lamp into output cord
3. Verify power at switch (LED indicator)
4. Test physical paddle (should control light)
5. Test Z-Wave control via MQTT

**Setup Time**: 10-15 minutes (after initial assembly)

---

## Power Calculations

### Load Analysis

**Total Power Draw:**
```
Component           | Voltage | Current | Power
--------------------|---------|---------|-------
LED Bulb            | 120V    | 0.08A   | 9W
Z-Wave Switch       | 120V    | 0.02A   | 2-3W
Total Draw          | 120V    | 0.10A   | 11-12W
```

**Battery Life Estimation:**

Jackery Explorer 240 (240Wh capacity):
```
Runtime = Capacity / Load
Runtime = 240Wh / 12W = 20 hours
```

With inverter efficiency (~85%):
```
Actual Runtime = 20h × 0.85 = 17 hours
```

**Presentation Requirements:**
- Typical presentation: 1-2 hours
- Battery capacity used: ~12-24Wh
- Remaining capacity: >90%
- ✅ More than sufficient for demo

### Inverter Considerations

**Pure Sine Wave vs Modified Sine Wave:**
- **Pure Sine Wave**: Recommended
  - Clean power, compatible with all electronics
  - Z-Wave switches work reliably
  - More expensive

- **Modified Sine Wave**: Avoid
  - Can cause issues with sensitive electronics
  - May interfere with Z-Wave radio
  - Cheaper but risky for demos

**Inverter Sizing:**
- Continuous power rating: 100W minimum, 200W recommended
- Surge/peak rating: 300W+ for startup inrush
- Output: 120V AC ± 5%, 60Hz ± 0.5Hz

---

## Physical Layout and Portability

### Recommended Demo Setup

```
                TABLE/PRESENTATION SURFACE

┌──────────────────────────────────────────────────────┐
│                                                       │
│    ┌─────────┐                                       │
│    │ Battery │                                       │
│    │  Pack   │                                       │
│    └────┬────┘                                       │
│         │                                            │
│         │ (Short cord/plug)                          │
│         │                                            │
│    ┌────▼─────┐           ┌──────────┐              │
│    │ Z-Wave   │───────────│   Lamp   │              │
│    │  Switch  │  6" cord  │   with   │              │
│    │  (Plug)  │           │   Bulb   │              │
│    └──────────┘           └──────────┘              │
│                                                       │
│                     [Demo Area - Visible to Audience]│
└───────────────────────────────────────────────────────┘

        ┌──────────────┐
        │ Raspberry Pi │  ← Hidden under table or
        │  + Z-Stick   │     in separate location
        └──────────────┘
```

### Packing List for Travel

**Hard Case Contents:**
- [ ] Battery power station (charged to 100%)
- [ ] Battery charging cable
- [ ] Z-Wave smart switch
- [ ] LED bulb (in protective case)
- [ ] Small lamp or socket
- [ ] Extension cord (6ft, just in case)
- [ ] Raspberry Pi + Z-Stick (in case)
- [ ] USB power supply for Raspberry Pi
- [ ] Network cable (if not using WiFi)

**Carry-On Backpack:**
- [ ] Laptop for presentation
- [ ] Presentation slides
- [ ] Backup documentation
- [ ] Business cards
- [ ] Multi-tool (checked bag or buy on site)

**Weight & Dimensions:**
- Total weight: ~15-20 lbs
- Fits in: Medium rolling case + backpack
- TSA: Battery <100Wh may require removal/inspection

---

## Testing Checklist

### Pre-Presentation Testing (1 Week Before)

**Day 1: Basic Functionality**
- [ ] Battery charges to 100%
- [ ] Inverter produces 120V AC
- [ ] Z-Wave switch powers on
- [ ] Light bulb illuminates
- [ ] Physical switch controls light

**Day 2: Z-Wave Pairing**
- [ ] Device pairs with controller
- [ ] Pairing time <30 seconds
- [ ] Device appears in zwave-js-ui
- [ ] Friendly name assigned

**Day 3: MQTT Control**
- [ ] MQTT messages reach switch
- [ ] Light responds to commands
- [ ] Response time <1 second
- [ ] 20 consecutive on/off cycles successful

**Day 4: Presentation Simulation**
- [ ] Full setup in <5 minutes
- [ ] Demo script runs smoothly
- [ ] All features work as expected
- [ ] Battery lasts full simulation (2 hours)
- [ ] Teardown in <3 minutes

**Day 5: Backup Testing**
- [ ] Test with spare battery (if available)
- [ ] Test with AC power adapter
- [ ] Document any failure modes
- [ ] Create troubleshooting guide

### On-Site Testing (Day of Presentation)

**2 Hours Before:**
- [ ] Battery at 100%
- [ ] Complete setup from scratch
- [ ] Full demo run-through
- [ ] Check WiFi/network connectivity
- [ ] Test backup scenarios

**1 Hour Before:**
- [ ] Equipment powered on and stable
- [ ] Light responds to test commands
- [ ] Presentation machine connected
- [ ] Slides loaded and tested

**15 Minutes Before:**
- [ ] Final power check
- [ ] Final connectivity check
- [ ] Backup plan reviewed
- [ ] Deep breath!

---

## Troubleshooting Guide

### Issue: Switch Won't Pair

**Symptoms**: Device not discovered during inclusion
**Possible Causes**:
1. Too far from controller
2. Already paired to another controller
3. Device not in pairing mode

**Solutions**:
1. Move switch within 3 feet of Z-Stick
2. Exclude/reset device first
3. Press pairing button correctly (check manual)
4. Try inclusion again with fresh batteries in switch

### Issue: Light Doesn't Respond to Commands

**Symptoms**: MQTT commands sent but no physical response
**Possible Causes**:
1. MQTT topic mismatch
2. Z-Wave mesh routing issue
3. Device sleeping/unreachable
4. Wiring issue (Solution B)

**Solutions**:
1. Verify MQTT topic in zwave-js-ui
2. Wake device (press physical button)
3. Check zwave-js-ui logs for errors
4. Test with physical switch
5. Re-interview device

### Issue: Intermittent Control

**Symptoms**: Sometimes works, sometimes doesn't
**Possible Causes**:
1. Weak Z-Wave signal
2. Interference from other devices
3. Power supply fluctuation
4. Mesh routing instability

**Solutions**:
1. Move controller closer (eliminate distance as variable)
2. Remove other wireless devices temporarily
3. Check battery charge level
4. Reboot Raspberry Pi + zwave-js-ui
5. Re-pair device

### Issue: Battery Dies During Demo

**Symptoms**: Everything powers off
**Solutions**:
1. Have spare battery ready
2. Switch to AC power adapter (if available)
3. Use pre-recorded demo video as backup
4. Explain situation honestly and continue without live demo

### Issue: Minimum Load Not Met

**Symptoms**: Switch clicks but doesn't stay on, erratic behavior
**Cause**: LED bulb wattage too low for switch minimum
**Solutions**:
1. Use higher wattage bulb (20W+)
2. Add resistive dummy load in parallel
3. Choose different switch model (Zooz switches have low minimums)

---

## Bill of Materials

### Solution A: Plug-In Switch (Recommended)

| Item | Product | Quantity | Price (Est.) | Retailer | Link/Model |
|------|---------|----------|--------------|----------|------------|
| Battery | Jackery Explorer 240 | 1 | $200 | Amazon | B07D29QNMJ |
| Z-Wave Switch | GE Plug-In Switch | 1 | $40 | Lowe's | 14288/ZW4103 |
| Lamp | Basic Desk Lamp | 1 | $15 | Lowe's | Various |
| Bulb | Philips 60W LED | 1 | $8 | Lowe's/HD | 479395 |
| **Total** | | | **$263** | | |

### Solution B: In-Wall Switch

| Item | Product | Quantity | Price (Est.) | Retailer | Link/Model |
|------|---------|----------|--------------|----------|------------|
| Battery | Jackery Explorer 240 | 1 | $200 | Amazon | B07D29QNMJ |
| Z-Wave Switch | Eaton RF9601DRB | 1 | $65 | Lowe's | 5005451989 |
| Electrical Box | Single Gang Box | 1 | $3 | Lowe's | Various |
| Wire | 14 AWG Romex 25ft | 1 | $10 | Lowe's/HD | Various |
| AC Cord | Extension Cord | 1 | $10 | Lowe's/HD | Various |
| Wire Nuts | Assorted Pack | 1 | $5 | Lowe's/HD | Various |
| Lamp & Bulb | Same as Solution A | 1 | $23 | Lowe's | Various |
| **Total** | | | **$316** | | |

### Already Owned (Not Included in Budget)

- Raspberry Pi 4 (2GB+): ~$45
- Aeotec Z-Stick 7: ~$60
- MicroSD card (32GB): ~$8
- Raspberry Pi power supply: ~$10
- Network connection (WiFi or Ethernet)
- MQTT/zwave-js-ui (free open source)

---

## Safety and Compliance

### Electrical Safety Standards

**NEC (National Electrical Code) Compliance:**
- Article 400: Flexible Cords and Cables
- Article 410: Luminaires and Lighting
- Article 422: Appliances

**Key Requirements:**
- Proper wire gauge for amperage (14 AWG for 15A)
- Secure connections (no exposed conductors)
- Proper grounding throughout
- Strain relief on cord connections
- Suitable insulation ratings

### Demonstration Safety

**Before Presentation:**
- Visual inspection of all cords and connections
- No frayed wires or damaged insulation
- All wire nuts secure
- Proper load calculations confirmed

**During Presentation:**
- Battery on stable, level surface
- Cords arranged to prevent tripping
- No water or liquids near electrical components
- Emergency power-off plan in place
- Fire extinguisher location known

**After Presentation:**
- Proper storage of battery (50-70% charge)
- Coil cords properly (no kinks)
- Inspect for damage from transport
- Document any issues for future reference

---

## Maintenance and Care

### Battery Maintenance

**Regular Care:**
- Charge to 80-90% for storage
- Recharge every 3-6 months if unused
- Avoid complete discharge
- Store in cool, dry location (not freezing)
- Check charge level 1 week before presentation

**Lifespan:**
- Expected cycles: 500-1000 (varies by model)
- Capacity degradation: ~80% after 2-3 years
- Signs of replacement: Won't hold charge, swelling, overheating

### Z-Wave Device Care

**Maintenance:**
- Occasional "heal" in zwave-js-ui (rebuilds routes)
- Firmware updates as available
- Re-pair if experiencing issues
- Keep away from extreme temperatures

**Long-term:**
- Z-Wave devices last 5-10+ years typically
- No moving parts to wear out
- Firmware support may end eventually

---

## Customization Options

### Visual Enhancements

1. **Branded Enclosure**: Custom box with project logo
2. **Color-Changing Bulb**: More visually striking for demos
3. **Multiple Lights**: Show control of multiple devices
4. **Display Panel**: LCD showing MQTT messages in real-time

### Functional Additions

1. **Power Monitoring**: Use Zooz ZEN15 to display wattage
2. **Dimming**: Replace on/off switch with dimmer module
3. **Motion Sensor**: Add Z-Wave motion sensor trigger
4. **Voice Control**: Demo via Amazon Echo + zwave-js-ui

### Advanced Configurations

1. **Automation Demo**: "Turn on light when motion detected"
2. **Schedule Demo**: "Turn on light at sunset"
3. **Scene Demo**: "Movie mode - dim lights to 20%"
4. **Multi-Device**: Control lights + smart outlet + sensor

---

## Conclusion

This design provides two viable solutions for creating a portable, battery-powered Z-Wave demonstration unit:

**Solution A (Recommended)**: Plug-in switch approach
- Simplest assembly
- Most reliable for demos
- Lowest technical complexity
- Best for first-time builders

**Solution B (Advanced)**: In-wall switch in custom box
- More professional appearance
- Demonstrates "real" switch installation
- More educational value
- Requires electrical knowledge

Both solutions meet the project requirements:
- ✅ Portable and self-contained
- ✅ Battery-powered operation
- ✅ Z-Wave communication
- ✅ Minimal setup time
- ✅ Demonstration-ready
- ✅ Safe and code-compliant

**Recommended Path Forward:**
1. Start with Solution A for initial testing
2. Build Solution B if time permits and for enhanced demos
3. Test thoroughly before presentation
4. Have backup plan (AC power, spare battery, demo video)
5. Document lessons learned for future presentations

## Next Steps

1. ✅ Review requirements document
2. ✅ Review design document (this document)
3. ⏳ Purchase components
4. ⏳ Assemble hardware
5. ⏳ Test Z-Wave pairing
6. ⏳ Test MQTT integration
7. ⏳ Practice full demo
8. ⏳ Document troubleshooting
9. ⏳ Pack for CodeMash
10. ⏳ Present with confidence!
