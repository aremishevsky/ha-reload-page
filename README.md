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
label: Reload in             # title text before the time left
bar_height: 4                # px
bar_color: var(--primary-color)
bar_background: var(--divider-color)
rounded: true
background: false            # false = transparent card, no border
```

How it works:

- The timer counts from the page load, so every card on the page shows the same countdown. With several cards, the shortest `interval` wins.
- The title shows the time left in whole minutes: `30m+` when there are more than 30 minutes left, then `29m` … `1m`, and `less 1m` in the last minute.
- The bar is a single CSS animation; nothing runs in JavaScript between title updates (once a minute).
- While the dashboard is in edit mode the page is not reloaded; the card checks again every 15 seconds.
