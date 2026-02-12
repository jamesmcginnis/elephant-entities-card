/* 🐘 Elephant Entity Card */

class ElephantEntityCard extends HTMLElement {

  setConfig(config) {
    if (!config.entity) throw new Error("Entity is required");

    this.config = {
      name: "",
      unit: "",
      icon: "",
      background_color: "",
      text_color: "",
      icon_color: "",
      blur_amount: 0,
      transparency: 1,
      state_color: true,
      tap_action: { action: "more-info" },
      hold_action: { action: "none" },
      double_tap_action: { action: "none" },
      ...config,
    };

    if (this.shadowRoot) this._update();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) this._render();
    this._update();
  }

  _render() {
    this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        ha-card {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        ha-card:active {
          transform: scale(0.98);
        }

        ha-icon {
          --mdc-icon-size: 32px;
        }

        .text {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .primary {
          font-size: 1rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .secondary {
          font-size: 0.875rem;
          color: var(--secondary-text-color);
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

    const card = this.shadowRoot.querySelector("ha-card");

    card.addEventListener("click", (ev) => this._handleAction(ev, "tap"));
    card.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      this._handleAction(ev, "hold");
    });
    card.addEventListener("dblclick", (ev) => this._handleAction(ev, "double_tap"));
  }

  _handleAction(ev, action) {
    const actionConfig = this.config[`${action}_action`] || { action: "more-info" };

    if (actionConfig.action === "none") return;

    if (actionConfig.action === "more-info") {
      this.dispatchEvent(
        new CustomEvent("hass-more-info", {
          detail: { entityId: this.config.entity },
          bubbles: true,
          composed: true,
        })
      );
    }

    if (actionConfig.action === "toggle") {
      this._hass.callService("homeassistant", "toggle", {
        entity_id: this.config.entity,
      });
    }

    if (actionConfig.action === "navigate" && actionConfig.navigation_path) {
      window.history.pushState(null, "", actionConfig.navigation_path);
      window.dispatchEvent(new Event("location-changed"));
    }

    if (actionConfig.action === "call-service" && actionConfig.service) {
      const [domain, service] = actionConfig.service.split(".");
      this._hass.callService(domain, service, actionConfig.service_data || {});
    }
  }

  _update() {
    if (!this._hass) return;

    const stateObj = this._hass.states[this.config.entity];
    if (!stateObj) return;

    const card = this.shadowRoot.querySelector("ha-card");
    const icon = this.shadowRoot.querySelector("ha-icon");

    const domain = stateObj.entity_id.split(".")[0];
    const isActive = ["on", "open", "playing", "home"].includes(stateObj.state);

    if (
      (!this.config.tap_action || this.config.tap_action.action === "more-info") &&
      ["light", "switch", "fan", "input_boolean"].includes(domain)
    ) {
      this.config.tap_action = { action: "toggle" };
    }

    icon.setAttribute(
      "icon",
      this.config.icon || stateObj.attributes.icon || "mdi:help-circle"
    );

    // state_color takes priority. Only apply icon_color when state_color is
    // explicitly false AND a real colour has been set.
    if (this.config.state_color !== false) {
      icon.style.color = isActive
        ? "var(--state-active-color)"
        : "var(--disabled-text-color)";
    } else if (this.config.icon_color && this.config.icon_color.trim() !== "") {
      icon.style.color = this.config.icon_color;
    } else {
      icon.style.color = "";
    }

    if (this.config.background_color) {
      const rgb = this._hexToRgb(this.config.background_color);
      card.style.background =
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.config.transparency})`;

      if (this.config.blur_amount > 0) {
        card.style.backdropFilter = `blur(${this.config.blur_amount}px)`;
        card.style.webkitBackdropFilter = `blur(${this.config.blur_amount}px)`;
      } else {
        card.style.backdropFilter = "";
        card.style.webkitBackdropFilter = "";
      }
    } else {
      card.style.background = "";
    }

    card.style.color = this.config.text_color || "";

    // FIX: Use trim() to treat whitespace-only strings as empty, ensuring
    // the override is only applied when a non-empty name/unit is configured.
    const nameOverride = (this.config.name || "").trim();
    this.shadowRoot.querySelector(".primary").textContent =
      nameOverride
        ? nameOverride
        : (stateObj.attributes.friendly_name || this.config.entity);

    const unitOverride = (this.config.unit || "").trim();
    const unit = unitOverride
      ? unitOverride
      : (stateObj.attributes.unit_of_measurement || "");

    this.shadowRoot.querySelector(".secondary").textContent =
      `${stateObj.state}${unit ? ' ' + unit : ''}`.trim();
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1],16), g: parseInt(result[2],16), b: parseInt(result[3],16) }
      : { r:255,g:255,b:255 };
  }

  getCardSize() {
    return 1;
  }

  static getStubConfig() {
    return { entity: "sun.sun", state_color: true, icon: "mdi:elephant" };
  }

  static getConfigElement() {
    return document.createElement("elephant-entity-card-editor");
  }
}

/* 🐘 Visual Editor */

class ElephantEntityCardEditor extends HTMLElement {

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot) {
      const picker = this.shadowRoot.querySelector("ha-entity-picker");
      if (picker) picker.hass = hass;
    }
  }

  setConfig(config) {
    this._config = { ...config };
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this._render();
    }
    this._update();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        .form { display: flex; flex-direction: column; gap: 16px; padding: 12px; }
        .row { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
        .color-item { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
        .color-item input[type="color"] { width: 100%; height: 30px; border: none; background: none; cursor: pointer; }
        .label { font-size: 0.9rem; font-weight: 500; color: var(--secondary-text-color); }
        .color-label { font-size: 0.75rem; color: var(--secondary-text-color); }
        input[type="text"] {
          width: 100%;
          padding: 8px;
          box-sizing: border-box;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 1rem;
        }
        .text-field-wrap { display: flex; flex-direction: column; gap: 4px; }
        .text-field-wrap label { font-size: 0.85rem; color: var(--secondary-text-color); }
      </style>

      <div class="form">

        <ha-entity-picker label="Entity" allow-custom-entity></ha-entity-picker>

        <div class="text-field-wrap">
          <label>Friendly Name</label>
          <input type="text" id="name" placeholder="Leave blank to use entity name">
        </div>

        <div class="text-field-wrap">
          <label>Friendly Unit</label>
          <input type="text" id="unit" placeholder="Leave blank to use entity unit">
        </div>

        <ha-icon-picker label="Icon" id="icon"></ha-icon-picker>

        <div class="row">
          <div class="color-item">
            <span class="color-label">Background</span>
            <input type="color" id="background_color">
          </div>
          <div class="color-item">
            <span class="color-label">Text</span>
            <input type="color" id="text_color">
          </div>
          <div class="color-item">
            <span class="color-label">Icon</span>
            <input type="color" id="icon_color">
          </div>
        </div>

        <div>
          <div class="label">Blur (<span id="blurVal">0</span>px)</div>
          <ha-slider id="blur_amount" min="0" max="30" step="1" pin></ha-slider>
        </div>

        <div>
          <div class="label">Transparency (<span id="transVal">100</span>%)</div>
          <ha-slider id="transparency" min="0" max="1" step="0.05" pin></ha-slider>
        </div>

        <ha-formfield label="Enable State-Based Icon Coloring">
          <ha-switch id="state_color"></ha-switch>
        </ha-formfield>

      </div>
    `;

    this._attachListeners();
  }

  _attachListeners() {
    // Entity picker — fires value-changed
    const entityPicker = this.shadowRoot.querySelector("ha-entity-picker");
    entityPicker.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._save("entity", ev.detail.value);
    });

    // Plain text inputs — fires input event, value is ev.target.value
    this.shadowRoot.querySelector("#name").addEventListener("input", (ev) => {
      this._save("name", ev.target.value);
    });
    this.shadowRoot.querySelector("#unit").addEventListener("input", (ev) => {
      this._save("unit", ev.target.value);
    });

    // Icon picker — fires value-changed
    this.shadowRoot.querySelector("#icon").addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._save("icon", ev.detail.value);
    });

    // Colour inputs — fires input event
    ["background_color", "text_color", "icon_color"].forEach((key) => {
      this.shadowRoot.querySelector(`#${key}`).addEventListener("input", (ev) => {
        this._save(key, ev.target.value);
      });
    });

    // Sliders — fire value-changed
    this.shadowRoot.querySelector("#blur_amount").addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const val = parseFloat(ev.detail.value);
      this.shadowRoot.getElementById("blurVal").textContent = val;
      this._save("blur_amount", val);
    });
    this.shadowRoot.querySelector("#transparency").addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const val = parseFloat(ev.detail.value);
      this.shadowRoot.getElementById("transVal").textContent = Math.round(val * 100);
      this._save("transparency", val);
    });

    // Switch — fires change event
    this.shadowRoot.querySelector("#state_color").addEventListener("change", (ev) => {
      this._save("state_color", ev.target.checked);
    });
  }

  _update() {
    if (!this._config || !this.shadowRoot) return;

    const entityPicker = this.shadowRoot.querySelector("ha-entity-picker");
    if (entityPicker) {
      if (this._hass) entityPicker.hass = this._hass;
      entityPicker.value = this._config.entity || "";
    }

    this.shadowRoot.querySelector("#name").value = this._config.name || "";
    this.shadowRoot.querySelector("#unit").value = this._config.unit || "";

    const iconPicker = this.shadowRoot.querySelector("#icon");
    if (iconPicker) iconPicker.value = this._config.icon || "";

    this.shadowRoot.querySelector("#background_color").value = this._config.background_color || "#ffffff";
    this.shadowRoot.querySelector("#text_color").value      = this._config.text_color || "#ffffff";
    this.shadowRoot.querySelector("#icon_color").value      = this._config.icon_color || "#ffffff";

    const blur = this._config.blur_amount || 0;
    this.shadowRoot.querySelector("#blur_amount").value = blur;
    this.shadowRoot.getElementById("blurVal").textContent  = blur;

    const trans = this._config.transparency !== undefined ? this._config.transparency : 1;
    this.shadowRoot.querySelector("#transparency").value = trans;
    this.shadowRoot.getElementById("transVal").textContent = Math.round(trans * 100);

    const sc = this._config.state_color !== undefined ? this._config.state_color : true;
    this.shadowRoot.querySelector("#state_color").checked = sc;
  }

  _save(key, value) {
    this._config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }
}

/* 🔍 Registration */
customElements.define("elephant-entity-card-editor", ElephantEntityCardEditor);
customElements.define("elephant-entity-card", ElephantEntityCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "elephant-entity-card")) {
  window.customCards.push({
    type: "elephant-entity-card",
    name: "Elephant Entity Card",
    preview: true,
    description: "Glass-style entity card with actions, blur, icon/name override and state coloring.",
  });
}
