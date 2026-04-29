/* 🐘 Elephant Entity Card - Icon Mapping & Auto-Population */

// ─────────────────────────────────────────────
// Colour field definitions (editor only)
// ─────────────────────────────────────────────
const ELEPHANT_COLOUR_FIELDS_BASE = [
  {
    key:         "background_color",
    label:       "Background",
    description: "Colour of the card background. Leave blank to use your HA theme default.",
    default:     "#1c1c1e",
  },
  {
    key:         "text_color",
    label:       "Text",
    description: "Colour of the name and state text. Leave blank for theme default.",
    default:     "#ffffff",
  },
];

const ELEPHANT_COLOUR_FIELD_ICON = {
  key:         "icon_color",
  label:       "Icon",
  description: "Colour of the icon. Only available when Use State Colours is off.",
  default:     "#4caf50",
};

class ElephantEntityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._popupOverlay = null;
    this._popupHours   = 3;
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
      decimals: 2,
      graph_hours: 3,
      graph_color: "#007AFF"
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
            border-radius: 28px;
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
    this._openPopup();
  }

  // ── Popup ─────────────────────────────────────────────────────────────────

  _openPopup() {
    if (this._popupOverlay) return;

    const cfg      = this._config;
    const stateObj = this._hass && this._hass.states[cfg.entity];
    if (!stateObj) return;

    // Resolve display values (mirrors _render logic)
    let displayName;
    if (cfg.name) {
      displayName = this._formatString(cfg.name);
    } else if (stateObj.attributes.friendly_name) {
      displayName = this._formatString(stateObj.attributes.friendly_name);
    } else {
      displayName = this._formatString(cfg.entity, true);
    }

    const domain   = cfg.entity.split(".")[0];
    const unit     = cfg.unit || stateObj.attributes.unit_of_measurement || "";
    const isActive = ["on","open","playing","home","locked"].includes(stateObj.state);

    let displayState = stateObj.state;
    if (stateObj.state === "unavailable" || stateObj.state === "unknown") {
      displayState = "Offline";
    } else if (domain === "lock") {
      displayState = displayState === "locked" ? "Locked" : "Unlocked";
    } else if (domain === "binary_sensor") {
      const dc = stateObj.attributes.device_class;
      if (["door","window","opening","garage_door"].includes(dc)) {
        displayState = displayState === "on" ? "Open" : "Closed";
      } else {
        displayState = displayState === "on" ? "Detected" : "Clear";
      }
    } else if (cfg.decimals !== undefined && !isNaN(parseFloat(displayState)) && isFinite(displayState)) {
      displayState = parseFloat(displayState).toFixed(cfg.decimals);
    } else {
      displayState = this._formatString(displayState);
    }

    const lastUpdate  = stateObj.last_changed || stateObj.last_updated;
    let timeAgoStr = "--";
    if (lastUpdate) {
      const mins = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 60000);
      timeAgoStr = mins < 1 ? "Just now" : mins === 1 ? "1 min ago" : mins < 60 ? `${mins} mins ago` : `${Math.floor(mins/60)}h ago`;
    }

    // Accent colour: use icon_color if set, else state colour, else blue
    const accentColor = cfg.icon_color
      ? this._processColor(cfg.icon_color)
      : (cfg.state_color !== false
          ? (isActive ? "var(--state-active-color, #4caf50)" : "var(--disabled-text-color, #9e9e9e)")
          : "#007AFF");

    const graphColor = cfg.graph_color || "#007AFF";
    this._popupHours = parseInt(cfg.graph_hours) || 3;

    // ── Overlay ──
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);";

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes eecFadeIn  { from { opacity:0 } to { opacity:1 } }
      @keyframes eecSlideUp { from { transform:translateY(18px) scale(0.97); opacity:0 } to { transform:none; opacity:1 } }
      .eec-popup         { animation: eecSlideUp 0.26s cubic-bezier(0.34,1.3,0.64,1); }
      #eec-popup-overlay { animation: eecFadeIn 0.2s ease; }
      .eec-close-btn:hover { background:rgba(255,255,255,0.22) !important; }
      .eec-seg-btn {
        flex:1; text-align:center; padding:7px 4px; font-size:12px; font-weight:600;
        border-radius:7px; cursor:pointer; color:rgba(255,255,255,0.55);
        border:none; background:none; transition:all 0.2s; font-family:inherit;
        touch-action:manipulation;
      }
      .eec-seg-btn.active { background:${graphColor}; color:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.35); }
      .eec-info-row { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid rgba(255,255,255,0.07); }
      .eec-info-row:last-child { border-bottom:none; }
      .eec-info-label { font-size:12px; color:rgba(255,255,255,0.45); font-weight:500; }
      .eec-info-value { font-size:13px; font-weight:600; color:rgba(255,255,255,0.9); text-align:right; }
    `;

    // ── Popup panel ──
    const popup = document.createElement("div");
    popup.className = "eec-popup";
    popup.style.cssText = "background:rgba(28,28,30,0.96);backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%);border:1px solid rgba(255,255,255,0.15);border-radius:24px;box-shadow:0 24px 64px rgba(0,0,0,0.65);padding:20px;width:100%;max-width:400px;max-height:88vh;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;color:#fff;";
    popup.addEventListener("touchmove", e => e.stopPropagation(), { passive: true });

    // Header row
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;";
    headerRow.innerHTML = `
      <span style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.45);">${displayName}</span>
      <button class="eec-close-btn" style="background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.65);font-size:15px;line-height:1;padding:0;transition:background 0.15s;flex-shrink:0;">✕</button>`;
    headerRow.querySelector(".eec-close-btn").addEventListener("click", () => this._closePopup());

    // Hero value
    const heroRow = document.createElement("div");
    heroRow.style.cssText = "display:flex;align-items:baseline;gap:8px;margin-bottom:16px;";
    heroRow.innerHTML = `
      <div style="font-size:52px;font-weight:700;letter-spacing:-2px;line-height:1;color:${accentColor};">${displayState}</div>
      ${unit ? `<div style="font-size:16px;color:rgba(255,255,255,0.4);font-weight:500;padding-bottom:4px;">${unit}</div>` : ""}`;

    // Time-range segmented control
    const segWrap = document.createElement("div");
    segWrap.style.cssText = "display:flex;background:rgba(118,118,128,0.2);border-radius:10px;padding:3px;gap:2px;margin-bottom:12px;";

    const graphInner = document.createElement("div");
    graphInner.style.cssText = "height:130px;position:relative;margin-bottom:14px;";
    graphInner.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.25);font-size:12px;">Loading…</div>`;

    [1, 3, 6, 12, 24].forEach(h => {
      const btn = document.createElement("button");
      btn.className = "eec-seg-btn" + (h === this._popupHours ? " active" : "");
      btn.textContent = `${h}h`;
      btn.dataset.hours = h;
      const switchHours = (e) => {
        if (e.type === "touchend") e.preventDefault();
        this._popupHours = h;
        segWrap.querySelectorAll(".eec-seg-btn").forEach(b => b.classList.toggle("active", parseInt(b.dataset.hours) === h));
        graphInner.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.25);font-size:12px;">Loading…</div>`;
        this._loadGraphInto(graphInner, h);
      };
      btn.addEventListener("click", switchHours);
      btn.addEventListener("touchend", switchHours);
      segWrap.appendChild(btn);
    });

    // Info rows
    const infoWrap = document.createElement("div");
    const rows = [
      { label: "State",        value: `${displayState}${unit ? " " + unit : ""}` },
      { label: "Last updated", value: timeAgoStr },
    ];
    const attrs = stateObj.attributes || {};
    if (attrs.friendly_name && attrs.friendly_name !== displayName) {
      rows.push({ label: "Friendly name", value: attrs.friendly_name });
    }
    if (attrs.unit_of_measurement && !cfg.unit) {
      // already shown in hero — skip duplicate
    }
    rows.forEach(({ label, value }) => {
      const row = document.createElement("div");
      row.className = "eec-info-row";
      row.innerHTML = `<span class="eec-info-label">${label}</span><span class="eec-info-value">${value}</span>`;
      infoWrap.appendChild(row);
    });

    popup.appendChild(styleEl);
    popup.appendChild(headerRow);
    popup.appendChild(heroRow);
    popup.appendChild(segWrap);
    popup.appendChild(graphInner);
    popup.appendChild(infoWrap);
    overlay.appendChild(popup);
    overlay.addEventListener("click", e => { if (e.target === overlay) this._closePopup(); });
    document.body.appendChild(overlay);
    this._popupOverlay = overlay;

    this._loadGraphInto(graphInner, this._popupHours);
  }

  _closePopup() {
    if (!this._popupOverlay) return;
    this._popupOverlay.style.transition = "opacity 0.18s ease";
    this._popupOverlay.style.opacity = "0";
    setTimeout(() => {
      if (this._popupOverlay?.parentNode) this._popupOverlay.parentNode.removeChild(this._popupOverlay);
      this._popupOverlay = null;
    }, 180);
  }

  // ── Graph ─────────────────────────────────────────────────────────────────

  _buildGraph(values, timestamps) {
    if (!values || values.length < 2) {
      return `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.35);font-size:12px;">Not enough data</div>`;
    }

    const cfg       = this._config;
    const lineColor = cfg.graph_color || "#007AFF";
    const W = 400, H = 160;
    const pad   = { top: 6, right: 8, bottom: 20, left: 30 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top  - pad.bottom;

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const vpad   = (rawMax - rawMin) * 0.2 || 1;
    const min    = rawMin - vpad;
    const max    = rawMax + vpad;
    const range  = max - min;

    const xs       = values.map((_, i) => pad.left + (i / (values.length - 1)) * plotW);
    const ys       = values.map(v => pad.top + plotH - ((v - min) / range) * plotH);
    const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const fillPath = linePath + ` L${xs[xs.length-1].toFixed(1)},${(pad.top+plotH).toFixed(1)} L${pad.left},${(pad.top+plotH).toFixed(1)} Z`;

    const lastX = xs[xs.length-1], lastY = ys[ys.length-1];

    // X-axis time labels
    let xLabels = "";
    if (timestamps && timestamps.length >= 2) {
      const fmt = ts => { try { const d = new Date(ts); return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`; } catch { return ""; } };
      xLabels = `<text x="${pad.left+2}" y="${H-9}" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="start">${fmt(timestamps[0])}</text>
        <text x="${W-pad.right-2}" y="${H-9}" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="end">${fmt(timestamps[timestamps.length-1])}</text>`;
    }

    // Current-value label next to the final dot
    const currentLabel = values[values.length-1].toFixed(
      cfg.decimals !== undefined ? Math.min(cfg.decimals, 2) : 1
    );
    const valLabelX = Math.min(lastX + 7, W - pad.right - 2);
    const valLabelY = Math.max(pad.top + 7, Math.min(pad.top + plotH - 2, lastY + 3));

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="overflow:visible;display:block;">
      <defs>
        <linearGradient id="eecGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${lineColor}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02"/>
        </linearGradient>
        <clipPath id="eecClip">
          <rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}"/>
        </clipPath>
      </defs>
      <path d="${fillPath}" fill="url(#eecGrad)" clip-path="url(#eecClip)"/>
      <path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" clip-path="url(#eecClip)"/>
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="5" fill="${lineColor}" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/>
      <text x="${valLabelX.toFixed(1)}" y="${valLabelY.toFixed(1)}" fill="${lineColor}" font-size="9" font-weight="700" text-anchor="start" opacity="0.9">${currentLabel}</text>
      ${xLabels}
    </svg>`;
  }

  _isBinarySensor() {
    const entity  = this._config?.entity;
    const domain  = entity?.split(".")?.[0];
    if (domain === "binary_sensor") return true;
    // Also treat plain on/off entities (e.g. input_boolean, switch) as binary
    const state = this._hass?.states[entity]?.state;
    return state === "on" || state === "off";
  }

  async _loadGraphInto(container, hours) {
    const entity = this._config.entity;
    if (!entity || !this._hass) return;

    if (!container._loadGen) container._loadGen = 0;
    const gen = ++container._loadGen;

    // ── Binary sensors: delegate to step-chart renderer ──────────────────────
    if (this._isBinarySensor()) {
      try {
        const end   = new Date();
        const start = new Date(end - hours * 3600000);
        const resp  = await this._hass.callApi("GET",
          `history/period/${start.toISOString()}?filter_entity_id=${entity}&end_time=${end.toISOString()}&minimal_response=true&no_attributes=true`
        );
        if (container._loadGen !== gen) return;

        const raw   = resp?.[0] || [];
        const valid = raw.filter(s => s.state === "on" || s.state === "off");

        if (!valid.length) {
          container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.25);font-size:12px;">No history in this period</div>`;
          return;
        }

        const states      = valid.map(s => s.state);
        const timestamps  = valid.map(s => s.last_changed || s.last_updated);
        const windowStart = start.getTime();
        const windowEnd   = end.getTime();
        const graphColor  = this._config.graph_color || "#007AFF";

        container.innerHTML = this._buildOccupancyGraph(states, timestamps, windowStart, windowEnd, graphColor);
        const svg = container.querySelector("svg");
        if (svg) this._attachOccupancyCrosshair(svg, states, timestamps, windowStart, windowEnd, graphColor);
      } catch {
        if (container._loadGen !== gen) return;
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.25);font-size:12px;">Could not load history</div>`;
      }
      return;
    }

    // ── Numeric sensors: original line graph ──────────────────────────────────
    try {
      const end   = new Date();
      const start = new Date(end - hours * 3600000);
      const resp  = await this._hass.callApi("GET",
        `history/period/${start.toISOString()}?filter_entity_id=${entity}&end_time=${end.toISOString()}&minimal_response=true&no_attributes=true`
      );
      if (container._loadGen !== gen) return;

      const raw    = resp?.[0] || [];
      const data   = raw.filter(s => !isNaN(parseFloat(s.state)));
      const values = data.map(s => parseFloat(s.state));
      const times  = data.map(s => s.last_changed || s.last_updated);

      if (values.length >= 2) {
        container.innerHTML = this._buildGraph(values, times);
        const svg = container.querySelector("svg");
        if (svg) this._attachGraphCrosshair(svg, values, times);
      } else {
        container.innerHTML = this._buildGraph([], []);
      }
    } catch {
      if (container._loadGen !== gen) return;
      const cv = parseFloat(this._hass.states[entity]?.state);
      container.innerHTML = !isNaN(cv)
        ? this._buildGraph(Array.from({ length: 20 }, () => cv + (Math.random() - 0.5) * 0.5), null)
        : this._buildGraph([], []);
    }
  }

  // ── Binary / occupancy step-chart ─────────────────────────────────────────

  _buildOccupancyGraph(states, timestamps, windowStart, windowEnd, activeColor) {
    const clearColor = "rgba(255,255,255,0.2)";
    const W = 400, H = 160;
    const pad   = { top: 30, right: 10, bottom: 26, left: 44 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top  - pad.bottom;
    const yOn    = pad.top;
    const yOff   = pad.top + plotH;

    const span = windowEnd - windowStart || 1;
    const toX  = t => pad.left + ((t - windowStart) / span) * plotW;
    const endX = W - pad.right;

    const points = timestamps.map((ts, i) => ({
      x:     Math.max(pad.left, Math.min(endX, toX(new Date(ts).getTime()))),
      y:     states[i] === "on" ? yOn : yOff,
      state: states[i],
    }));

    // Step path
    let stepD = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      stepD += ` H${points[i].x.toFixed(1)} V${points[i].y.toFixed(1)}`;
    }
    stepD += ` H${endX}`;

    // Filled area under "on" portions
    const fillD = stepD + ` V${yOff} H${pad.left} Z`;

    // Coloured line segments per state
    let segments = "";
    for (let i = 0; i < points.length; i++) {
      const x1  = points[i].x;
      const x2  = i < points.length - 1 ? points[i + 1].x : endX;
      const col = points[i].state === "on" ? activeColor : clearColor;
      segments += `<line x1="${x1.toFixed(1)}" y1="${points[i].y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${points[i].y.toFixed(1)}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>`;
      if (i < points.length - 1) {
        segments += `<line x1="${points[i+1].x.toFixed(1)}" y1="${points[i].y.toFixed(1)}" x2="${points[i+1].x.toFixed(1)}" y2="${points[i+1].y.toFixed(1)}" stroke="${col}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`;
      }
    }

    // Y-axis labels
    const yLabels = `
      <text x="${pad.left - 4}" y="${(yOn + 4).toFixed(1)}"  fill="${activeColor}" font-size="7.5" text-anchor="end" opacity="0.85">On</text>
      <text x="${pad.left - 4}" y="${(yOff + 4).toFixed(1)}" fill="${clearColor}"  font-size="7.5" text-anchor="end" opacity="0.85">Off</text>`;

    // Guide lines
    const grid = `
      <line x1="${pad.left}" y1="${yOn}"  x2="${W-pad.right}" y2="${yOn}"  stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      <line x1="${pad.left}" y1="${yOff}" x2="${W-pad.right}" y2="${yOff}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;

    // Time axis
    const fmtT = ms => {
      const d = new Date(ms);
      return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
    };
    const midT = (windowStart + windowEnd) / 2;
    const midX = toX(midT);
    const timeAxis = `
      <text x="${pad.left}"        y="${H - 7}" fill="rgba(255,255,255,0.25)" font-size="7.5" text-anchor="start">${fmtT(windowStart)}</text>
      <text x="${midX.toFixed(1)}" y="${H - 7}" fill="rgba(255,255,255,0.25)" font-size="7.5" text-anchor="middle">${fmtT(midT)}</text>
      <text x="${W - pad.right}"   y="${H - 7}" fill="rgba(255,255,255,0.25)" font-size="7.5" text-anchor="end">${fmtT(windowEnd)}</text>`;

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;overflow:visible;">
      ${grid}
      ${yLabels}
      <path d="${fillD}" fill="${activeColor}" opacity="0.12"/>
      ${segments}
      ${timeAxis}
    </svg>`;
  }

  _attachOccupancyCrosshair(svg, states, timestamps, windowStart, windowEnd, activeColor) {
    const clearColor = "rgba(255,255,255,0.2)";
    const W = 400, H = 160;
    const pad   = { top: 30, right: 10, bottom: 26, left: 44 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top  - pad.bottom;
    const span  = windowEnd - windowStart || 1;

    let crosshairGroup = null;
    let isDragging     = false;

    const clientXtoSvgX = clientX => {
      const rect = svg.getBoundingClientRect();
      return (clientX - rect.left) * (W / rect.width);
    };

    const svgXtoTime = svgX => windowStart + ((svgX - pad.left) / plotW) * span;

    const getStateAtTime = t => {
      let state = states[0];
      for (let i = 0; i < timestamps.length; i++) {
        if (new Date(timestamps[i]).getTime() <= t) state = states[i];
        else break;
      }
      return state;
    };

    const fmtTime = ms => {
      const d = new Date(ms);
      return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
    };

    const showCrosshair = svgX => {
      const cx    = Math.max(pad.left, Math.min(W - pad.right, svgX));
      const t     = svgXtoTime(cx);
      const state = getStateAtTime(t);
      const isOn  = state === "on";
      const color = isOn ? activeColor : clearColor;
      const label = isOn ? "On" : "Off";

      if (crosshairGroup) crosshairGroup.remove();
      crosshairGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", cx.toFixed(1)); line.setAttribute("y1", pad.top.toString());
      line.setAttribute("x2", cx.toFixed(1)); line.setAttribute("y2", (pad.top + plotH).toString());
      line.setAttribute("stroke", "rgba(255,255,255,0.75)");
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-dasharray", "4 3");

      const lblW = 64, lblH = 44;
      const lblX = Math.max(pad.left + lblW / 2, Math.min(W - pad.right - lblW / 2, cx));
      const lblY = pad.top + 1;

      const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bgRect.setAttribute("x",            (lblX - lblW / 2).toFixed(1));
      bgRect.setAttribute("y",            lblY.toFixed(1));
      bgRect.setAttribute("width",        lblW.toString());
      bgRect.setAttribute("height",       lblH.toString());
      bgRect.setAttribute("rx",           "6");
      bgRect.setAttribute("fill",         "rgba(0,0,0,0.80)");
      bgRect.setAttribute("stroke",       color);
      bgRect.setAttribute("stroke-width", "1.5");

      const valText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      valText.setAttribute("x",           lblX.toFixed(1));
      valText.setAttribute("y",           (lblY + 16).toFixed(1));
      valText.setAttribute("fill",        color);
      valText.setAttribute("font-size",   "14");
      valText.setAttribute("font-weight", "700");
      valText.setAttribute("text-anchor", "middle");
      valText.setAttribute("font-family", "-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif");
      valText.textContent = label;

      const timeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      timeText.setAttribute("x",           lblX.toFixed(1));
      timeText.setAttribute("y",           (lblY + 33).toFixed(1));
      timeText.setAttribute("fill",        "rgba(255,255,255,0.65)");
      timeText.setAttribute("font-size",   "12");
      timeText.setAttribute("font-weight", "500");
      timeText.setAttribute("text-anchor", "middle");
      timeText.setAttribute("font-family", "-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif");
      timeText.textContent = fmtTime(t);

      crosshairGroup.appendChild(line);
      crosshairGroup.appendChild(bgRect);
      crosshairGroup.appendChild(valText);
      crosshairGroup.appendChild(timeText);
      svg.appendChild(crosshairGroup);
    };

    const clearCrosshair = () => {
      if (crosshairGroup) { crosshairGroup.remove(); crosshairGroup = null; }
    };

    svg.style.cursor = "crosshair";

    svg.addEventListener("touchstart", e => {
      e.stopPropagation(); e.preventDefault();
      const svgX = clientXtoSvgX(e.touches[0].clientX);
      if (svgX < pad.left || svgX > W - pad.right) return;
      isDragging = true; showCrosshair(svgX);
    }, { passive: false });

    svg.addEventListener("touchmove", e => {
      if (!isDragging) return;
      e.stopPropagation(); e.preventDefault();
      const svgX = clientXtoSvgX(e.touches[0].clientX);
      if (svgX >= pad.left && svgX <= W - pad.right) showCrosshair(svgX);
    }, { passive: false });

    svg.addEventListener("touchend",    e => { e.stopPropagation(); isDragging = false; clearCrosshair(); }, { passive: false });
    svg.addEventListener("touchcancel", ()  => { isDragging = false; clearCrosshair(); });

    svg.addEventListener("mouseenter", () => {});
    svg.addEventListener("mousemove",  e => { showCrosshair(clientXtoSvgX(e.clientX)); });
    svg.addEventListener("mouseleave", clearCrosshair);
  }

  _attachGraphCrosshair(svg, values, times) {
    const cfg       = this._config;
    const lineColor = cfg.graph_color || "#007AFF";
    const W = 400, H = 160;
    const pad   = { top: 6, right: 8, bottom: 20, left: 30 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top  - pad.bottom;

    const rawMin = Math.min(...values), rawMax = Math.max(...values);
    const vpad   = (rawMax - rawMin) * 0.2 || 1;
    const min    = rawMin - vpad, max = rawMax + vpad, range = max - min;

    let crosshairGroup = null;

    const fmtTime = ts => {
      if (!ts) return "";
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
    };

    const clientXtoSvgX = clientX => {
      const rect = svg.getBoundingClientRect();
      return (clientX - rect.left) * (W / rect.width);
    };

    const showCrosshair = svgX => {
      const cx       = Math.max(pad.left, Math.min(W - pad.right, svgX));
      const xRatio   = (cx - pad.left) / plotW;
      const exactIdx = xRatio * (values.length - 1);
      const lIdx     = Math.floor(exactIdx);
      const rIdx     = Math.min(lIdx + 1, values.length - 1);
      const frac     = exactIdx - lIdx;
      const val      = values[lIdx] + (values[rIdx] - values[lIdx]) * frac;
      const decimals = cfg.decimals !== undefined ? Math.min(cfg.decimals, 2) : 1;
      const label    = val.toFixed(decimals);
      const snapIdx  = frac < 0.5 ? lIdx : rIdx;
      const timeStr  = times ? fmtTime(times[snapIdx]) : "";
      const hasTime  = timeStr.length > 0;

      if (crosshairGroup) crosshairGroup.remove();
      crosshairGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", cx.toFixed(1)); line.setAttribute("y1", pad.top.toString());
      line.setAttribute("x2", cx.toFixed(1)); line.setAttribute("y2", (pad.top + plotH).toString());
      line.setAttribute("stroke", "rgba(255,255,255,0.75)");
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-dasharray", "4 3");

      const lblW = hasTime ? 68 : 62, lblH = hasTime ? 46 : 28;
      const lblX = Math.max(pad.left + lblW / 2, Math.min(W - pad.right - lblW / 2, cx));
      const lblY = pad.top + 1;

      const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bgRect.setAttribute("x",            (lblX - lblW / 2).toFixed(1));
      bgRect.setAttribute("y",            lblY.toFixed(1));
      bgRect.setAttribute("width",        lblW.toString());
      bgRect.setAttribute("height",       lblH.toString());
      bgRect.setAttribute("rx",           "6");
      bgRect.setAttribute("fill",         "rgba(0,0,0,0.80)");
      bgRect.setAttribute("stroke",       lineColor);
      bgRect.setAttribute("stroke-width", "1.5");

      const valText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      valText.setAttribute("x",           lblX.toFixed(1));
      valText.setAttribute("y",           (lblY + (hasTime ? 17 : 19)).toFixed(1));
      valText.setAttribute("fill",        lineColor);
      valText.setAttribute("font-size",   "19");
      valText.setAttribute("font-weight", "700");
      valText.setAttribute("text-anchor", "middle");
      valText.setAttribute("font-family", "-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif");
      valText.textContent = label;

      crosshairGroup.appendChild(line);
      crosshairGroup.appendChild(bgRect);
      crosshairGroup.appendChild(valText);

      if (hasTime) {
        const timeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        timeText.setAttribute("x",           lblX.toFixed(1));
        timeText.setAttribute("y",           (lblY + 38).toFixed(1));
        timeText.setAttribute("fill",        "rgba(255,255,255,0.65)");
        timeText.setAttribute("font-size",   "13");
        timeText.setAttribute("font-weight", "500");
        timeText.setAttribute("text-anchor", "middle");
        timeText.setAttribute("font-family", "-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif");
        timeText.textContent = timeStr;
        crosshairGroup.appendChild(timeText);
      }

      svg.appendChild(crosshairGroup);
    };

    const clearCrosshair = () => {
      if (crosshairGroup) { crosshairGroup.remove(); crosshairGroup = null; }
    };

    svg.style.cursor = "crosshair";
    let isDragging = false;

    // Touch
    svg.addEventListener("touchstart", e => {
      e.stopPropagation(); e.preventDefault();
      const svgX = clientXtoSvgX(e.touches[0].clientX);
      if (svgX < pad.left || svgX > W - pad.right) return;
      isDragging = true; showCrosshair(svgX);
    }, { passive: false });

    svg.addEventListener("touchmove", e => {
      if (!isDragging) return;
      e.stopPropagation(); e.preventDefault();
      const svgX = clientXtoSvgX(e.touches[0].clientX);
      if (svgX >= pad.left && svgX <= W - pad.right) showCrosshair(svgX);
    }, { passive: false });

    svg.addEventListener("touchend",    e => { e.stopPropagation(); isDragging = false; }, { passive: false });
    svg.addEventListener("touchcancel", ()  => { isDragging = false; });

    // Mouse
    svg.addEventListener("mousedown", e => {
      e.stopPropagation();
      const svgX = clientXtoSvgX(e.clientX);
      if (svgX < pad.left || svgX > W - pad.right) return;
      isDragging = true; showCrosshair(svgX);
    });
    svg.addEventListener("mousemove", e => {
      if (!isDragging) return;
      const svgX = clientXtoSvgX(e.clientX);
      if (svgX >= pad.left && svgX <= W - pad.right) showCrosshair(svgX);
    });
    svg.addEventListener("mouseup", e => {
      e.stopPropagation();
      if (!isDragging) return;
      isDragging = false;
      const svgX = clientXtoSvgX(e.clientX);
      if (svgX < pad.left || svgX > W - pad.right) clearCrosshair();
    });
    svg.addEventListener("mouseleave", () => { isDragging = false; });
    svg.addEventListener("click", e => {
      e.stopPropagation();
      const svgX = clientXtoSvgX(e.clientX);
      if (svgX < pad.left || svgX > W - pad.right) clearCrosshair();
    });
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

        /* ── Leopard-style colour grid ── */
        .colour-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 4px;
        }
        .colour-card {
          border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          transition: box-shadow 0.15s, border-color 0.15s;
          position: relative;
        }
        .colour-card:hover {
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          border-color: var(--primary-color, #03a9f4);
        }
        .colour-swatch {
          height: 44px;
          width: 100%;
          display: block;
          position: relative;
        }
        .colour-swatch input[type="color"] {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          border: none;
          padding: 0;
        }
        .colour-swatch-preview {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .colour-swatch::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(45deg, #ccc 25%, transparent 25%),
            linear-gradient(-45deg, #ccc 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ccc 75%),
            linear-gradient(-45deg, transparent 75%, #ccc 75%);
          background-size: 8px 8px;
          background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
          opacity: 0.3;
          pointer-events: none;
        }
        .colour-info {
          padding: 6px 8px 7px;
          background: var(--card-background-color, #fff);
        }
        .colour-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--primary-text-color);
          letter-spacing: 0.02em;
          margin-bottom: 1px;
        }
        .colour-desc {
          font-size: 10px;
          color: var(--secondary-text-color, #6b7280);
          margin-bottom: 4px;
          line-height: 1.3;
        }
        .colour-hex-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .colour-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.15);
          flex-shrink: 0;
        }
        .colour-hex {
          flex: 1;
          font-size: 11px;
          font-family: monospace;
          border: none;
          background: none;
          color: var(--secondary-text-color, #6b7280);
          padding: 0;
          width: 0;
          min-width: 0;
        }
        .colour-hex:focus {
          outline: none;
          color: var(--primary-text-color);
        }
        .colour-edit-icon {
          opacity: 0;
          transition: opacity 0.15s;
          color: var(--secondary-text-color);
          font-size: 14px;
          line-height: 1;
        }
        .colour-card:hover .colour-edit-icon { opacity: 1; }
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
            <div class="colour-grid" id="colour-grid"></div>
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

        <!-- ══ GRAPH ═══════════════════════════════════════════════════════ -->
        <div class="eec-section">
          <div class="eec-section-header">📈 History Graph</div>

          <div class="eec-field">
            <div class="eec-field-label">Default Time Range (hours)</div>
            <div class="eec-field-desc">
              How many hours of history to load when you tap the card. The 1h / 3h / 6h / 12h / 24h
              buttons inside the popup let you switch on the fly — this just sets the opening view.
            </div>
            <ha-selector id="sel-graph_hours"></ha-selector>
          </div>

          <div class="eec-field">
            <div class="eec-field-label">Graph Colour</div>
            <div class="eec-field-desc">
              The colour used for the graph line, gradient fill, dot, and crosshair tooltip.
            </div>
            <div class="colour-grid" id="graph-colour-grid" style="grid-template-columns:1fr;"></div>
          </div>
        </div>

      </div>
    `;

    this._attachSelectors();
    this._buildColourGrid(useStateColor);
    this._buildGraphColourGrid();
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
      transparency:     { selector: { number: { min: 0, max: 1, step: 0.1, mode: "slider" } }, value: cfg.transparency ?? 1 },
      graph_hours:      { selector: { number: { min: 1, max: 24, step: 1, mode: "box" } },   value: cfg.graph_hours     ?? 3 },
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
      transparency:     cfg.transparency     ?? 1,
      graph_hours:      cfg.graph_hours      ?? 3,
    };

    for (const [key, value] of Object.entries(valueMap)) {
      const el = this.querySelector(`#sel-${key}`);
      // Skip elements that are hidden (conditional fields) or the one that
      // is currently focused — updating its value would reset the cursor.
      if (!el || el.contains(document.activeElement)) continue;
      el.value = value;
    }
    this._syncColours();
  }

  // ── Build graph colour picker ──────────────────────────────────────────────
  _buildGraphColourGrid() {
    const grid = this.querySelector("#graph-colour-grid");
    if (!grid) return;

    const savedVal  = this._config.graph_color || "#007AFF";

    const card = document.createElement("div");
    card.className   = "colour-card";
    card.dataset.key = "graph_color";
    card.innerHTML = `
      <label class="colour-swatch">
        <div class="colour-swatch-preview" style="background:${savedVal}"></div>
        <input type="color" value="${/^#[0-9a-fA-F]{6}$/.test(savedVal) ? savedVal : "#007AFF"}">
      </label>
      <div class="colour-info">
        <div class="colour-label">Graph Line &amp; Fill</div>
        <div class="colour-desc">Colour of the history graph line, gradient fill, and crosshair tooltip.</div>
        <div class="colour-hex-row">
          <div class="colour-dot" style="background:${savedVal}"></div>
          <input class="colour-hex" type="text" value="${savedVal}" maxlength="7" placeholder="#007AFF" spellcheck="false">
          <span class="colour-edit-icon">✎</span>
        </div>
      </div>
    `;

    const nativePicker = card.querySelector("input[type=color]");
    const hexInput     = card.querySelector(".colour-hex");
    const preview      = card.querySelector(".colour-swatch-preview");
    const dot          = card.querySelector(".colour-dot");

    const apply = (hex) => {
      preview.style.background = hex;
      dot.style.background     = hex;
      nativePicker.value       = hex;
      hexInput.value           = hex;
      this._handleChange("graph_color", hex);
    };

    nativePicker.addEventListener("input",  () => apply(nativePicker.value));
    nativePicker.addEventListener("change", () => apply(nativePicker.value));
    hexInput.addEventListener("input", () => {
      const v = hexInput.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) apply(v);
    });
    hexInput.addEventListener("keydown", e => { if (e.key === "Enter") hexInput.blur(); });

    grid.appendChild(card);
  }

  // ── Build leopard-style colour grid ───────────────────────────────────────
  _buildColourGrid(useStateColor) {
    const grid = this.querySelector("#colour-grid");
    if (!grid) return;

    const fields = [
      ...ELEPHANT_COLOUR_FIELDS_BASE,
      ...(useStateColor ? [] : [ELEPHANT_COLOUR_FIELD_ICON]),
    ];

    for (const field of fields) {
      const savedVal  = this._config[field.key] || "";
      const swatchVal = savedVal || field.default;

      const card = document.createElement("div");
      card.className   = "colour-card";
      card.dataset.key = field.key;
      card.innerHTML = `
        <label class="colour-swatch">
          <div class="colour-swatch-preview" style="background:${swatchVal}"></div>
          <input type="color" value="${swatchVal}">
        </label>
        <div class="colour-info">
          <div class="colour-label">${field.label}</div>
          <div class="colour-desc">${field.description}</div>
          <div class="colour-hex-row">
            <div class="colour-dot" style="background:${swatchVal}"></div>
            <input class="colour-hex" type="text" value="${savedVal}"
              maxlength="7" placeholder="${field.default}" spellcheck="false">
            <span class="colour-edit-icon">✎</span>
          </div>
        </div>
      `;

      const nativePicker = card.querySelector("input[type=color]");
      const hexInput     = card.querySelector(".colour-hex");
      const preview      = card.querySelector(".colour-swatch-preview");
      const dot          = card.querySelector(".colour-dot");

      const apply = (hex) => {
        preview.style.background = hex;
        dot.style.background     = hex;
        nativePicker.value       = hex;
        hexInput.value           = hex;
        this._handleChange(field.key, hex);
      };

      nativePicker.addEventListener("input",  () => apply(nativePicker.value));
      nativePicker.addEventListener("change", () => apply(nativePicker.value));

      hexInput.addEventListener("input", () => {
        const v = hexInput.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) apply(v);
      });
      hexInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") hexInput.blur();
      });

      grid.appendChild(card);
    }
  }

  // ── Sync colour swatches from config (no re-render) ────────────────────────
  _syncColours() {
    const useStateColor = this._config.state_color !== false;
    const fields = [
      ...ELEPHANT_COLOUR_FIELDS_BASE,
      ...(useStateColor ? [] : [ELEPHANT_COLOUR_FIELD_ICON]),
    ];
    for (const field of fields) {
      const card = this.querySelector(`.colour-card[data-key="${field.key}"]`);
      if (!card) continue;
      const savedVal  = this._config[field.key] || "";
      const swatchVal = savedVal || field.default;
      card.querySelector(".colour-swatch-preview").style.background = swatchVal;
      card.querySelector(".colour-dot").style.background            = swatchVal;
      card.querySelector("input[type=color]").value                 = swatchVal;
      card.querySelector(".colour-hex").value                       = savedVal;
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
