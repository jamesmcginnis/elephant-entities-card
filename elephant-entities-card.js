/* 🐘 Elephant Entity Card - Icon Mapping & Auto-Population */

class ElephantEntityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() {
    return document.createElement("elephant-entity-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:elephant-entity-card",
      entity: "",
      name: "",
      unit: "",
      icon: "",
      use_dynamic_icon: false,
      background_color: "",
      text_color: "",
      icon_color: "",
      transparency: 1,
      state_color: true,
      decimals: 2
    };
  }

  setConfig(config) {
    this._config = {
      tap_action: { action: "more-info" },
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _formatString(str, isEntityId = false) {
    if (!str) return "";
    let workingString = str;
    if (isEntityId && workingString.includes(".")) {
      workingString = workingString.split(".").pop();
    }
    return workingString
      .replace(/_/g, " ")
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  _processColor(color) {
    if (!color) return null;
    if (Array.isArray(color)) return `rgb(${color.join(",")})`;
    return color;
  }

  _getRGBValues(color) {
    if (Array.isArray(color)) return { r: color[0], g: color[1], b: color[2] };
    if (typeof color === "string" && color.startsWith("#")) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          }
        : { r: 255, g: 255, b: 255 };
    }
    return null;
  }

  _render() {
    if (!this._hass || !this._config?.entity) {
      this.shadowRoot.innerHTML = `<div style="padding:12px;background:var(--ha-card-background, #fff);color:var(--primary-text-color);border-radius:var(--ha-card-border-radius, 12px);height:56px;display:flex;align-items:center;font-family:sans-serif;">Select an entity</div>`;
      return;
    }

    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) return;

    const isOffline =
      stateObj.state === "unavailable" || stateObj.state === "unknown";
    const isActive = ["on", "open", "playing", "home", "locked"].includes(
      stateObj.state
    );

    // ── Display name ──────────────────────────────────────────────────────────
    let displayName;
    if (this._config.name) {
      displayName = this._formatString(this._config.name);
    } else if (stateObj.attributes.friendly_name) {
      displayName = this._formatString(stateObj.attributes.friendly_name);
    } else {
      displayName = this._formatString(this._config.entity, true);
    }

    // ── Display state ─────────────────────────────────────────────────────────
    let displayState = stateObj.state;
    const domain = this._config.entity.split(".")[0];
    let unit =
      this._config.unit || stateObj.attributes.unit_of_measurement || "";

    if (isOffline) {
      displayState = "Offline";
      unit = "";
    } else if (domain === "lock") {
      displayState = displayState === "locked" ? "Locked" : "Unlocked";
    } else if (domain === "binary_sensor") {
      const deviceClass = stateObj.attributes.device_class;
      if (["door", "window", "opening", "garage_door"].includes(deviceClass)) {
        displayState = displayState === "on" ? "Open" : "Closed";
      } else {
        displayState = displayState === "on" ? "Detected" : "Clear";
      }
    } else if (
      this._config.decimals !== undefined &&
      !isNaN(parseFloat(displayState)) &&
      isFinite(displayState)
    ) {
      displayState = parseFloat(displayState).toFixed(this._config.decimals);
    } else {
      displayState = this._formatString(displayState);
    }

    // ── DOM rebuild guard ─────────────────────────────────────────────────────
    // Swap between ha-state-icon (dynamic) and ha-icon (static) only when the
    // mode actually changes, avoiding unnecessary full DOM replacement.
    const useDynamic = !!this._config.use_dynamic_icon;
    const existingCard = this.shadowRoot.querySelector("ha-card");
    const currentIconTag = existingCard
      ? existingCard.querySelector("ha-state-icon")
        ? "ha-state-icon"
        : "ha-icon"
      : null;
    const wantedIconTag = useDynamic ? "ha-state-icon" : "ha-icon";
    const needsRebuild = !existingCard || currentIconTag !== wantedIconTag;

    if (needsRebuild) {
      this.shadowRoot.innerHTML = `
        <style>
          ha-card {
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            height: 56px;
            cursor: pointer;
            transition: all 0.2s ease;
            overflow: hidden;
            position: relative;
            box-sizing: border-box;
            border-radius: 999px;
            background: var(--ha-card-background, var(--card-background-color, white));
            color: var(--primary-text-color);
          }
          ha-card:active { transform: scale(0.98); }
          ha-icon,
          ha-state-icon {
            --mdc-icon-size: 20px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(var(--icon-rgb, 127, 127, 127), 0.1);
            border-radius: 50%;
            flex-shrink: 0;
          }
          .text {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            justify-content: center;
            line-height: 1.2;
          }
          .primary {
            font-size: 14px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: inherit;
          }
          .secondary {
            font-size: 12px;
            opacity: 0.7;
            color: inherit;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        </style>
        <ha-card>
          <${wantedIconTag}></${wantedIconTag}>
          <div class="text">
            <div class="primary"></div>
            <div class="secondary"></div>
          </div>
        </ha-card>
      `;
      this.shadowRoot
        .querySelector("ha-card")
        .addEventListener("click", () => this._handleAction());
    }

    const card = this.shadowRoot.querySelector("ha-card");
    const iconEl = this.shadowRoot.querySelector(wantedIconTag);

    // ── Icon resolution ───────────────────────────────────────────────────────
    // Dynamic mode → ha-state-icon receives hass + stateObj and resolves icons
    // through HA's full pipeline (entity registry, state-based templates, domain
    // defaults). Required for entities whose icon changes with state, such as
    // blood glucose trend arrows, covers, locks, etc.
    //
    // Static mode  → ha-icon uses the manually configured icon or the entity's
    // attribute icon, falling back to a generic placeholder.
    //
    // IMPORTANT: do NOT set iconEl.icon when in dynamic mode. ha-state-icon
    // manages its own icon property internally; setting it (even to null) can
    // interfere with its rendering pipeline.
    if (useDynamic) {
      iconEl.hass = this._hass;
      iconEl.stateObj = stateObj;
    } else {
      iconEl.icon =
        this._config.icon || stateObj.attributes.icon || "mdi:help-circle";
    }

    // ── Background colour & --icon-rgb ────────────────────────────────────────
    if (this._config.background_color) {
      const rgb = this._getRGBValues(this._config.background_color);
      if (rgb) {
        card.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${
          this._config.transparency ?? 1
        })`;
        card.style.setProperty("--icon-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
    } else {
      card.style.background = "";
      // Remove the CSS variable so the icon background tint does not linger
      // after the user clears a previously set background colour.
      card.style.removeProperty("--icon-rgb");
      if (this._config.transparency < 1) {
        card.style.background = `rgba(var(--rgb-card-background-color, 255, 255, 255), ${this._config.transparency})`;
      }
    }

    // ── Text colour ───────────────────────────────────────────────────────────
    // Always write the property (including empty string reset) so clearing
    // text_color in the editor actually takes effect.
    card.style.color = this._config.text_color
      ? this._processColor(this._config.text_color)
      : "";

    // ── Icon colour ───────────────────────────────────────────────────────────
    if (isOffline) {
      iconEl.style.color = "var(--disabled-text-color)";
    } else if (this._config.state_color === true) {
      iconEl.style.color = isActive
        ? "var(--state-active-color)"
        : "var(--disabled-text-color)";
    } else {
      iconEl.style.color =
        this._processColor(this._config.icon_color) || "inherit";
    }

    this.shadowRoot.querySelector(".primary").textContent = displayName;
    this.shadowRoot.querySelector(".secondary").textContent =
      `${displayState} ${unit}`.trim();
  }

  _handleAction() {
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId: this._config.entity },
        bubbles: true,
        composed: true
      })
    );
  }
}

customElements.define("elephant-entity-card", ElephantEntityCard);

/* ===================== EDITOR ===================== */
// The editor is built with raw HTML + individual ha-selector elements rather
// than ha-form. ha-form only supports field labels — it has no mechanism to
// display description text to users. Building the editor manually gives us
// full control over layout and lets us add a clear description beneath every
// single field so users know exactly what each option does.

class ElephantEntityCardEditor extends HTMLElement {
  constructor() {
    super();
    this._initialized = false;
  }

  setConfig(config) {
    const prev = this._config;
    this._config = config;

    if (!this._hass) return;

    // Only do a full re-render when a structural field changes (one that
    // controls which selectors are shown/hidden). For every other field
    // (text, numbers, colours) HA calls setConfig after each value-changed
    // event, which would destroy and rebuild the DOM mid-typing — killing
    // focus after a single character. Instead, just sync values in-place.
    const structuralChange =
      !prev ||
      prev.entity            !== config.entity ||
      prev.use_dynamic_icon  !== config.use_dynamic_icon ||
      prev.state_color       !== config.state_color;

    if (structuralChange) {
      this._renderEditor();
    } else {
      this._syncSelectorValues();
    }
  }

  set hass(hass) {
    const firstRender = !this._hass;
    this._hass = hass;
    if (firstRender && this._config) {
      // First time both hass and config are available — do a full render.
      this._renderEditor();
    } else {
      // Subsequent hass updates — only the entity selector needs the new hass
      // reference. A full re-render would reset scroll position and flicker.
      const entitySel = this.querySelector("#sel-entity");
      if (entitySel) entitySel.hass = hass;
    }
  }

  // ── Default icon map ───────────────────────────────────────────────────────
  _getDefaultIcon(stateObj) {
    if (stateObj.attributes.icon) return stateObj.attributes.icon;
    const domain = stateObj.entity_id.split(".")[0];
    const dClass = stateObj.attributes.device_class;
    switch (domain) {
      case "light":        return "mdi:lightbulb";
      case "switch":       return dClass === "outlet" ? "mdi:power-plug" : "mdi:toggle-switch";
      case "person":       return "mdi:account";
      case "sun":          return "mdi:white-balance-sunny";
      case "weather":      return "mdi:weather-cloudy";
      case "climate":      return "mdi:thermostat";
      case "lock":         return stateObj.state === "locked" ? "mdi:lock" : "mdi:lock-open";
      case "media_player": return "mdi:cast";
      case "fan":          return "mdi:fan";
      case "cover":        return "mdi:window-shutter";
      case "binary_sensor":
        if (["door", "garage_door", "opening"].includes(dClass))
          return stateObj.state === "on" ? "mdi:door-open" : "mdi:door-closed";
        if (dClass === "window")
          return stateObj.state === "on" ? "mdi:window-open" : "mdi:window-closed";
        if (["motion", "presence", "occupancy"].includes(dClass)) return "mdi:motion-sensor";
        if (dClass === "moisture")       return "mdi:water-alert";
        if (dClass === "smoke")          return "mdi:smoke-detector";
        if (dClass === "gas")            return "mdi:gas-cylinder";
        if (dClass === "carbon_monoxide") return "mdi:molecule-co";
        if (dClass === "plug")           return "mdi:power-plug";
        return "mdi:radiobox-marked";
      case "sensor":
        if (dClass === "temperature")  return "mdi:thermometer";
        if (dClass === "humidity")     return "mdi:water-percent";
        if (dClass === "battery")      return "mdi:battery";
        if (dClass === "power")        return "mdi:flash";
        if (dClass === "energy")       return "mdi:lightning-bolt";
        if (dClass === "illuminance")  return "mdi:brightness-5";
        if (dClass === "moisture")     return "mdi:water";
        if (dClass === "pressure")     return "mdi:gauge";
        return "mdi:eye";
      default: return "mdi:bookmark";
    }
  }

  // ── Full editor render ─────────────────────────────────────────────────────
  // Builds the complete editor HTML and wires up every ha-selector element.
  // Re-runs whenever a toggle changes a conditional field (use_dynamic_icon,
  // state_color) so the right fields appear/disappear instantly.
  _renderEditor() {
    if (!this._hass || !this._config) return;

    const cfg = this._config;
    const useDynamic   = !!cfg.use_dynamic_icon;
    const useStateColor = cfg.state_color !== false; // defaults true

    this.innerHTML = `
      <style>
        .eec-editor {
          font-family: var(--mdc-typography-body2-font-family, var(--paper-font-body2_-_font-family, inherit));
          color: var(--primary-text-color);
        }
        .eec-section {
          margin-bottom: 12px;
          border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
          border-radius: 8px;
          overflow: hidden;
        }
        .eec-section-header {
          padding: 10px 14px;
          background: var(--secondary-background-color, rgba(0,0,0,0.04));
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--secondary-text-color);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .eec-field {
          padding: 12px 14px 14px;
          border-top: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        }
        .eec-field:first-of-type {
          border-top: none;
        }
        .eec-field-label {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--primary-text-color);
        }
        .eec-field-desc {
          font-size: 12px;
          line-height: 1.5;
          color: var(--secondary-text-color);
          margin-bottom: 10px;
        }
        .eec-field-desc strong {
          color: var(--primary-text-color);
          font-weight: 600;
        }
        .eec-colours-row {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
          gap: 12px;
          align-items: start;
        }
        .eec-colour-item label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--secondary-text-color);
          margin-bottom: 6px;
        }
        ha-selector {
          display: block;
        }
      </style>

      <div class="eec-editor">

        <!-- ══ ENTITY ══════════════════════════════════════════════════════ -->
        <div class="eec-section">
          <div class="eec-section-header">🔌 Entity</div>
          <div class="eec-field">
            <div class="eec-field-label">Entity</div>
            <div class="eec-field-desc">
              The Home Assistant entity this card will display.
              Choosing a new entity will automatically fill in the name and icon fields below.
            </div>
            <ha-selector id="sel-entity"></ha-selector>
          </div>
        </div>

        <!-- ══ DISPLAY ═════════════════════════════════════════════════════ -->
        <div class="eec-section">
          <div class="eec-section-header">🏷️ Display</div>

          <div class="eec-field">
            <div class="eec-field-label">Name Override</div>
            <div class="eec-field-desc">
              The label shown in the top line of the card.
              Leave blank to automatically use the entity's friendly name from Home Assistant.
            </div>
            <ha-selector id="sel-name"></ha-selector>
          </div>

          <div class="eec-field">
            <div class="eec-field-label">Unit Override</div>
            <div class="eec-field-desc">
              Replaces the unit shown after the state value — for example <strong>°C</strong>, <strong>%</strong>, or <strong>kWh</strong>.
              Leave blank to use the unit already set on the entity in Home Assistant.
            </div>
            <ha-selector id="sel-unit"></ha-selector>
          </div>

          <div class="eec-field">
            <div class="eec-field-label">Decimal Places</div>
            <div class="eec-field-desc">
              How many decimal places to show for numeric sensor values.
              Set to <strong>0</strong> to display whole numbers only.
              Has no effect on non-numeric states.
            </div>
            <ha-selector id="sel-decimals"></ha-selector>
          </div>
        </div>

        <!-- ══ ICON ════════════════════════════════════════════════════════ -->
        <div class="eec-section">
          <div class="eec-section-header">🎯 Icon</div>

          <div class="eec-field">
            <div class="eec-field-label">Dynamic State Icon</div>
            <div class="eec-field-desc">
              <strong>ON —</strong> The icon automatically changes to reflect the entity's current state.
              This is essential for entities like blood glucose trend sensors, covers, and locks
              whose icon is different depending on state (e.g. an up arrow vs. a down arrow for a trend sensor).<br><br>
              <strong>OFF —</strong> A single fixed icon is always shown regardless of state.
              Use this for simple entities like temperature sensors where the icon never needs to change.
            </div>
            <ha-selector id="sel-use_dynamic_icon"></ha-selector>
          </div>

          ${!useDynamic ? `
          <div class="eec-field">
            <div class="eec-field-label">Custom Icon</div>
            <div class="eec-field-desc">
              Choose a fixed icon from the MDI (Material Design Icons) library.
              If left blank, the entity's default icon from Home Assistant is used.
              Not available when Dynamic State Icon is enabled above.
            </div>
            <ha-selector id="sel-icon"></ha-selector>
          </div>
          ` : ""}
        </div>

        <!-- ══ APPEARANCE ══════════════════════════════════════════════════ -->
        <div class="eec-section">
          <div class="eec-section-header">🎨 Appearance</div>

          <div class="eec-field">
            <div class="eec-field-label">Use State Colours</div>
            <div class="eec-field-desc">
              <strong>ON —</strong> The icon colour is managed automatically:
              <strong>green</strong> when the entity is active (on, open, playing, home, or locked),
              and <strong>grey</strong> when inactive or unavailable.<br><br>
              <strong>OFF —</strong> You can set a fixed icon colour of your own choosing.
              The icon colour picker will appear in the Colours section below when this is turned off.
            </div>
            <ha-selector id="sel-state_color"></ha-selector>
          </div>

          <div class="eec-field">
            <div class="eec-field-label">Colours</div>
            <div class="eec-field-desc">
              Customise the card's colours.
              Leave any colour unset to inherit the default value from your Home Assistant theme.
              ${!useStateColor
                ? "The <strong>Icon</strong> colour picker is available because Use State Colours is turned off."
                : "The Icon colour picker is hidden because Use State Colours is managing it automatically."}
            </div>
            <div class="eec-colours-row">
              <div class="eec-colour-item">
                <label>Background</label>
                <ha-selector id="sel-background_color"></ha-selector>
              </div>
              <div class="eec-colour-item">
                <label>Text</label>
                <ha-selector id="sel-text_color"></ha-selector>
              </div>
              ${!useStateColor ? `
              <div class="eec-colour-item">
                <label>Icon</label>
                <ha-selector id="sel-icon_color"></ha-selector>
              </div>
              ` : ""}
            </div>
          </div>

          <div class="eec-field">
            <div class="eec-field-label">Card Transparency</div>
            <div class="eec-field-desc">
              Controls the opacity of the card's background.
              <strong>1.0</strong> = fully solid (default).
              <strong>0.0</strong> = fully transparent.
              Values in between create a frosted or blended effect — useful when layering cards over
              a background image or colour.
            </div>
            <ha-selector id="sel-transparency"></ha-selector>
          </div>
        </div>

      </div>
    `;

    this._attachSelectors();
  }

  // ── Wire up ha-selector elements ───────────────────────────────────────────
  // Sets the .selector and .value properties on each element (these must be JS
  // properties, not HTML attributes) and adds value-changed listeners.
  _attachSelectors() {
    const cfg = this._config;

    const fields = {
      entity:           { selector: { entity: {} },                                          value: cfg.entity          || null },
      name:             { selector: { text: {} },                                             value: cfg.name            || "" },
      unit:             { selector: { text: {} },                                             value: cfg.unit            || "" },
      decimals:         { selector: { number: { min: 0, max: 5, mode: "box" } },             value: cfg.decimals        ?? 2 },
      use_dynamic_icon: { selector: { boolean: {} },                                          value: !!cfg.use_dynamic_icon },
      icon:             { selector: { icon: {} },                                             value: cfg.icon            || null },
      state_color:      { selector: { boolean: {} },                                          value: cfg.state_color     !== false },
      background_color: { selector: { color_rgb: {} },                                        value: cfg.background_color || null },
      text_color:       { selector: { color_rgb: {} },                                        value: cfg.text_color      || null },
      icon_color:       { selector: { color_rgb: {} },                                        value: cfg.icon_color      || null },
      transparency:     { selector: { number: { min: 0, max: 1, step: 0.1, mode: "slider" } }, value: cfg.transparency ?? 1 },
    };

    this._selectorFields = fields; // store for _syncSelectorValues

    for (const [key, { selector, value }] of Object.entries(fields)) {
      const el = this.querySelector(`#sel-${key}`);
      if (!el) continue; // element may be conditionally hidden

      el.selector = selector;
      el.value    = value;
      if (key === "entity") el.hass = this._hass;

      el.addEventListener("value-changed", (ev) => {
        ev.stopPropagation(); // prevent bubbling to parent cards
        this._handleChange(key, ev.detail.value);
      });
    }
  }

  // ── Sync selector values without rebuilding the DOM ────────────────────────
  // Called by setConfig when only non-structural fields change. Updates each
  // selector's .value in-place so the active input element keeps focus.
  _syncSelectorValues() {
    const cfg = this._config;
    const valueMap = {
      entity:           cfg.entity           || null,
      name:             cfg.name             || "",
      unit:             cfg.unit             || "",
      decimals:         cfg.decimals         ?? 2,
      use_dynamic_icon: !!cfg.use_dynamic_icon,
      icon:             cfg.icon             || null,
      state_color:      cfg.state_color      !== false,
      background_color: cfg.background_color || null,
      text_color:       cfg.text_color       || null,
      icon_color:       cfg.icon_color       || null,
      transparency:     cfg.transparency     ?? 1,
    };

    for (const [key, value] of Object.entries(valueMap)) {
      const el = this.querySelector(`#sel-${key}`);
      // Skip elements that are hidden (conditional fields) or the one that
      // is currently focused — updating its value would reset the cursor.
      if (!el || el.contains(document.activeElement)) continue;
      el.value = value;
    }
  }

  // ── Handle a field change ──────────────────────────────────────────────────
  _handleChange(key, value) {
    let config = { ...this._config, [key]: value, type: "custom:elephant-entity-card" };

    // Auto-populate name & icon when the entity is first picked or changed
    if (key === "entity" && value && value !== this._config.entity) {
      const stateObj = this._hass.states[value];
      if (stateObj) {
        config.icon = this._getDefaultIcon(stateObj);
        if (stateObj.attributes.friendly_name) {
          config.name = stateObj.attributes.friendly_name;
        }
      }
    }

    this._config = config;

    // Re-render the editor when a toggle affects which fields are visible.
    // For all other changes (text, numbers, colours) only the card preview
    // needs updating — skip the re-render to avoid flickering.
    if (key === "use_dynamic_icon" || key === "state_color" || key === "entity") {
      this._renderEditor();
    }

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true
      })
    );
  }
}

customElements.define("elephant-entity-card-editor", ElephantEntityCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "elephant-entity-card",
  name: "Elephant Entity Card",
  description: "Compact entity tile with dynamic icons and full colour control",
  preview: true
});
