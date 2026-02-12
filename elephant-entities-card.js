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
    this._config = { blur_amount: 0, transparency: 1, state_color: true, ...config };
    if (!this.shadowRoot) { this.attachShadow({mode:"open"}); this._render(); }
    this._update();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        .form { display: flex; flex-direction: column; gap:16px; padding:12px; }
        .row { display:flex; gap:12px; align-items: center; justify-content: space-between; }
        .color-item { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
        input[type="color"] { width:100%; height:30px; border:none; background:none; cursor:pointer; }
        .label { font-size:0.9rem; font-weight:500; color: var(--secondary-text-color); }
        .color-label { font-size: 0.75rem; }
      </style>

      <div class="form">
        <ha-entity-picker label="Entity" .value="${this._config.entity}" configValue="entity"></ha-entity-picker>
        
        <ha-textfield label="Override Name" .value="${this._config.name || ''}" configValue="name"></ha-textfield>
        <ha-textfield label="Override Unit" .value="${this._config.unit || ''}" configValue="unit"></ha-textfield>
        
        <ha-icon-picker label="Icon" .value="${this._config.icon}" configValue="icon"></ha-icon-picker>

        <div class="row">
          <div class="color-item">
            <span class="color-label">Background</span>
            <input type="color" configValue="background_color" value="${this._config.background_color || '#ffffff'}">
          </div>
          <div class="color-item">
            <span class="color-label">Text</span>
            <input type="color" configValue="text_color" value="${this._config.text_color || '#ffffff'}">
          </div>
          <div class="color-item">
            <span class="color-label">Icon</span>
            <input type="color" configValue="icon_color" value="${this._config.icon_color || '#ffffff'}">
          </div>
        </div>

        <div>
          <div class="label">Blur (<span id="blurVal"></span>px)</div>
          <ha-slider min="0" max="30" step="1" pin .value="${this._config.blur_amount}" configValue="blur_amount"></ha-slider>
        </div>

        <div>
          <div class="label">Transparency (<span id="transVal"></span>%)</div>
          <ha-slider min="0" max="1" step="0.05" pin .value="${this._config.transparency}" configValue="transparency"></ha-slider>
        </div>

        <ha-formfield label="Enable State-Based Icon Coloring">
          <ha-switch .checked="${this._config.state_color}" configValue="state_color"></ha-switch>
        </ha-formfield>
      </div>
    `;
    this._attachListeners();
  }

  _attachListeners() {
    this.shadowRoot.querySelectorAll("[configValue]").forEach(el => {
      const key = el.getAttribute("configValue");
      const tagName = el.tagName.toLowerCase();

      // 1. HA-TEXTFIELD (Name/Unit Override)
      // Needs to listen for 'input' (like the CAT card inputs) to update while typing
      if (tagName === "ha-textfield") {
        el.addEventListener("input", ev => this._valueChanged(key, ev.target.value));
      }
      
      // 2. HA-ENTITY-PICKER / HA-ICON-PICKER
      // These specialized components fire 'value-changed' with detail.value
      else if (tagName === "ha-entity-picker" || tagName === "ha-icon-picker") {
        el.addEventListener("value-changed", ev => this._valueChanged(key, ev.detail.value));
      }
      
      // 3. HA-SWITCH
      // Uses checked property
      else if (tagName === "ha-switch") {
        el.addEventListener("change", ev => this._valueChanged(key, ev.target.checked));
      }
      
      // 4. NATIVE INPUTS (Color pickers)
      // Uses standard change/input event and target.value
      else if (tagName === "input") {
        el.addEventListener("input", ev => this._valueChanged(key, ev.target.value));
      }

      // 5. HA-SLIDER
      // Uses change event and target.value
      else if (tagName === "ha-slider") {
        el.addEventListener("change", ev => this._valueChanged(key, ev.target.value));
      }
    });
  }

  _update() {
    if (!this._config) return;

    this.shadowRoot.querySelectorAll("[configValue]").forEach(el => {
      const key = el.getAttribute("configValue");
      const val = this._config[key];
      if (val === undefined) return;

      if (el.tagName === "HA-SWITCH") el.checked = val;
      else if (el.tagName !== "INPUT") el.value = val;
    });

    this.shadowRoot.getElementById("blurVal").textContent = this._config.blur_amount;
    this.shadowRoot.getElementById("transVal").textContent = Math.round(this._config.transparency*100);

    const picker = this.shadowRoot.querySelector("ha-entity-picker");
    if (picker && this._hass) picker.hass = this._hass;
  }

  _valueChanged(key, value) {
    let newValue = value;
    if (["blur_amount","transparency"].includes(key)) newValue = parseFloat(value);
    
    const newConfig = { ...this._config, [key]: newValue };

    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles:true, composed:true
    }));
  }
}
