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
      state_color: true,
      tap_action: { action: "more-info" },
      hold_action: { action: "none" },
      double_tap_action: { action: "none" },
      ...config,
    };
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
        :host {
          display: block;
        }

        ha-card {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: background 0.2s ease;
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

    card.addEventListener("click", (ev) => {
      this._handleAction(ev, "tap");
    });

    card.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      this._handleAction(ev, "hold");
    });

    card.addEventListener("dblclick", (ev) => {
      this._handleAction(ev, "double_tap");
    });
  }

  _handleAction(ev, action) {
    const config = this.config;
    const actionConfig = config[`${action}_action`] || { action: "more-info" };

    if (actionConfig.action === "none") return;

    if (actionConfig.action === "more-info") {
      this.dispatchEvent(
        new CustomEvent("hass-more-info", {
          detail: { entityId: config.entity },
          bubbles: true,
          composed: true,
        })
      );
    }

    if (actionConfig.action === "toggle") {
      this._hass.callService("homeassistant", "toggle", {
        entity_id: config.entity,
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

    // Auto-toggle if no tap_action defined
    if (
      (!this.config.tap_action ||
        this.config.tap_action.action === "more-info") &&
      ["light", "switch", "fan", "input_boolean"].includes(domain)
    ) {
      this.config.tap_action = { action: "toggle" };
    }

    // Icon
    icon.setAttribute(
      "icon",
      this.config.icon ||
        stateObj.attributes.icon ||
        "mdi:help-circle"
    );

    // State color handling
    if (this.config.state_color) {
      icon.style.color = isActive
        ? "var(--state-active-color)"
        : "var(--disabled-text-color)";
    } else if (this.config.icon_color) {
      icon.style.color = this.config.icon_color;
    } else {
      icon.style.color = "";
    }

    // Background override
    card.style.background = this.config.background_color || "";
    card.style.color = this.config.text_color || "";

    // Text
    this.shadowRoot.querySelector(".primary").textContent =
      this.config.name ||
      stateObj.attributes.friendly_name ||
      this.config.entity;

    const unit =
      this.config.unit ||
      stateObj.attributes.unit_of_measurement ||
      "";

    this.shadowRoot.querySelector(".secondary").textContent =
      `${stateObj.state} ${unit}`.trim();
  }

  getCardSize() {
    return 1;
  }

  static getStubConfig() {
    return {
      entity: "sun.sun",
      state_color: true,
      icon: "mdi:elephant"
    };
  }

  static getConfigElement() {
    return document.createElement("elephant-entity-card-editor");
  }
}

customElements.define("elephant-entity-card", ElephantEntityCard);


/* 🐘 Visual Editor */

class ElephantEntityCardEditor extends HTMLElement {

  set hass(hass) {
    this._hass = hass;
  }

  setConfig(config) {
    this._config = config;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this._render();
    }

    this._update();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        .form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px;
        }
      </style>

      <div class="form">
        <ha-entity-picker label="Entity" .hass=${this._hass} .configValue="entity"></ha-entity-picker>
        <ha-textfield label="Name" .configValue="name"></ha-textfield>
        <ha-textfield label="Unit" .configValue="unit"></ha-textfield>
        <ha-icon-picker label="Icon" .configValue="icon"></ha-icon-picker>
        <ha-switch .configValue="state_color">Enable State Color</ha-switch>
      </div>
    `;

    this.shadowRoot.querySelectorAll("[configValue]").forEach((el) => {
      el.addEventListener("value-changed", (ev) =>
        this._valueChanged(ev, el)
      );
    });
  }

  _update() {
    if (!this._config) return;

    this.shadowRoot.querySelectorAll("[configValue]").forEach((el) => {
      el.value = this._config[el.configValue];
    });
  }

  _valueChanged(ev, el) {
    const value = ev.detail?.value ?? el.value;

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          config: { ...this._config, [el.configValue]: value },
        },
        bubbles: true,
        composed: true,
      })
    );
  }
}

// Fixed the stray quote below
customElements.define(
  "elephant-entity-card-editor",
  ElephantEntityCardEditor
);


/* 🔍 Discovery */

window.customCards = window.customCards || [];
window.customCards.push({
  type: "elephant-entity-card",
  name: "Elephant Entity Card",
  preview: true,
  description: "A standard-sized entity card with actions, toggle support and state coloring.",
});
