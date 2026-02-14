# 🐘 Elephant Entity Card

A compact, customisable entity card for Home Assistant with dynamic icon support and full colour control.

![Preview 1](preview1.png)
![Preview 2](preview2.png)

## Features

- **Dynamic state icons** — Icons automatically change to reflect the entity’s current state (essential for blood glucose trend sensors, covers, locks, and other entities whose icon varies with state)
- **Auto-population** — When you select an entity, the name and icon are automatically filled in from Home Assistant attributes
- **Smart icon mapping** — Domain and device class aware icon selection out of the box
- **State-aware colouring** — Icons reflect active/inactive state using your HA theme colours, or override with custom colours
- **Full colour customisation** — Set background, text and icon colours individually
- **Transparency control** — Adjust card background opacity with a slider
- **Decimal precision** — Choose how many decimal places are shown for numeric sensor values
- **Offline awareness** — Unavailable or unknown entities are clearly shown as “Offline”
- **Friendly state labels** — Binary sensors, locks, doors and windows display human-readable states

## Configuration

### Visual Editor

1. Edit a dashboard and click **+ Add Card**
1. Search for **Elephant Entity Card**
1. Select your entity — name and icon will auto-populate
1. Toggle **Dynamic State Icon** if the entity’s icon changes with state
1. Customise colours, transparency and decimal places as needed

### YAML

```yaml
type: custom:elephant-entity-card
entity: sensor.living_room_temperature
name: Living Room
unit: °C
decimals: 1
use_dynamic_icon: false
icon: mdi:thermometer
background_color: "#1a1a2e"
text_color: "#ffffff"
icon_color: "#e94560"
transparency: 0.85
state_color: false
```

## Options

|Option            |Type                 |Default             |Description                                                |
|------------------|---------------------|--------------------|-----------------------------------------------------------|
|`entity`          |`string`             |**Required**        |The entity ID to display                                   |
|`name`            |`string`             |Entity friendly name|Override the display name                                  |
|`unit`            |`string`             |Entity unit         |Override the unit of measurement                           |
|`use_dynamic_icon`|`boolean`            |`false`             |Enable dynamic state-based icon changes                    |
|`icon`            |`string`             |Auto-mapped         |Override the icon (only when `use_dynamic_icon` is `false`)|
|`decimals`        |`number`             |`2`                 |Decimal places for numeric states                          |
|`background_color`|`string` or `[r,g,b]`|HA default          |Card background colour                                     |
|`text_color`      |`string` or `[r,g,b]`|HA default          |Text colour                                                |
|`icon_color`      |`string` or `[r,g,b]`|Inherited           |Icon colour (only when `state_color: false`)               |
|`transparency`    |`number` (0–1)       |`1`                 |Background opacity                                         |
|`state_color`     |`boolean`            |`true`              |Use HA theme colours for the icon                          |

## Dynamic vs Static Icons

### Static Mode (`use_dynamic_icon: false`)

- A single fixed icon is always shown regardless of entity state
- Best for simple entities like temperature sensors

### Dynamic Mode (`use_dynamic_icon: true`)

- The icon automatically changes to reflect the entity’s current state
- Uses Home Assistant’s full icon resolution pipeline
- **Essential for entities whose icon changes with state**:
  - Blood glucose trend sensors (up arrow, down arrow, etc.)
  - Covers (open, closed, opening, closing)
  - Locks (locked, unlocked)
  - Sensors with state-dependent icons defined in Home Assistant

## Supported Domains

The card automatically selects appropriate icons for:

- `light`, `switch`, `sensor` (temperature, humidity, battery, power, energy, illuminance, pressure)
- `binary_sensor` (door, window, motion, moisture, smoke, gas)
- `lock`, `climate`, `cover`, `media_player`, `fan`, `person`, `weather`

See the [full documentation](https://github.com/jamesmcginnis/elephant-entities-card) for complete icon mappings.
