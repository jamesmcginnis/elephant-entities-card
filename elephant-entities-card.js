/* 🐘 Elephant Entity Card - Blur Slider Removed From Editor */

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
      background_color: [255, 255, 255],
      text_color: [0, 0, 0],
      icon_color: [127, 127, 127],
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
    if (isEntityId && workingString.includes('.')) {
      workingString = workingString.split('.').pop();
    }
    return workingString
      .replace(/_/g, ' ')
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  _processColor(color) {
    if (!color) return null;
    if (Array.isArray(color)) return `rgb(${color.join(',')})`;
    return color;
  }

  _getRGBValues(color) {
    if (Array.isArray(color)) return { r: color[0], g: color[1], b: color[2] };
    if (typeof color === 'string' && color.startsWith('#')) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
      return result ? { 
        r: parseInt(result[1], 16), 
        g: parseInt(result[2], 16), 
        b: parseInt(result[3], 16) 
      } : { r: 255, g: 255, b: 255 };
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

    const isOffline = stateObj.state === "unavailable" || stateObj.state === "unknown";
    const isActive = ["on", "open", "playing", "home", "locked"].includes(stateObj.state);
    
    let displayName;
    if (this._config.name) {
      displayName = this._formatString(this._config.name);
    } else if (stateObj.attributes.friendly_name) {
      displayName = this._formatString(stateObj.attributes.friendly_name);
    } else {
      displayName = this._formatString(this._config.entity, true);
    }

    let displayState = stateObj.state;
    const domain = this._config.entity.split('.')[0];
    let unit = this._config.unit || stateObj.attributes.unit_of_measurement || "";

    if (isOffline) {
      displayState = "Offline";
      unit = ""; 
    } else if (domain === "lock") {
      displayState = (displayState === "locked") ? "Locked" : "Unlocked";
    } else if (domain === "binary_sensor") {
      const deviceClass = stateObj.attributes.device_class;
      if (["door", "window", "opening", "garage_door"].includes(deviceClass)) {
        displayState = (displayState === "on") ? "Open" : "Closed";
      } else {
        displayState = (displayState === "on") ? "Detected" : "Clear";
      }
    } else if (this._config.decimals !== undefined && !isNaN(parseFloat(displayState)) && isFinite(displayState)) {
      displayState = parseFloat(displayState).toFixed(this._config.decimals);
    } else {
      displayState = this._formatString(displayState);
    }

    const icon = this._config.icon || stateObj.attributes.icon || "mdi:help-circle";

    if (!this.shadowRoot.querySelector("ha-card")) {
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
            border-radius: var(--ha-card-border-radius, 12px);
            background: var(--ha-card-background, var(--card-background-color, white));
            color: var(--primary-text-color);
          }
          ha-card:active { transform: scale(0.98); }
          ha-icon { 
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
          <ha-icon></ha-icon>
          <div class="text">
            <div class="primary"></div>
            <div class="secondary"></div>
          </div>
        </ha-card>
      `;
      this.shadowRoot.querySelector("ha-card").addEventListener("click", () => this._handleAction());
    }

    const card = this.shadowRoot.querySelector("ha-card");
    const iconEl = this.shadowRoot.querySelector("ha-icon");

    // Handle Transparency & Background
    const transparency = this._config.transparency ?? 1;
    if (this._config.background_color) {
      const rgb = this._getRGBValues(this._config.background_color);
      if (rgb) {
        card.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${transparency})`;
        card.style.setProperty('--icon-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
    } else {
      card.style.background = ""; 
      if (transparency < 1) {
         card.style.background = `rgba(var(--rgb-card-background-color, 255, 255, 255), ${transparency})`;
      }
    }

    if (this._config.text_color) {
        card.style.color = this._processColor(this._config.text_color);
    }

    iconEl.icon = icon;
    
    if (isOffline) {
      iconEl.style.color = "var(--disabled-text-color)";
    } else if (this._config.state_color === true) {
      iconEl.style.color = isActive ? "var(--state-active-color)" : "var(--disabled-text-color)";
    } else {
      const customIconCol = this._processColor(this._config.icon_color);
      iconEl.style.color = customIconCol || "inherit";
    }

    this.shadowRoot.querySelector(".primary").textContent = displayName;
    this.shadowRoot.querySelector(".secondary").textContent = `${displayState} ${unit}`.trim();
  }

  _handleAction() {
    const event = new CustomEvent("hass-more-info", {
      detail: { entityId: this._config.entity },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

customElements.define("elephant-entity-card", ElephantEntityCard);

/* ===================== EDITOR ===================== */

class ElephantEntityCardEditor extends HTMLElement {
  constructor() {
    super();
    this._initialized = false;
  }

  setConfig(config) {
    this._config = config;
    this._updateForm();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateForm();
  }

  _updateForm() {
    if (!this._hass || !this._config) return;

    if (!this._initialized) {
      this.innerHTML = `<div id="editor-container"></div>`;
      this._initialized = true;
    }

    const container = this.querySelector("#editor-container");
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.schema = [
        { name: "entity", label: "Select Entity", selector: { entity: {} } },
        { name: "name", label: "Friendly Name", selector: { text: {} } },
        { name: "unit", label: "Friendly Unit", selector: { text: {} } },
        { name: "decimals", label: "Decimal Places", selector: { number: { min: 0, max: 5, mode: "box" } } },
        { name: "icon", label: "Select Custom Icon", selector: { icon: {} } },
        {
          type: "grid",
          column_min_width: "100px",
          schema: [
            { name: "background_color", label: "Background", selector: { color_rgb: {} } },
            { name: "text_color", label: "Text", selector: { color_rgb: {} } },
            { name: "icon_color", label: "Icon", selector: { color_rgb: {} } },
          ]
        },
        { name: "transparency", label: "Transparency", selector: { number: { min: 0, max: 1, step: 0.1, mode: "slider" } } },
        { name: "state_color", label: "Use Default State Colours", selector: { boolean: {} } }
      ];
      
      this._form.addEventListener("value-changed", (ev) => {
        const newValue = ev.detail.value;
        const oldEntity = this._config.entity;
        let config = { ...this._config, ...newValue };
        config.type = "custom:elephant-entity-card";
        
        if (newValue.entity && newValue.entity !== oldEntity) {
          const stateObj = this._hass.states[newValue.entity];
          if (stateObj) {
            config.icon = stateObj.attributes.icon || "";
          }
        }

        if (this._form) {
            this._form.data = config;
        }

        this.dispatchEvent(new CustomEvent("config-changed", {
          detail: { config },
          bubbles: true,
          composed: true
        }));
      });
      container.appendChild(this._form);
    }

    this._form.hass = this._hass;
    this._form.data = this._config;
  }
}

customElements.define("elephant-entity-card-editor", ElephantEntityCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "elephant-entity-card",
  name: "Elephant Entity Card",
  description: "Standard card with offline logic and transparency",
  preview: true
});
