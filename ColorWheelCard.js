export class ColorWheelCard extends HTMLElement {
    constructor() {
        super();
        this._selectedColor = null;
        this._currentFormat = 'auto';
        this._entityId = null;
        this._wheelRadius = 150;
        this._isDragging = false;
    }

    set hass(hass) {
        this._hass = hass;
        if (!this.content) {
            this._initializeCard();
        }

        // Get the entity from config
        this._entityId = this.config.entity;
        
        if (!this._entityId || !this._hass.states[this._entityId]) {
            this.content.innerHTML = `
                <div class="color-error">
                    Entity not found or not specified
                </div>
            `;
            return;
        }

        const entityState = this._hass.states[this._entityId].state;
        this._currentFormat = this.config.format || 'auto';
        
        // Parse the color based on format
        const color = this.parseColor(entityState, this._currentFormat);
        
        if (!color) {
            this.content.innerHTML = `
                <div class="color-error">
                    Unable to parse color: ${entityState}
                </div>
            `;
            return;
        }

        // Update the UI with the current color
        this._updateUI(color, entityState);
    }

    _initializeCard() {
        const card = document.createElement('ha-card');
        card.header = this.config.title || 'Color Wheel';
        this.content = document.createElement('div');
        this.content.style.padding = '0 16px 16px';
        card.appendChild(this.content);
        this.appendChild(card);
    }

    _updateUI(color, entityState) {
        // Extract RGB values from the color
        let r, g, b;
        if (color.startsWith('#')) {
            const hex = color.substring(1);
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else if (color.startsWith('rgb')) {
            const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                [, r, g, b] = match.map(Number);
            }
        }

        this._selectedColor = { r, g, b };
        
        // Convert RGB to HSV for the color wheel
        const hsv = this._rgbToHsv(r, g, b);
        
        this.content.innerHTML = `
            <style>
                .color-wheel-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .color-wheel {
                    position: relative;
                    width: ${this._wheelRadius * 2}px;
                    height: ${this._wheelRadius * 2}px;
                    border-radius: 50%;
                    margin: 20px 0;
                    cursor: pointer;
                    background: conic-gradient(
                        red, yellow, lime, cyan, blue, magenta, red
                    );
                }
                .color-wheel::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 20%;
                    height: 20%;
                    border-radius: 50%;
                    background: white;
                    box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
                }
                .color-selector {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                    background-color: ${color};
                }
                .color-display {
                    width: 100%;
                    height: 60px;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    background-color: ${color};
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                }
                .color-value {
                    font-family: var(--paper-font-body1_-_font-family);
                    padding: 8px;
                    text-align: center;
                    font-size: 14px;
                    color: var(--primary-text-color);
                }
                .color-error {
                    color: var(--error-color);
                    padding: 8px;
                }
                .update-button {
                    background-color: var(--primary-color);
                    color: var(--text-primary-color);
                    border: none;
                    border-radius: 4px;
                    padding: 8px 16px;
                    font-size: 14px;
                    cursor: pointer;
                    margin-top: 10px;
                    transition: background-color 0.3s;
                }
                .update-button:hover {
                    background-color: var(--dark-primary-color);
                }
            </style>
            <div class="color-wheel-container">
                <div class="color-wheel" id="colorWheel">
                    <div class="color-selector" id="colorSelector" style="left: ${this._wheelRadius + Math.cos(hsv.h * Math.PI / 180) * hsv.s * this._wheelRadius * 0.8}px; top: ${this._wheelRadius - Math.sin(hsv.h * Math.PI / 180) * hsv.s * this._wheelRadius * 0.8}px;"></div>
                </div>
                <div class="color-display"></div>
                <div class="color-value">${entityState}</div>
                <button class="update-button" id="updateButton">Update Entity</button>
            </div>
        `;

        // Add event listeners after the content is rendered
        this._addEventListeners();
    }

    _addEventListeners() {
        const colorWheel = this.content.querySelector('#colorWheel');
        const updateButton = this.content.querySelector('#updateButton');
        
        // Color wheel events
        colorWheel.addEventListener('mousedown', this._onMouseDown.bind(this));
        document.addEventListener('mousemove', this._onMouseMove.bind(this));
        document.addEventListener('mouseup', this._onMouseUp.bind(this));
        
        // Touch events for mobile
        colorWheel.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this._onTouchEnd.bind(this));
        
        // Update button
        updateButton.addEventListener('click', this._updateEntityValue.bind(this));
    }

    _onMouseDown(event) {
        this._isDragging = true;
        this._updateColorFromEvent(event);
    }

    _onMouseMove(event) {
        if (this._isDragging) {
            this._updateColorFromEvent(event);
        }
    }

    _onMouseUp() {
        this._isDragging = false;
    }

    _onTouchStart(event) {
        event.preventDefault();
        this._isDragging = true;
        this._updateColorFromEvent(event.touches[0]);
    }

    _onTouchMove(event) {
        if (this._isDragging) {
            event.preventDefault();
            this._updateColorFromEvent(event.touches[0]);
        }
    }

    _onTouchEnd() {
        this._isDragging = false;
    }

    _updateColorFromEvent(event) {
        const colorWheel = this.content.querySelector('#colorWheel');
        const colorSelector = this.content.querySelector('#colorSelector');
        const colorDisplay = this.content.querySelector('.color-display');
        
        const rect = colorWheel.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate position relative to center
        const x = event.clientX - rect.left - centerX;
        const y = centerY - (event.clientY - rect.top);
        
        // Calculate angle (hue) and distance (saturation)
        let angle = Math.atan2(y, x) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        
        const distance = Math.min(Math.sqrt(x * x + y * y), this._wheelRadius);
        const saturation = distance / this._wheelRadius;
        
        // Convert HSV to RGB
        const rgb = this._hsvToRgb(angle, saturation, 1);
        this._selectedColor = rgb;
        
        // Update selector position
        const selectorX = centerX + Math.cos(angle * Math.PI / 180) * saturation * this._wheelRadius * 0.8;
        const selectorY = centerY - Math.sin(angle * Math.PI / 180) * saturation * this._wheelRadius * 0.8;
        
        colorSelector.style.left = `${selectorX}px`;
        colorSelector.style.top = `${selectorY}px`;
        
        // Update color display
        const colorValue = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        colorSelector.style.backgroundColor = colorValue;
        colorDisplay.style.backgroundColor = colorValue;
    }

    _updateEntityValue() {
        if (!this._selectedColor || !this._entityId) return;
        
        // Format the color according to the configured format
        let formattedColor;
        switch (this._currentFormat) {
            case 'hex':
                formattedColor = this._rgbToHex(this._selectedColor.r, this._selectedColor.g, this._selectedColor.b);
                break;
            case 'rgb':
                formattedColor = `rgb(${this._selectedColor.r}, ${this._selectedColor.g}, ${this._selectedColor.b})`;
                break;
            case 'array':
                formattedColor = `[${this._selectedColor.r}, ${this._selectedColor.g}, ${this._selectedColor.b}]`;
                break;
            case 'auto':
                // Use the format of the current entity value
                const entityState = this._hass.states[this._entityId].state;
                if (entityState.startsWith('#')) {
                    formattedColor = this._rgbToHex(this._selectedColor.r, this._selectedColor.g, this._selectedColor.b);
                } else if (entityState.startsWith('rgb')) {
                    formattedColor = `rgb(${this._selectedColor.r}, ${this._selectedColor.g}, ${this._selectedColor.b})`;
                } else if (entityState.startsWith('[')) {
                    formattedColor = `[${this._selectedColor.r}, ${this._selectedColor.g}, ${this._selectedColor.b}]`;
                } else {
                    // Default to hex if can't determine
                    formattedColor = this._rgbToHex(this._selectedColor.r, this._selectedColor.g, this._selectedColor.b);
                }
                break;
            default:
                formattedColor = this._rgbToHex(this._selectedColor.r, this._selectedColor.g, this._selectedColor.b);
        }
        
        // Call service to update entity
        this._hass.callService('input_text', 'set_value', {
            entity_id: this._entityId,
            value: formattedColor
        }).catch(error => {
            console.error('Failed to update entity:', error);
            // Try alternative service if input_text fails
            this._hass.callService('homeassistant', 'update_entity', {
                entity_id: this._entityId,
                new_state: formattedColor
            }).catch(err => {
                console.error('Failed to update entity with alternative method:', err);
            });
        });
    }

    // Color conversion utilities
    _rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    }

    _rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        
        let h;
        if (d === 0) h = 0;
        else if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        
        const s = max === 0 ? 0 : d / max;
        const v = max;
        
        return { h, s, v };
    }

    _hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        
        let r, g, b;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    parseColor(value, format) {
        // Auto-detect format if set to auto
        if (format === 'auto') {
            if (value.startsWith('#')) {
                format = 'hex';
            } else if (value.startsWith('rgb')) {
                format = 'rgb';
            } else if (value.startsWith('[') && value.endsWith(']')) {
                format = 'array';
            } else {
                return null; // Unable to auto-detect
            }
        }

        // Parse based on format
        switch (format) {
            case 'hex':
                return value.startsWith('#') ? value : `#${value}`;
            
            case 'rgb':
                return value;
            
            case 'array':
                try {
                    const colorArray = JSON.parse(value);
                    if (Array.isArray(colorArray) && colorArray.length >= 3) {
                        return `rgb(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]})`;
                    }
                } catch (e) {
                    // Invalid JSON
                }
                return null;
            
            default:
                return null;
        }
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error('You need to define an entity');
        }
        this.config = config;
    }

    static getConfigElement() {
        return document.createElement("color-wheel-editor");
    }

    static getStubConfig() {
        return {
            entity: '',
            format: 'auto'
        };
    }

    getCardSize() {
        return 4;
    }

    // Clean up event listeners when the element is removed
    disconnectedCallback() {
        document.removeEventListener('mousemove', this._onMouseMove.bind(this));
        document.removeEventListener('mouseup', this._onMouseUp.bind(this));
        document.removeEventListener('touchmove', this._onTouchMove.bind(this));
        document.removeEventListener('touchend', this._onTouchEnd.bind(this));
    }
}