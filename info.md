## 🐘 Elephant Entity Card

A compact, tile-style entity card for Home Assistant with smart icon mapping and automatic entity population.

![Preview 1](preview1.png)
![Preview 2](preview2.png)

---

### ✨ Highlights

- **Auto-populates** name and icon when you pick an entity
- **Smart icon mapping** based on domain and device class
- **State-aware icons** that reflect active/inactive using your HA theme
- **Full colour control** — background, text, and icon colours with a built-in picker
- **Transparency slider** for frosted or layered dashboard aesthetics
- **Human-readable states** — Locked/Unlocked, Open/Closed, Detected/Clear
- **Offline indicator** for unavailable or unknown entities
- **Decimal precision** control for numeric sensor values

---

### 📦 Installation via HACS

1. Open **HACS → Frontend**
2. Search for **Elephant Entity Card**
3. Click **Download** and reload your browser

### 🔧 Manual Installation

Copy `elephant-entity-card.js` to `config/www/` and add it as a **JavaScript module** resource in your dashboard settings.

---

### 🗂 Basic YAML

```yaml
type: custom:elephant-entity-card
entity: sensor.living_room_temperature
name: Living Room
decimals: 1
state_color: true
```

For the full list of configuration options, see the [README](README.md).
