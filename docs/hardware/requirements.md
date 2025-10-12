# Hardware Requirements: Battery-Powered Z-Wave Light Switch Setup

## Project Overview

This document outlines the hardware requirements for a demonstration setup that uses a 120V AC inverter battery to power a Z-Wave controlled light bulb. The goal is to create a portable, self-contained demo unit that requires minimal setup and showcases Z-Wave home automation capabilities.

## Design Goals

1. **Minimal Setup**: Plug-and-play operation with no permanent wiring
2. **Portability**: Entirely battery-powered for presentations and demos
3. **Z-Wave Communication**: Use Z-Wave protocol for reliable local control
4. **Safety**: All connections meet electrical safety standards
5. **Demonstration Ready**: Reliable enough for live presentations

## Core Requirements

### 1. Power Source
- **Type**: Battery with built-in 120V AC inverter
- **Specifications**:
  - Output: 120V AC, 60Hz
  - Minimum continuous power: 100W (sufficient for switch + light bulb)
  - Recommended: 200W+ for headroom
  - Pure sine wave inverter (preferred for electronics)
  - Standard AC outlets (NEMA 5-15R)
- **Examples**:
  - Jackery Explorer 240/300
  - EcoFlow RIVER series
  - Goal Zero Yeti 200X
  - Any portable power station with 120V AC outlet

### 2. Z-Wave Smart Switch

**Two Approaches Available:**

#### Option A: Plug-In Z-Wave Switch (Recommended for Demos)
- **Advantages**: No wiring required, truly plug-and-play
- **Requirements**:
  - Z-Wave Plus certified (700 or 800 series preferred)
  - Standard 120V AC plug (NEMA 5-15P)
  - Pass-through outlet for connecting lamp
  - Maximum load: 15A (1800W)

**Specific Product Recommendations:**
1. **GE/Jasco Z-Wave Plus Plug-In Switch (Model 14288/ZW4103)**
   - Price: ~$40
   - Features: On/off control, 1 grounded outlet, blue LED indicator
   - Availability: Lowe's, Amazon, The Smartest House
   - Load: Up to 600W incandescent, 1/2 HP motor

2. **Zooz Z-Wave Plus Power Switch (ZEN15)**
   - Price: ~$37 (24% off at $49)
   - Features: Power monitoring, 2 outlets, customizable settings
   - Availability: The Smartest House
   - Load: 15A/1800W max

3. **Minoston Z-Wave Outlet Mini Plug-In Socket**
   - Price: ~$25-30
   - Features: Compact design, Z-Wave mesh repeater
   - Availability: Amazon
   - Load: Standard 15A

#### Option B: In-Wall Z-Wave Switch (Advanced Setup)
- **Advantages**: More professional appearance, wider product selection
- **Requirements**:
  - Z-Wave Plus certified
  - 15A rating minimum
  - Single-pole or single-pole/3-way capable
  - Neutral wire required (most modern switches)
  - Standard decorator/rocker style
  - Fits standard electrical box

**Specific Product Recommendations:**
1. **Eaton Z-Wave Plus Switch (RF9601 Series)**
   - Price: ~$55-75
   - Features: Push button, multiple finishes, S2 security
   - Availability: Lowe's, Home Depot
   - Requires: Neutral wire, electrical box mounting

2. **Zooz ZEN71 On/Off Switch**
   - Price: ~$22-30
   - Features: Direct 3-way (no add-on needed), 800 series
   - Availability: The Smartest House
   - Requires: Neutral wire

3. **GE/Enbrighten Z-Wave Plus Switch**
   - Price: ~$30-45
   - Features: Neutral or no-neutral options available
   - Availability: Lowe's, Home Depot, Amazon
   - Various models for different wiring scenarios

### 3. Light Bulb and Lamp
- **Lamp/Fixture**: Any standard table lamp or light fixture with on/off switch
  - Must have switch in "on" position (locked on)
  - Standard E26/E27 socket
  - Recommend: Simple desk lamp or ceramic socket with cage

- **Light Bulb Specifications**:
  - Type: LED (recommended for efficiency and heat)
  - Wattage: 9-15W LED (60-100W equivalent)
  - Base: E26 (standard)
  - Voltage: 120V
  - Total power draw: <100W

**Recommended Products:**
- Any standard LED bulb (Philips, GE, Cree)
- Avoid: Smart bulbs (redundant with smart switch)
- Consider: Color-changing or bright bulb for visual demo impact

### 4. Electrical Accessories (for In-Wall Option)

If using Option B (In-Wall Switch):
- **Electrical Box**: Standard single-gang work box or old-work box
- **Wire**: 14 AWG or 12 AWG Romex or THHN wire
  - Line (hot): Black wire from AC source
  - Neutral: White wire
  - Ground: Bare copper or green wire
  - Load: Black wire to light fixture
- **Wire Nuts**: Appropriate size for 14 or 12 AWG
- **Receptacle/Plug**: NEMA 5-15P plug to connect to battery inverter
- **Cord**: Heavy-duty extension cord (can be cut) or appliance cord

**Wiring Configuration:**
```
Battery AC Outlet → Plug → Line Wire → Z-Wave Switch → Load Wire → Lamp Socket → Bulb
                                       ↓
                                   Neutral & Ground
```

### 5. Z-Wave Controller/Hub

**Required**: Z-Wave USB stick or hub to pair and control the switch

**Options:**
1. **zwave-js-ui on Raspberry Pi** (Project uses this)
   - Hardware: Raspberry Pi 4 (2GB+)
   - Z-Wave Stick: Aeotec Z-Stick 7, Zooz ZST10 700, or similar
   - Software: zwave-js-ui Docker container
   - Integration: MQTT broker for device communication

2. **Alternative Controllers** (for reference):
   - Home Assistant with Z-Wave integration
   - Hubitat Elevation
   - SmartThings Hub (older models with Z-Wave)
   - HomeSeer

### 6. Additional Components

- **MQTT Broker**: Mosquitto running locally (likely on same Raspberry Pi)
- **Network**: Local WiFi or Ethernet for controller/hub
- **Optional Safety**:
  - Surge protector (if inverter doesn't have one)
  - GFCI outlet adapter (for added safety)
  - Electrical tape and wire labels

## Safety Considerations

### Electrical Safety
1. **Load Limits**: Ensure total load (switch + bulb) is well under inverter capacity
2. **Wiring**: All connections must be secure and properly insulated
3. **Grounding**: Maintain proper ground connection throughout
4. **Heat**: Ensure adequate ventilation for inverter and switch
5. **Inspection**: Check all connections before powering on

### Z-Wave Safety
1. **Pairing Distance**: Pair switch within 3 feet of controller initially
2. **Mesh Network**: After pairing, test at demo distance
3. **Interference**: Keep away from large metal objects during demo

### Demo Safety
1. **Battery Level**: Always start presentation with fully charged battery
2. **Backup Plan**: Have spare battery or AC power adapter available
3. **Test Run**: Complete full test 24 hours before presentation
4. **Emergency Off**: Know how to quickly power down system

## Minimum Load Requirements

**Important**: Many Z-Wave switches require a minimum load to function properly.

- **Typical Minimum**: 20-25W (varies by manufacturer)
- **Issue**: Most LED bulbs are <15W
- **Solution Options**:
  1. Use plug-in switch (usually no minimum load)
  2. Use higher wattage LED bulb (20W+)
  3. Add dummy resistive load in parallel
  4. Choose switch designed for LED loads (e.g., Zooz switches)

## Compatibility Requirements

### Z-Wave Specifications
- **Protocol**: Z-Wave Plus (500, 700, or 800 series)
- **Frequency**: 908.42 MHz (US/Canada)
- **Security**: S2 security framework (preferred)
- **Device Class**: Binary switch / On-off power switch
- **Range**: 100m line-of-sight (less through walls)

### Controller Compatibility
- **zwave-js-ui**: Compatible with all Z-Wave Plus devices
- **MQTT Topics**: Standard device discovery and control
- **Command Classes**: Basic, Switch Binary, Association

## Budget Estimate

### Option A: Plug-In Switch Setup (Recommended)
| Component | Estimated Cost |
|-----------|---------------|
| Battery with 120V inverter (if needed) | $150-$300 |
| Z-Wave plug-in switch | $25-$40 |
| Lamp (if needed) | $10-$25 |
| LED bulb | $5-$15 |
| **Total (excluding battery)** | **$40-$80** |
| **Total (with battery)** | **$190-$380** |

### Option B: In-Wall Switch Setup
| Component | Estimated Cost |
|-----------|---------------|
| Battery with 120V inverter (if needed) | $150-$300 |
| Z-Wave in-wall switch | $20-$75 |
| Electrical box and wiring | $10-$25 |
| Lamp/socket | $10-$25 |
| LED bulb | $5-$15 |
| Wire nuts, tape, connectors | $5-$10 |
| **Total (excluding battery)** | **$50-$150** |
| **Total (with battery)** | **$200-$450** |

### Additional Components (Already Owned/Existing)
- Raspberry Pi 4: ~$45
- Aeotec Z-Stick 7: ~$60
- MQTT/Software: Free (open source)

## Recommended Configuration for CodeMash Presentation

**Optimal Setup for Demos:**
- **Power**: Jackery Explorer 240 or EcoFlow RIVER 2 ($200-250)
- **Switch**: GE Z-Wave Plus Plug-In Switch 14288 ($40)
- **Lamp**: Simple desk lamp with locked-on switch ($15)
- **Bulb**: Philips 60W equivalent LED A19 ($8)
- **Total Investment**: ~$265-315 (assuming battery purchase needed)

**Why This Configuration:**
- ✅ Zero wiring - just plug and play
- ✅ Portable and self-contained
- ✅ Reliable for live demonstrations
- ✅ Easy to troubleshoot
- ✅ Can be set up in <5 minutes

## Alternative: No-Wiring Solutions

If wiring complexity is a concern, consider these approaches:
1. **Smart Plug Approach**: Use Z-Wave plug-in outlet (as described in Option A)
2. **Lamp Module**: Z-Wave lamp dimmer module that plugs inline
3. **Portable Outlet**: Create a custom power strip with Z-Wave control

## Success Criteria

A successful hardware setup will:
- ✅ Pair with zwave-js-ui within 30 seconds
- ✅ Respond to MQTT commands reliably (<1 second latency)
- ✅ Operate for full presentation duration on battery
- ✅ Handle 10+ on/off cycles without issues
- ✅ Visible light response for audience
- ✅ Require <5 minutes setup time
- ✅ Fit in carry-on luggage for travel

## Next Steps

1. Review design document for wiring diagrams and assembly instructions
2. Purchase recommended components
3. Test basic functionality before integration
4. Document any modifications needed
5. Create troubleshooting guide based on testing

## References

- [Z-Wave Alliance Device Database](https://products.z-wavealliance.org/)
- [zwave-js-ui Documentation](https://github.com/zwave-js/zwave-js-ui)
- [The Smartest House - Z-Wave Guides](https://www.thesmartesthouse.com/blogs/the-smartest-blog)
- [NEC 2020 - Article 400 (Flexible Cords)](https://www.nfpa.org/codes-and-standards)
