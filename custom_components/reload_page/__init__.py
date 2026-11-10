"""Reload Page: a dashboard card that reloads the page on a timer."""
from __future__ import annotations

from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .const import CARD_URL, CONTENT_CARD_URL, DOMAIN

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Serve the Lovelace cards and load them on every dashboard."""
    frontend = Path(__file__).parent / "frontend"
    cards = {CARD_URL: "reload-page-card.js", CONTENT_CARD_URL: "reload-content-card.js"}
    await hass.http.async_register_static_paths(
        [StaticPathConfig(url, str(frontend / name), False) for url, name in cards.items()]
    )
    version = (await async_get_integration(hass, DOMAIN)).version
    for url in cards:
        add_extra_js_url(hass, f"{url}?v={version}")
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # Nothing to set up per entry: the entry only makes Home Assistant load the integration.
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return True
