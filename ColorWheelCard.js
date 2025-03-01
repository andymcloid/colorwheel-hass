export class ColorWheelCard extends HTMLElement {
    constructor() {
        super();
        this._selectedColor = null;
        this._currentFormat = 'auto';
        this._entityId = null;
        this._wheelRadius = 150;
        this._isDragging = false;
        
        // Bind event handlers once to prevent memory leaks
        this._boundOnMouseDown = this._onMouseDown.bind(this);
        this._boundOnMouseMove = this._onMouseMove.bind(this);
        this._boundOnMouseUp = this._onMouseUp.bind(this);
        this._boundOnTouchStart = this._onTouchStart.bind(this);
        this._boundOnTouchMove = this._onTouchMove.bind(this);
        this._boundOnTouchEnd = this._onTouchEnd.bind(this);
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
        
        // For the initial position, we need to convert back from the angle adjustment
        // that we use in _updateColorFromEvent
        // First, subtract the 90° rotation
        let displayAngle = (hsv.h - 90) % 360;
        if (displayAngle < 0) displayAngle += 360;
        
        // Then invert the angle
        displayAngle = (360 - displayAngle) % 360;
        
        // Calculate selector position
        const selectorX = this._wheelRadius + Math.cos(displayAngle * Math.PI / 180) * hsv.s * this._wheelRadius * 0.95;
        const selectorY = this._wheelRadius - Math.sin(displayAngle * Math.PI / 180) * hsv.s * this._wheelRadius * 0.95;
        
        this.content.innerHTML = `
            <style>
                .color-wheel-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .wheel-wrapper {
                    position: relative;
                    width: ${this._wheelRadius * 2 + 30}px;
                    height: ${this._wheelRadius * 2 + 30}px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 20px 0;
                }
                .outer-circle {
                    position: absolute;
                    width: ${this._wheelRadius * 2 + 30}px;
                    height: ${this._wheelRadius * 2 + 30}px;
                    border-radius: 50%;
                    background-color: ${color};
                    z-index: 1;
                }
                .color-wheel {
                    position: relative;
                    width: ${this._wheelRadius * 2}px;
                    height: ${this._wheelRadius * 2}px;
                    border-radius: 50%;
                    cursor: pointer;
                    background: conic-gradient(
                        hsl(0, 100%, 50%),   /* Red */
                        hsl(60, 100%, 50%),  /* Yellow */
                        hsl(120, 100%, 50%), /* Green */
                        hsl(180, 100%, 50%), /* Cyan */
                        hsl(240, 100%, 50%), /* Blue */
                        hsl(300, 100%, 50%), /* Magenta */
                        hsl(360, 100%, 50%)  /* Red again */
                    );
                    border: 5px solid white;
                    box-sizing: border-box;
                    z-index: 2;
                }
                .color-wheel::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 5%;
                    height: 5%;
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
                    z-index: 3;
                    left: ${selectorX}px;
                    top: ${selectorY}px;
                }
                .color-value {
                    font-family: var(--paper-font-body1_-_font-family);
                    padding: 8px;
                    text-align: center;
                    font-size: 14px;
                    color: var(--primary-text-color);
                    margin-top: 10px;
                }
                .color-error {
                    color: var(--error-color);
                    padding: 8px;
                }
            </style>
            <div class="color-wheel-container">
                <div class="wheel-wrapper">
                    <div class="outer-circle"></div>
                    <div class="color-wheel" id="colorWheel">
                        <div class="color-selector" id="colorSelector"></div>
                    </div>
                </div>
                <div class="color-value">${entityState}</div>
            </div>
        `;

        // Add event listeners after the content is rendered
        this._addEventListeners();
    }

    _addEventListeners() {
        const colorWheel = this.content.querySelector('#colorWheel');
        if (!colorWheel) return;
        
        // Remove any existing listeners first
        this._removeEventListeners();
        
        // Color wheel events
        colorWheel.addEventListener('mousedown', this._boundOnMouseDown);
        document.addEventListener('mousemove', this._boundOnMouseMove);
        document.addEventListener('mouseup', this._boundOnMouseUp);
        
        // Touch events for mobile
        colorWheel.addEventListener('touchstart', this._boundOnTouchStart, { passive: false });
        document.addEventListener('touchmove', this._boundOnTouchMove, { passive: false });
        document.addEventListener('touchend', this._boundOnTouchEnd);
    }
    
    _removeEventListeners() {
        const colorWheel = this.content.querySelector('#colorWheel');
        if (colorWheel) {
            colorWheel.removeEventListener('mousedown', this._boundOnMouseDown);
            colorWheel.removeEventListener('touchstart', this._boundOnTouchStart);
        }
        
        document.removeEventListener('mousemove', this._boundOnMouseMove);
        document.removeEventListener('mouseup', this._boundOnMouseUp);
        document.removeEventListener('touchmove', this._boundOnTouchMove);
        document.removeEventListener('touchend', this._boundOnTouchEnd);
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
        // Update entity value when mouse is released
        this._updateEntityValue();
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
        // Update entity value when touch ends
        this._updateEntityValue();
    }

    _updateColorFromEvent(event) {
        const colorWheel = this.content.querySelector('#colorWheel');
        const colorSelector = this.content.querySelector('#colorSelector');
        const colorValue = this.content.querySelector('.color-value');
        const outerCircle = this.content.querySelector('.outer-circle');
        
        if (!colorWheel || !colorSelector) return;
        
        const rect = colorWheel.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate position relative to center
        const x = event.clientX - rect.left - centerX;
        const y = centerY - (event.clientY - rect.top);
        
        // Calculate angle (hue) and distance (saturation)
        let angle = Math.atan2(y, x) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        
        // Invert the angle to fix the mirroring
        angle = (360 - angle) % 360;
        
        // Apply rotation to match the visual color wheel
        // The conic-gradient in CSS starts with red at 0°
        angle = (angle + 90) % 360;
        
        const distance = Math.min(Math.sqrt(x * x + y * y), this._wheelRadius);
        const saturation = distance / this._wheelRadius;
        
        // Convert HSV to RGB
        const rgb = this._hsvToRgb(angle, saturation, 1);
        this._selectedColor = rgb;
        
        // Update selector position - use the original angle for positioning
        const originalAngle = Math.atan2(y, x) * 180 / Math.PI;
        const selectorX = centerX + Math.cos(originalAngle * Math.PI / 180) * saturation * this._wheelRadius * 0.95;
        const selectorY = centerY - Math.sin(originalAngle * Math.PI / 180) * saturation * this._wheelRadius * 0.95;
        
        colorSelector.style.left = `${selectorX}px`;
        colorSelector.style.top = `${selectorY}px`;
        
        // Update color display
        const colorHex = this._rgbToHex(rgb.r, rgb.g, rgb.b);
        const colorRgb = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        
        colorSelector.style.backgroundColor = colorRgb;
        
        // Update the outer circle color
        if (outerCircle) {
            outerCircle.style.backgroundColor = colorRgb;
        }
        
        // Preview the color value in the format that will be saved
        let previewValue;
        switch (this._currentFormat) {
            case 'hex':
                previewValue = colorHex;
                break;
            case 'rgb':
                previewValue = colorRgb;
                break;
            case 'array':
                previewValue = `[${rgb.r}, ${rgb.g}, ${rgb.b}]`;
                break;
            case 'auto':
                // Use the format of the current entity value
                const entityState = this._hass.states[this._entityId].state;
                if (entityState.startsWith('#')) {
                    previewValue = colorHex;
                } else if (entityState.startsWith('rgb')) {
                    previewValue = colorRgb;
                } else if (entityState.startsWith('[')) {
                    previewValue = `[${rgb.r}, ${rgb.g}, ${rgb.b}]`;
                } else {
                    previewValue = colorHex;
                }
                break;
            default:
                previewValue = colorHex;
        }
        
        // Update the preview text
        if (colorValue) {
            colorValue.textContent = previewValue;
        }
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
        // Normalize RGB values
        r = r / 255;
        g = g / 255;
        b = b / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        // Calculate HSV values
        let h = 0;
        const s = max === 0 ? 0 : delta / max;
        const v = max;
        
        if (delta === 0) {
            h = 0; // No color, achromatic (gray)
        } else {
            if (max === r) {
                h = ((g - b) / delta) % 6;
            } else if (max === g) {
                h = (b - r) / delta + 2;
            } else { // max === b
                h = (r - g) / delta + 4;
            }
            
            h = Math.round(h * 60);
            if (h < 0) h += 360;
        }
        
        return { h, s, v };
    }

    _hsvToRgb(h, s, v) {
        // Convert HSV to RGB
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        
        let r, g, b;
        
        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
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
        this._removeEventListeners();
    }
}