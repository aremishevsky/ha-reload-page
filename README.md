# Reload Page for Home Assistant

A dashboard card that reloads the browser page on a timer and shows the countdown as a progress bar, a title (`Reload in 16m`), or both.

Useful for wall tablets and always-open dashboards: some custom cards (charts in particular) slowly leak memory and load the CPU when a page stays open for hours, and a periodic reload brings the page back to a clean state.

## Install

1. HACS → ⋮ → **Custom repositories** → add `https://github.com/aremishevsky/ha-reload-page`, type **Integration**.
2. Install **Reload Page** and restart Home Assistant.
3. Settings → Devices & services → **Add integration** → **Reload Page**.

The integration serves the card and loads it on every dashboard, so you don't add a dashboard resource by hand.

## Card

Edit dashboard → **Add card** → **Reload Page**. All options are in the visual editor.

```yaml
type: custom:reload-page-card
interval: 30                 # minutes between reloads
display: bar                 # bar | title | both
title: Page reload           # header title (title / both)
show_title: true             # false = countdown chip only
label: Reload in             # countdown chip text before the time left
bar_height: 4                # px
bar_color: var(--primary-color)
bar_background: var(--divider-color)
rounded: true
background: false            # false = transparent card, no border
bar_match_chip: false        # true = bar uses the countdown colors below
warn_at: 50                  # % of the interval left: below this the countdown turns orange
alert_at: 15                 # ... and red below this
color_ok: var(--success-color, #4caf50)
color_warn: var(--warning-color, #ff9800)
color_alert: var(--error-color, #f44336)
color_paused: var(--info-color, #039be5)
```

How it works:

- The timer counts from the page load, so every card on the page shows the same countdown. With several cards, the shortest `interval` wins.
- `title` / `both` show a header: your title on the left and a countdown chip on the right. The chip is green while more than `warn_at`% of the interval is left, orange below that, red below `alert_at`%, and blue while reloading is paused. Hover it for the exact reload time; tap it to reload right away (works in edit mode too).
- Changing `interval` restarts the countdown.
- The chip shows the time left in whole minutes: `30m+` when there are more than 30 minutes left, then `29m` … `1m`, and `less 1m` in the last minute.
- The bar is a single CSS animation; nothing runs in JavaScript between title updates (once a minute).
- While the dashboard is in edit mode the page is not reloaded; the card checks again every 15 seconds.
