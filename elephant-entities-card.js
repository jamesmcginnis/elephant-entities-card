/* 🐘 Elephant Entity Card - Auto-Populate Fix & Standard Native Defaults */

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
      background_color: "",
      text_color: "",
      icon_color: "",
      blur_amount: 0,
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
      this.shadowRoot.innerHTML = `
        <style>
          .placeholder {
            padding: 16px;
            background: var(--ha-card-background, #fff);
            color: var(--primary-text-color);
            border-radius: var(--ha-card-border-radius, 12px);
            border: 1px solid var(--divider-color, #e0e0e0);
          }
        </style>
        <div class="placeholder">Select an entity</div>`;
      return;
    }

    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) return;

    const isActive = ["on", "open", "playing", "home"].includes(stateObj.state);
    const displayName = this._config.name || stateObj.attributes.friendly_name || this._config.entity;
    const unit = this._config.unit || stateObj.attributes.unit_of_measurement || "";
    // Priority: Config Icon -> Entity Attribute Icon -> Fallback
    const icon = this._config.icon || stateObj.attributes.icon || "mdi:help-circle";

    let displayState = stateObj.state;
    if (this._config.decimals !== undefined && !isNaN(parseFloat(displayState)) && isFinite(displayState)) {
      displayState = parseFloat(displayState).toFixed(this._config.decimals);
    }

    if (!this.shadowRoot.querySelector("ha-card")) {
      this.shadowRoot.innerHTML = `
        <style>
          ha-card {
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 66px; /* Standard HA Tile Height */
            cursor: pointer;
            transition: all 0.2s ease;
            overflow: hidden;
            position: relative;
            box-sizing: border-box;
            border-radius: var(--ha-card-border-radius, 12px);
            /* Default to Native HA Variables */
            background: var(--ha-card-background, var(--card-background-color, white));
            color: var(--primary-text-color);
            box-shadow: var(--ha-card-box-shadow, 0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12));
          }
          ha-card:active { transform: scale(0.98); }
          ha-icon { 
            --mdc-icon-size: 24px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(var(--icon-rgb, 127, 127, 127), 0.1); /* Default greyish bg */
            border-radius: 50%;
            flex-shrink: 0;
            transition: color 0.2s ease;
          }
          .text { 
            display: flex; 
            flex-direction: column; 
            overflow: hidden; 
            justify-content: center;
          }
          .primary {
            font-size: 14px;
            font-weight: 500;
            line-height: 20px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: inherit;
          }
          .secondary {
            font-size: 12px;
            line-height: 16px;
            opacity: 0.7;
            color: inherit;
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

    // 1. Background Processing
    if (this._config.background_color) {
      const rgb = this._getRGBValues(this._config.background_color);
      if (rgb) {
        card.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this._config.transparency ?? 1})`;
        card.style.setProperty('--icon-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
    } else {
      // RESET to Native Defaults
      card.style.background = ""; 
      card.style.backgroundColor = ""; 
      card.style.removeProperty('--icon-rgb');
      
      // If transparency is modified but no color is chosen, apply transparency to the default theme background
      if (this._config.transparency < 1) {
         card.style.background = `rgba(var(--rgb-card-background-color, 255, 255, 255), ${this._config.transparency})`;
      }
    }

    // 2. Blur Processing (Hidden feature)
    if (this._config.blur_amount) {
        card.style.backdropFilter = `blur(${this._config.blur_amount}px)`;
        card.style.webkitBackdropFilter = `blur(${this._config.blur_amount}px)`;
    }

    // 3. Text Color
    if (this._config.text_color) {
        card.style.color = this._processColor(this._config.text_color);
    } else {
        card.style.color = ""; // Reset to CSS var
    }

    // 4. Icon Logic
    iconEl.icon = icon;
    if (this._config.state_color) {
      iconEl.style.color = isActive ? "var(--state-active-color)" : "var(--disabled-text-color)";
    } else {
      iconEl.style.color = this._processColor(this._config.icon_color) || "";
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
          name: "",
          column_min_width: "100px",
          schema: [
            { name: "background_color", label: "Choose Background Colour", selector: { color_rgb: {} } },
            { name: "text_color", label: "Choose Text Colour", selector: { color_rgb: {} } },
            { name: "icon_color", label: "Choose Icon Colour", selector: { color_rgb: {} } },
          ]
        },
        { name: "transparency", label: "Choose Transparency", selector: { number: { min: 0, max: 1, step: 0.1, mode: "slider" } } },
        { name: "state_color", label: "Turn off Custom Icon Colour", selector: { boolean: {} } }
      ];
      
      this._form.addEventListener("value-changed", (ev) => {
        const newValue = ev.detail.value;
        const oldEntity = this._config.entity;
        
        // Merge updates
        let config = { ...this._config, ...newValue };
        config.type = "custom:elephant-entity-card";
        
        // AUTO-POPULATE LOGIC:
        // If entity changed, grab the icon immediately and PUT IT INTO THE CONFIG
        if (newValue.entity && newValue.entity !== oldEntity) {
          const stateObj = this._hass.states[newValue.entity];
          if (stateObj) {
            const defIcon = stateObj.attributes.icon || "";
            // We set the icon in the config object
            config.icon = defIcon;
          }
        }

        // We must update the form's data so the UI reflects the change immediately
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
  description: "Standard HA Card with Auto-Icon Population",
  preview: true
});
