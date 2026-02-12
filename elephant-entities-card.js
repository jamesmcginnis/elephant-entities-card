class ElephantEntityCardEditor extends HTMLElement {

  set hass(hass) {
    this._hass = hass;
  }

  setConfig(config) {
    this._config = config;

    if (!this.shadowRoot) {
      this.attachShadow({ mode:"open" });
      this._render();
    }

    this._update();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        .form {
          display:flex;
          flex-direction:column;
          gap:16px;
          padding:8px;
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

    this.shadowRoot.querySelectorAll("[configValue]").forEach(el=>{
      el.addEventListener("value-changed",(ev)=>this._valueChanged(ev,el));
    });
  }

  _update() {
    if (!this._config) return;
    this.shadowRoot.querySelectorAll("[configValue]").forEach(el=>{
      el.value = this._config[el.configValue];
    });
  }

  _valueChanged(ev,el){
    const value = ev.detail.value;
    this.dispatchEvent(new CustomEvent("config-changed",{
      detail:{ config:{ ...this._config, [el.configValue]:value }},
      bubbles:true,
      composed:true
    }));
  }
}

customElements.define("elephant-entity-card-editor", ElephantEntityCardEditor);
