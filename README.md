## Color Wheel

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/hacs/integration)

An interactive color wheel card for Home Assistant that allows you to visualize and select colors for your entities. This card can interpret and update different color formats including hex, RGB, and array notation.

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
title: Color Wheel
entity: input_text.my_color
format: auto
```

## Features

- Interactive color wheel for intuitive color selection
- Supports multiple color formats (hex, RGB, array)
- Auto-detects the format of your entity's color value
- Updates entity values automatically when you select a color
- Works with input_text and other entity types that can store text values

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

## Usage

1. Add the card to your dashboard
2. Select an entity that can store text values (like input_text)
3. Choose the color format you want to use
4. Use the color wheel to select colors - the entity will update automatically when you release the mouse or lift your finger