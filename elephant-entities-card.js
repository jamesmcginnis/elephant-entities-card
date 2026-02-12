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
        :host { display:block; }
        ha-card { padding:16px; display:flex; align-items:center; gap:16px; cursor:pointer; transition:0.2s ease; }
        ha-card:active { transform:scale(0.98); }
        ha-icon { --mdc-icon-size:32px; }
        .text { display:flex; flex-direction:column; overflow:hidden; }
        .primary { font-size:1rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .secondary { font-size:0.875rem; color:var(--secondary-text-color); }
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
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        detail: { entityId: this.config.entity },
        bubbles:true, composed:true
      }));
    }

    if (actionConfig.action === "toggle") {
      this._hass.callService("homeassistant", "toggle", { entity_id: this.config.entity });
    }

    if (actionConfig.action === "navigate" && actionConfig.navigation_path) {
      window.history.pushState(null,"",actionConfig.navigation_path);
      window.dispatchEvent(new Event("location-changed"));
    }

    if (actionConfig.action === "call-service" && actionConfig.service) {
      const [domain, service] = actionConfig.service.split(".");
      let data = {};
      try { data = actionConfig.service_data ? JSON.parse(actionConfig.service_data) : {}; } catch(e) { console.error(e); }
      this._hass.callService(domain, service, data);
    }
  }

  _update() {
    if (!this._hass) return;
    const stateObj = this._hass.states[this.config.entity];
    if (!stateObj) return;

    const card = this.shadowRoot.querySelector("ha-card");
    const icon = this.shadowRoot.querySelector("ha-icon");
    const domain = stateObj.entity_id.split(".")[0];
    const isActive = ["on","open","playing","home"].includes(stateObj.state);

    // Auto-toggle for common domains
    if ((!this.config.tap_action || this.config.tap_action.action==="more-info") &&
        ["light","switch","fan","input_boolean"].includes(domain)) {
      this.config.tap_action = { action:"toggle" };
    }

    icon.setAttribute("icon", this.config.icon || stateObj.attributes.icon || "mdi:help-circle");

    if (this.config.state_color) {
      icon.style.color = isActive ? "var(--state-active-color)" : "var(--disabled-text-color)";
    } else if (this.config.icon_color) icon.style.color = this.config.icon_color;
    else icon.style.color = "";

    if (this.config.background_color) {
      const rgb = this._hexToRgb(this.config.background_color);
      card.style.background = `rgba(${rgb.r},${rgb.g},${rgb.b},${this.config.transparency})`;
      if (this.config.blur_amount>0) {
        card.style.backdropFilter=`blur(${this.config.blur_amount}px)`;
        card.style.webkitBackdropFilter=`blur(${this.config.blur_amount}px)`;
      } else { card.style.backdropFilter=""; card.style.webkitBackdropFilter=""; }
    } else card.style.background="";

    card.style.color = this.config.text_color || "";

    this.shadowRoot.querySelector(".primary").textContent = this.config.name || stateObj.attributes.friendly_name || this.config.entity;
    const unit = this.config.unit || stateObj.attributes.unit_of_measurement || "";
    this.shadowRoot.querySelector(".secondary").textContent = `${stateObj.state} ${unit}`.trim();
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {r:parseInt(result[1],16),g:parseInt(result[2],16),b:parseInt(result[3],16)} : {r:255,g:255,b:255};
  }

  getCardSize() { return 1; }
  static getStubConfig() { return { entity:"sun.sun", state_color:true, icon:"mdi:elephant" }; }
  static getConfigElement() { return document.createElement("elephant-entity-card-editor"); }
}


/* 🐘 Visual Editor with Dynamic Action Fields */

class ElephantEntityCardEditor extends HTMLElement {

  set hass(hass) {
    this._hass = hass;
    const picker = this.shadowRoot?.querySelector("ha-entity-picker");
    if (picker) picker.hass = hass;
  }

  setConfig(config) {
    this._config = {
      blur_amount:0, transparency:1, state_color:true,
      tap_action:{action:"more-info"}, hold_action:{action:"none"}, double_tap_action:{action:"none"},
      ...config
    };
    if (!this.shadowRoot) { this.attachShadow({mode:"open"}); this._render(); }
    this._update();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        .form { display:flex; flex-direction:column; gap:16px; padding:12px; }
        .row { display:flex; gap:12px; justify-content:space-between; }
        input[type=color]{width:40px;height:40px;border:none;background:none;cursor:pointer;}
        .label{font-size:0.9rem;font-weight:500;}
      </style>

      <div class="form">
        <ha-entity-picker label="Entity" configValue="entity"></ha-entity-picker>
        <ha-textfield label="Override Name" configValue="name"></ha-textfield>
        <ha-textfield label="Override Unit" configValue="unit"></ha-textfield>
        <ha-icon-picker label="Icon" configValue="icon"></ha-icon-picker>
        <div class="row">
          <input type="color" configValue="background_color">
          <input type="color" configValue="text_color">
          <input type="color" configValue="icon_color">
        </div>
        <div>
          <div class="label">Blur (<span id="blurVal"></span>px)</div>
          <ha-slider min="0" max="30" step="1" pin configValue="blur_amount"></ha-slider>
        </div>
        <div>
          <div class="label">Transparency (<span id="transVal"></span>%)</div>
          <ha-slider min="0" max="1" step="0.05" pin configValue="transparency"></ha-slider>
        </div>
        <ha-switch configValue="state_color">Enable State-Based Icon Coloring</ha-switch>

        <ha-select label="Tap Action" configValue="tap_action[action]">
          <mwc-list-item value="none">None</mwc-list-item>
          <mwc-list-item value="more-info">More Info</mwc-list-item>
          <mwc-list-item value="toggle">Toggle</mwc-list-item>
          <mwc-list-item value="navigate">Navigate</mwc-list-item>
          <mwc-list-item value="call-service">Call Service</mwc-list-item>
        </ha-select>
        <ha-textfield label="Tap Navigation Path" configValue="tap_action[navigation_path]"></ha-textfield>
        <ha-textfield label="Tap Service (domain.service)" configValue="tap_action[service]"></ha-textfield>
        <ha-textfield label="Tap Service Data (JSON)" configValue="tap_action[service_data]"></ha-textfield>

        <ha-select label="Hold Action" configValue="hold_action[action]">
          <mwc-list-item value="none">None</mwc-list-item>
          <mwc-list-item value="more-info">More Info</mwc-list-item>
          <mwc-list-item value="toggle">Toggle</mwc-list-item>
          <mwc-list-item value="navigate">Navigate</mwc-list-item>
          <mwc-list-item value="call-service">Call Service</mwc-list-item>
        </ha-select>
        <ha-textfield label="Hold Navigation Path" configValue="hold_action[navigation_path]"></ha-textfield>
        <ha-textfield label="Hold Service (domain.service)" configValue="hold_action[service]"></ha-textfield>
        <ha-textfield label="Hold Service Data (JSON)" configValue="hold_action[service_data]"></ha-textfield>

        <ha-select label="Double Tap Action" configValue="double_tap_action[action]">
          <mwc-list-item value="none">None</mwc-list-item>
          <mwc-list-item value="more-info">More Info</mwc-list-item>
          <mwc-list-item value="toggle">Toggle</mwc-list-item>
          <mwc-list-item value="navigate">Navigate</mwc-list-item>
          <mwc-list-item value="call-service">Call Service</mwc-list-item>
        </ha-select>
        <ha-textfield label="Double Tap Navigation Path" configValue="double_tap_action[navigation_path]"></ha-textfield>
        <ha-textfield label="Double Tap Service (domain.service)" configValue="double_tap_action[service]"></ha-textfield>
        <ha-textfield label="Double Tap Service Data (JSON)" configValue="double_tap_action[service_data]"></ha-textfield>
      </div>
    `;
    this._attachListeners();
  }

  _attachListeners() {
    this.shadowRoot.querySelectorAll("[configValue]").forEach(el=>{
      const key = el.getAttribute("configValue");
      if(["HA-ENTITY-PICKER","HA-ICON-PICKER","HA-TEXTFIELD","HA-SLIDER","HA-SELECT"].includes(el.tagName))
        el.addEventListener("value-changed",ev=>this._valueChanged(key,ev.detail.value));
      if(el.tagName==="HA-SWITCH") el.addEventListener("change",ev=>this._valueChanged(key,ev.target.checked));
      if(el.tagName==="INPUT") el.addEventListener("input",ev=>this._valueChanged(key,ev.target.value));
    });
  }

  _update() {
    if(!this._config) return;

    this.shadowRoot.querySelectorAll("[configValue]").forEach(el=>{
      const key = el.getAttribute("configValue");
      let val = this._config[key];
      if(val===undefined) return;
      if(el.tagName==="HA-SWITCH") el.checked=val;
      else el.value=val;
    });

    this.shadowRoot.getElementById("blurVal").textContent=this._config.blur_amount;
    this.shadowRoot.getElementById("transVal").textContent=Math.round(this._config.transparency*100);

    const picker = this.shadowRoot.querySelector("ha-entity-picker");
    if(picker && this._hass) picker.hass=this._hass;
  }

  _valueChanged(key,value) {
    if(["blur_amount","transparency"].includes(key)) value=parseFloat(value);
    const newConfig={...this._config};
    if(key.includes("[")) {
      const [parent,child]=key.split(/\[|\]/).filter(Boolean);
      newConfig[parent]={...(newConfig[parent]||{}),[child]:value};
    } else newConfig[key]=value;

    this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:newConfig},bubbles:true,composed:true}));
  }
}

/* 🔍 Registration */
customElements.define("elephant-entity-card-editor", ElephantEntityCardEditor);
customElements.define("elephant-entity-card", ElephantEntityCard);

window.customCards=window.customCards||[];
if(!window.customCards.some(c=>c.type==="elephant-entity-card")){
  window.customCards.push({
    type:"elephant-entity-card",
    name:"Elephant Entity Card",
    preview:true,
    description:"Glass-style entity card with override name/icon/unit, blur, transparency, state coloring, and fully configurable actions."
  });
}