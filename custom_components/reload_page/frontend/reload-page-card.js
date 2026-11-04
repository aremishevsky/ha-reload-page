/* Reload Page Lovelace card — served by the reload_page integration. */
const CARD = "reload-page-card";
const DEFAULTS = {
  interval: 30, // minutes
  display: "bar", // bar | title | both
  title: "Page reload",
  label: "Reload in",
  bar_height: 4, // px
  bar_color: "var(--primary-color)",
  bar_background: "var(--divider-color)",
  rounded: true,
  background: false,
};
const LABEL_CAP = 30; // minutes; more than this is shown as "30m+"
// Chip color by the share of the interval left: green, then orange, then red.
const CHIP_WARN = 0.5;
const CHIP_ALERT = 0.15;
const EDIT_RETRY = 15e3; // while the dashboard is being edited, check again after this

const I18N = {
  en: {
    less: "less 1m",
    paused: "Reload paused while editing",
    paused_short: "Paused",
    at: "Reload at {time}",
    editor: {
      interval: "Reload every (minutes)",
      display: "Show",
      display_bar: "Progress bar",
      display_title: "Title with countdown",
      display_both: "Title, countdown and progress bar",
      title: "Title",
      label: "Countdown text",
      bar_height: "Bar thickness (px)",
      bar_color: "Bar color",
      bar_background: "Bar track color",
      rounded: "Rounded bar",
      background: "Card background",
      color_hint: "Any CSS color, e.g. #03a9f4 or var(--accent-color)",
    },
  },
  uk: {
    less: "less 1m",
    paused: "Оновлення на паузі під час редагування",
    paused_short: "Пауза",
    at: "Оновлення о {time}",
    editor: {
      interval: "Оновлювати кожні (хвилин)",
      display: "Показувати",
      display_bar: "Прогрес-бар",
      display_title: "Заголовок з відліком",
      display_both: "Заголовок, відлік і прогрес-бар",
      title: "Заголовок",
      label: "Текст відліку",
      bar_height: "Товщина бару (px)",
      bar_color: "Колір бару",
      bar_background: "Колір доріжки бару",
      rounded: "Закруглений бар",
      background: "Фон картки",
      color_hint: "Будь-який CSS-колір, напр. #03a9f4 або var(--accent-color)",
    },
  },
};

const lang = (hass) => {
  const l = (hass?.locale?.language || hass?.language || "en").slice(0, 2);
  return I18N[l] ? l : "en";
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const minutes = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? n : DEFAULTS.interval;
};

// One page-wide timer, counted from the page load: every card shows the same countdown.
const timer = (window.__reloadPageTimer ||= {
  start: performance.timeOrigin,
  interval: null, // minutes; the shortest one of the cards on screen, kept after they leave
  cards: new Map(),
  handle: null,

  deadline() {
    return this.start + this.interval * 6e4;
  },

  register(card, interval) {
    this.cards.set(card, interval);
    this._update();
  },

  unregister(card) {
    // An editor preview closing must not leave its interval behind.
    this.cards.delete(card);
    this._update();
  },

  _update() {
    if (!this.cards.size) return;
    const next = Math.min(...this.cards.values());
    if (next === this.interval) return;
    this.interval = next;
    this._schedule(this.deadline() - Date.now());
    this.cards.forEach((_, card) => card._sync());
  },

  _schedule(ms) {
    clearTimeout(this.handle);
    this.handle = setTimeout(() => this._fire(), Math.max(ms, 0));
  },

  _fire() {
    if (editing()) {
      this.cards.forEach((_, card) => card._sync());
      this._schedule(EDIT_RETRY);
      return;
    }
    location.reload();
  },
});

// Dashboard edit mode: never reload under the user's hands.
function editing() {
  if (new URLSearchParams(location.search).has("edit")) return true;
  const main = document.querySelector("home-assistant")?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot;
  const root = main?.querySelector("ha-panel-lovelace")?.shadowRoot?.querySelector("hui-root");
  return !!root?.lovelace?.editMode;
}

function remainingLabel(ms, t) {
  if (ms < 6e4) return t.less;
  const m = Math.ceil(ms / 6e4);
  return m > LABEL_CAP ? `${LABEL_CAP}m+` : `${m}m`;
}

class ReloadPageCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() {
    return document.createElement(`${CARD}-editor`);
  }

  static getStubConfig() {
    return { interval: DEFAULTS.interval, display: DEFAULTS.display };
  }

  setConfig(config) {
    this._config = { ...DEFAULTS, ...config, interval: minutes(config.interval) };
    this._render();
    if (this.isConnected) timer.register(this, this._config.interval);
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._render();
  }

  connectedCallback() {
    if (this._config) timer.register(this, this._config.interval);
    this._sync();
  }

  disconnectedCallback() {
    timer.unregister(this);
    clearTimeout(this._labelTimer);
  }

  getCardSize() {
    return 1;
  }

  getGridOptions() {
    return { columns: "full", rows: "auto", min_rows: 1 };
  }

  _render() {
    if (!this._config) return;
    const c = this._config;
    const showTitle = c.display !== "bar";
    const showBar = c.display !== "title";
    const radius = c.rounded ? `${c.bar_height / 2}px` : "0";
    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: ${showTitle ? (c.background ? "12px 16px" : "4px 0") : "4px 0"}; overflow: hidden; }
        ha-card.flat { background: none; border: none; box-shadow: none; }
        .header { display: flex; align-items: center; gap: 8px; }
        .header .title { flex: 1; font-size: 1.2em; font-weight: 500; }
        .chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 12px;
          font-size: .85em; white-space: nowrap; background: var(--secondary-background-color); color: var(--primary-text-color); }
        .chip.ok { background: rgba(76,175,80,.15); color: var(--success-color, #4caf50); }
        .chip.warn { background: rgba(255,152,0,.15); color: var(--warning-color, #ff9800); }
        .chip.alert { background: rgba(244,67,54,.15); color: var(--error-color, #f44336); }
        .chip.paused { background: rgba(3,155,229,.15); color: var(--info-color, #039be5); }
        .chip ha-icon { --mdc-icon-size: 16px; }
        .header + .track { margin-top: 8px; }
        .track { height: ${Number(c.bar_height) || DEFAULTS.bar_height}px; background: ${c.bar_background};
          border-radius: ${radius}; overflow: hidden; }
        .fill { height: 100%; background: ${c.bar_color}; border-radius: ${radius};
          transform-origin: left; transform: scaleX(0); will-change: transform; }
        @keyframes reload-page-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      </style>
      <ha-card class="${c.background ? "" : "flat"}">
        ${showTitle ? `<div class="header"><div class="title">${esc(c.title)}</div>
          <span class="chip"><ha-icon icon="mdi:refresh"></ha-icon><span class="left"></span></span></div>` : ""}
        ${showBar ? `<div class="track"><div class="fill"></div></div>` : ""}
      </ha-card>`;
    this._sync();
  }

  // Bar is a single CSS animation from page load to the deadline, so no JS runs per frame;
  // the title is redrawn once a minute.
  _sync() {
    if (!this._config || timer.interval === null) return;
    const now = Date.now();
    const total = timer.interval * 6e4;
    const left = timer.deadline() - now;
    const t = I18N[lang(this._hass)];

    const fill = this.shadowRoot.querySelector(".fill");
    if (fill) {
      fill.style.animation = "none";
      if (left > 0) {
        void fill.offsetWidth; // restart the animation with the new timing
        fill.style.animation = `reload-page-fill ${total}ms linear ${-(total - left)}ms forwards`;
      } else {
        fill.style.transform = "scaleX(1)";
      }
    }

    const chip = this.shadowRoot.querySelector(".chip");
    clearTimeout(this._labelTimer);
    if (chip) {
      const share = left / total;
      const cls = left <= 0 ? "paused" : share > CHIP_WARN ? "ok" : share > CHIP_ALERT ? "warn" : "alert";
      chip.className = `chip ${cls}`;
      chip.querySelector(".left").textContent =
        left > 0 ? `${this._config.label} ${remainingLabel(left, t)}`.trim() : t.paused_short;
      const at = new Date(timer.deadline()).toLocaleTimeString(this._hass?.locale?.language, { hour: "2-digit", minute: "2-digit" });
      chip.title = left > 0 ? t.at.replace("{time}", at) : t.paused;
      if (left > 0) this._labelTimer = setTimeout(() => this._sync(), (left % 6e4 || 6e4) + 50);
    }
  }
}

class ReloadPageCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.addEventListener("change", (ev) => this._onChange(ev));
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._render();
  }

  _render() {
    if (!this._config) return;
    const t = I18N[lang(this._hass)].editor;
    const c = { ...DEFAULTS, ...this._config };
    const display = [["bar", t.display_bar], ["title", t.display_title], ["both", t.display_both]];
    const color = (field) => {
      const v = c[field];
      const hex = /^#[0-9a-f]{6}$/i.test(v) ? v : "#03a9f4";
      return `<div class="color">
          <input type="color" data-pick="${field}" value="${hex}">
          <input type="text" data-field="${field}" value="${esc(v)}">
        </div>`;
    };

    this.shadowRoot.innerHTML = `
      <style>
        label { display: block; margin: 12px 0 4px; color: var(--secondary-text-color); font-size: .9em; }
        input[type=text], input[type=number], select { width: 100%; box-sizing: border-box; padding: 8px; border-radius: 6px;
          border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
        .color { display: flex; gap: 8px; align-items: center; }
        .color input[type=color] { width: 40px; height: 36px; padding: 0; border: none; background: none; cursor: pointer; }
        .hint { font-size: .8em; color: var(--secondary-text-color); margin-top: 4px; }
        .check { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
      </style>
      <label>${t.interval}</label>
      <input type="number" min="1" step="1" data-field="interval" value="${esc(c.interval)}">
      <label>${t.display}</label>
      <select data-field="display">
        ${display.map(([v, l]) => `<option value="${v}" ${c.display === v ? "selected" : ""}>${l}</option>`).join("")}
      </select>
      ${c.display !== "bar" ? `<label>${t.title}</label>
        <input type="text" data-field="title" value="${esc(c.title)}">
        <label>${t.label}</label>
        <input type="text" data-field="label" value="${esc(c.label)}">` : ""}
      ${c.display !== "title" ? `<label>${t.bar_height}</label>
        <input type="number" min="1" max="40" step="1" data-field="bar_height" value="${esc(c.bar_height)}">
        <label>${t.bar_color}</label>
        ${color("bar_color")}
        <label>${t.bar_background}</label>
        ${color("bar_background")}
        <div class="hint">${t.color_hint}</div>
        <div class="check"><input type="checkbox" data-field="rounded" ${c.rounded ? "checked" : ""}><span>${t.rounded}</span></div>` : ""}
      <div class="check"><input type="checkbox" data-field="background" ${c.background ? "checked" : ""}><span>${t.background}</span></div>`;
  }

  _onChange(ev) {
    const el = ev.target;
    const field = el.dataset.field || el.dataset.pick;
    if (!field) return;
    let value = el.type === "checkbox" ? el.checked : el.value;
    if (el.type === "number") value = Number(value);
    if (value === "" || value === DEFAULTS[field]) delete this._config[field];
    else this._config[field] = value;
    if (field === "interval") this._config.interval = minutes(value);
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    this._render();
  }
}

customElements.get(CARD) || customElements.define(CARD, ReloadPageCard);
customElements.get(`${CARD}-editor`) || customElements.define(`${CARD}-editor`, ReloadPageCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === CARD)) {
  window.customCards.push({
    type: CARD,
    name: "Reload Page",
    description: "Reloads the dashboard page on a timer; shows the countdown as a progress bar or a title.",
    preview: true,
  });
}
