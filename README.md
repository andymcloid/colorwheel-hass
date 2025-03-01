## Color Wheel

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/hacs/integration)

A simple card to display the color value of an entity in Home Assistant. This card can interpret different color formats including hex, RGB, and array notation.

![colorwheel screenshot](https://raw.githubusercontent.com/andymcloid/colorwheel-hass-integration/refs/heads/main/screenshot.png)

For installation instructions, see [this guide](https://github.com/thomasloven/hass-config/wiki/Lovelace-Plugins).

# Installation

## HACS

The easiest way to add this to your Homeassistant installation is using [HACS]. 

It's recommended to restart Homeassistent directly after the installation without any change to the Configuration. 
Homeassistent will install the dependencies during the next reboot. After that you can add and check the configuration without error messages. 
This is nothing special to this Integration but the same for all custom components.

## Configuration

To use this card, you can add it via the Lovelace UI or manually in YAML:

```yaml
type: 'custom:color-wheel-card'
title: Color Display
entity: light.living_room_rgb
format: auto
```

## Options

### Card
| Name         | Type    | Default        | Description |
| ------------ | ------- | -------------- | ----------- |
| type         | string  |                | `custom:color-wheel-card`
| title        | string  | `Color Wheel`  | Title of the card
| entity       | string  |                | Entity ID whose state contains a color value
| format       | string  | `auto`         | Format of the color value (auto, hex, rgb, array)

### Supported Color Formats
| Format | Example                | Description |
| ------ | ---------------------- | ----------- |
| hex    | `#FF0000` or `FF0000`  | Hexadecimal color notation
| rgb    | `rgb(255, 0, 0)`       | RGB function notation
| array  | `[255, 0, 0]`          | JSON array notation