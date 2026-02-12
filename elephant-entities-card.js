/* 🐘 Elephant Entity Card - Color Fixed Version */

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
      text_color: [255, 255, 255],
      icon_color: [255, 255, 255],
      blur_amount: 0,
      transparency: 1,
      state_color: true
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

  // Helper to handle both Hex strings and RGB arrays
  _processColor(color) {
    if (!color) return null;
    if (Array.isArray(color)) return `rgb(${color.join(',')})`;
    return color;
  }

  _getRGBValues(color) {
    if (Array.isArray(color)) return { r: color[0], g: color[1], b: color[2] };
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color || "#ffffff");
    return result ? { 
      r: parseInt(result[1], 16), 
      g: parseInt(result[2], 16), 
      b: parseInt(result[3], 16) 
    } : { r: 255, g: 255, b: 255 };
  }

  _render() {
    if (!this._hass || !this._config?.entity) {
      this.shadowRoot.innerHTML = `<div style="padding:16px;background:#1c1c1e;color:#fff;border-radius:12px;">Select an entity</div>`;
      return;
    }

    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) return;

    const isActive = ["on", "open", "playing", "home"].includes(stateObj.state);
    const displayName = this._config.name || stateObj.attributes.friendly_name || this._config.entity;
    const unit = this._config.unit || stateObj.attributes.unit_of_measurement || "";
    const icon = this._config.icon || stateObj.attributes.icon || "mdi:help-circle";

    if (!this.shadowRoot.querySelector("ha-card")) {
      this.shadowRoot.innerHTML = `
        <style>
          ha-card {
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            cursor: pointer;
            transition: 0.2s ease;
            overflow: hidden;
            position: relative;
            border-radius: var(--ha-card-border-radius, 12px);
          }
          ha-card:active { transform: scale(0.98); }
          ha-icon { --mdc-icon-size: 32px; }
          .text { display: flex; flex-direction: column; overflow: hidden; }
          .primary {
            font-size: 1rem;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .secondary {
            font-size: 0.875rem;
            opacity: 0.7;
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

    // Background & Glass Effect
    if (this._config.background_color) {
      const rgb = this._getRGBValues(this._config.background_color);
      card.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this._config.transparency ?? 1})`;
      card.style.backdropFilter = this._config.blur_amount ? `blur(${this._config.blur_amount}px)` : "";
      card.style.webkitBackdropFilter = this._config.blur_amount ? `blur(${this._config.blur_amount}px)` : "";
    }

    // Text & Icon Colors
    card.style.color = this._processColor(this._config.text_color) || "";
    
    iconEl.icon = icon;
    if (this._config.state_color) {
      iconEl.style.color = isActive ? "var(--state-active-color)" : "var(--disabled-text-color)";
    } else {
      iconEl.style.color = this._processColor(this._config.icon_color) || "";
    }

    this.shadowRoot.querySelector(".primary").textContent = displayName;
    this.shadowRoot.querySelector(".secondary").textContent = `${stateObj.state} ${unit}`.trim();
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
      this.innerHTML = `
        <style>
          .field-wrapper { margin-bottom: 16px; }
        </style>
        <div id="editor-container"></div>
      `;
      this._initialized = true;
    }

    const container = this.querySelector("#editor-container");
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.schema = [
        { name: "entity", selector: { entity: {} } },
        { name: "name", label: "Override Name", selector: { text: {} } },
        { name: "unit", label: "Override Unit", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        {
          type: "grid",
          name: "",
          column_min_width: "100px",
          schema: [
            { name: "background_color", label: "Background", selector: { color_rgb: {} } },
            { name: "text_color", label: "Text Color", selector: { color_rgb: {} } },
            { name: "icon_color", label: "Icon Color", selector: { color_rgb: {} } },
          ]
        },
        { name: "blur_amount", label: "Blur Amount", selector: { number: { min: 0, max: 30, mode: "slider" } } },
        { name: "transparency", label: "Transparency", selector: { number: { min: 0, max: 1, step: 0.1, mode: "slider" } } },
        { name: "state_color", label: "Use State Colors for Icon", selector: { boolean: {} } }
      ];
      
      this._form.addEventListener("value-changed", (ev) => {
        const config = { ...this._config, ...ev.detail.value };
        config.type = "custom:elephant-entity-card";
        
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
  description: "Glass-style card with name/unit overrides",
  preview: true
});
