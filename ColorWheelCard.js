export class ColorWheelCard extends HTMLElement {
    constructor() {
        super();
        this._selectedColor = null;
        this._currentFormat = 'auto';
        this._entityId = null;
        this._wheelRadius = 150; // Default wheel radius
        this._padding = 5;       // Default white padding
        this._outerThickness = 15; // Default outer ring thickness
        this._isDragging = false;
        this._isReady = true; // Always assume ready
        this._renderRequested = false;
        this._configApplied = false;
        
        // Bind event handlers once to prevent memory leaks
        this._boundOnMouseDown = this._onMouseDown.bind(this);
        this._boundOnMouseMove = this._onMouseMove.bind(this);
        this._boundOnMouseUp = this._onMouseUp.bind(this);
        this._boundOnTouchStart = this._onTouchStart.bind(this);
        this._boundOnTouchMove = this._onTouchMove.bind(this);
        this._boundOnTouchEnd = this._onTouchEnd.bind(this);
    }

    connectedCallback() {
        // Force immediate rendering
        this._renderInitialUI();
    }
    
    _renderInitialUI() {
        // Create a basic placeholder UI that's immediately interactive
        if (!this.content) {
            try {
                // Apply config if available
                if (this.config) {
                    this._applyConfig();
                }
                
                const card = document.createElement('ha-card');
                card.header = this.config ? (this.config.title || 'Color Wheel') : 'Color Wheel';
                this.content = document.createElement('div');
                this.content.style.padding = '0 16px 16px';
                
                // Create a simple placeholder wheel that's immediately interactive
                // Use configured sizes if available
                const wheelSize = this._wheelRadius * 2;
                const totalSize = wheelSize + (this._outerThickness * 2);
                
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
                            width: ${totalSize}px;
                            height: ${totalSize}px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin: 20px 0;
                        }
                        .outer-circle {
                            position: absolute;
                            width: ${totalSize}px;
                            height: ${totalSize}px;
                            border-radius: 50%;
                            background-color: #FF0000;
                            z-index: 1;
                        }
                        .color-wheel {
                            position: relative;
                            width: ${wheelSize}px;
                            height: ${wheelSize}px;
                            border-radius: 50%;
                            cursor: pointer;
                            background: conic-gradient(
                                #FF0300,   /* 0° - Red */
                                #FF00C7,   /* 45° - Magenta */
                                #7900FF,   /* 90° - Purple */
                                #003EFF,   /* 135° - Blue */
                                #00FFFC,   /* 180° - Cyan */
                                #00FF49,   /* 225° - Green */
                                #75FF00,   /* 270° - Yellow-Green */
                                #FFC200,   /* 315° - Orange-Yellow */
                                #FF0300    /* 360° - Red again */
                            );
                            border: ${this._padding}px solid white;
                            box-sizing: border-box;
                            z-index: 2;
                        }
                    </style>
                    <div class="color-wheel-container">
                        <div class="wheel-wrapper">
                            <div class="outer-circle"></div>
                            <div class="color-wheel" id="colorWheel">
                                <div class="color-selector" id="colorSelector"></div>
                            </div>
                        </div>
                    </div>
                `;
                
                card.appendChild(this.content);
                this.appendChild(card);
                
                // Set up basic event listeners immediately
                const colorWheel = this.content.querySelector('#colorWheel');
                if (colorWheel) {
                    colorWheel.onclick = (e) => {
                        this._updateColorFromEvent(e);
                        this._updateEntityValue();
                    };
                }
            } catch (error) {
                console.error('[ColorWheel] Error in initial UI rendering:', error);
                // Create a minimal fallback UI
                const card = document.createElement('ha-card');
                card.header = 'Color Wheel';
                this.content = document.createElement('div');
                this.content.innerHTML = '<div style="padding: 16px;">Loading color wheel...</div>';
                card.appendChild(this.content);
                this.appendChild(card);
            }
        }
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error('You need to define an entity');
        }
        this.config = config;
        
        // Apply config immediately if we're already connected
        if (this.isConnected) {
            this._applyConfig();
            
            // Re-render if we already have content
            if (this.content && !this._configApplied) {
                this._renderInitialUI();
                this._configApplied = true;
            }
        }
    }
    
    _applyConfig() {
        if (!this.config) return;
        
        // Set wheel radius, padding and outer thickness from config
        this._wheelRadius = this.config.wheelSize ? this.config.wheelSize / 2 : 150;
        this._padding = this.config.padding !== undefined ? this.config.padding : 5;
        this._outerThickness = this.config.outerThickness !== undefined ? this.config.outerThickness : 15;
    }

    set hass(hass) {
        this._hass = hass;
        
        // Skip UI updates if we're currently dragging
        if (this._isDragging) {
            return;
        }

        // Get the entity from config
        if (!this.config) {
            return;
        }
        
        // Apply config if not already applied
        if (!this._configApplied) {
            this._applyConfig();
            this._configApplied = true;
        }
        
        this._entityId = this.config.entity;
        
        if (!this._entityId || !this._hass.states[this._entityId]) {
            if (this.content) {
                this.content.innerHTML = `
                    <div class="color-error" style="color: red; padding: 16px;">
                        Entity not found or not specified: ${this._entityId || 'none'}
                    </div>
                `;
            }
            return;
        }

        try {
            const entityState = this._hass.states[this._entityId].state;
            this._currentFormat = this.config.format || 'auto';
            
            // Parse the color based on format
            const color = this.parseColor(entityState, this._currentFormat);
            
            if (!color) {
                if (this.content) {
                    this.content.innerHTML = `
                        <div class="color-error" style="color: red; padding: 16px;">
                            Unable to parse color: ${entityState}
                        </div>
                    `;
                }
                return;
            }

            // Request animation frame for UI update to avoid blocking
            if (!this._renderRequested) {
                this._renderRequested = true;
                requestAnimationFrame(() => {
                    try {
                        this._updateUI(color, entityState);
                    } catch (error) {
                        console.error('[ColorWheel] Error updating UI:', error);
                    } finally {
                        this._renderRequested = false;
                    }
                });
            }
        } catch (error) {
            console.error('[ColorWheel] Error in hass setter:', error);
            if (this.content) {
                this.content.innerHTML = `
                    <div class="color-error" style="color: red; padding: 16px;">
                        Error: ${error.message}
                    </div>
                `;
            }
        }
    }

    _initializeCard() {
        if (!this.content) {
            const card = document.createElement('ha-card');
            card.header = this.config.title || 'Color Wheel';
            this.content = document.createElement('div');
            this.content.style.padding = '0 16px 16px';
            card.appendChild(this.content);
            this.appendChild(card);
        }
        
        // Apply config
        this._applyConfig();
    }
    
    _updateUI(color, entityState) {
        // Initialize card if needed
        if (!this.content || !this.content.parentNode) {
            this._initializeCard();
        }
        
        // Create the HTML content first
        const htmlContent = this._createHtmlContent(color, entityState);
        
        // Clean up old event listeners
        this._removeEventListeners();
        
        // Update the content
        this.content.innerHTML = htmlContent;
        
        // Add event listeners immediately after updating the content
        this._setupEventListeners();
    }
    
    _createHtmlContent(color, entityState) {
        try {
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
            
            // Calculate the effective radius of the inner wheel (accounting for padding)
            const effectiveRadius = this._wheelRadius - this._padding;
            
            // Calculate the distance from center based on saturation (bounded by effective radius)
            const distance = hsv.s * effectiveRadius;
            
            // ===== SELECTOR POSITION CALCULATION =====
            // IMPORTANT: We need to convert from HSV hue to a position on the wheel
            
            // The HSV hue from _rgbToHsv is in the range 0-360 where:
            // - 0° is red
            // - 120° is green
            // - 240° is blue
            
            // The CSS conic-gradient in our wheel is defined with these colors at these angles:
            // 0°/360° (top/12 o'clock): Red (#FF0300)
            // 45° (1:30 o'clock): Magenta (#FF00C7)
            // 90° (3 o'clock): Purple (#7900FF)
            // 135° (4:30 o'clock): Blue (#003EFF)
            // 180° (bottom/6 o'clock): Cyan (#00FFFC)
            // 225° (7:30 o'clock): Green (#00FF49)
            // 270° (9 o'clock): Yellow-Green (#75FF00)
            // 315° (10:30 o'clock): Orange-Yellow (#FFC200)
            
            // To position the selector correctly, we need to:
            // 1. Convert HSV hue to CSS angle (they're already the same)
            // 2. Convert CSS angle to standard math angle for positioning
            
            // Convert CSS angle to radians for positioning
            const cssAngle = hsv.h;
            
            // In _updateColorFromEvent we use: hueAngle = (90 - degrees + 180) % 360
            // So for the reverse, we need: degrees = 90 - (hueAngle - 180)
            const mathAngleRad = (90 - (cssAngle - 180)) * Math.PI / 180;
            
            // Calculate the bounded position
            const boundedX = Math.cos(mathAngleRad) * distance;
            const boundedY = Math.sin(mathAngleRad) * distance;
            
            // Position relative to center of wrapper (which includes the outer circle)
            const wrapperCenterX = this._wheelRadius + this._outerThickness;
            const wrapperCenterY = this._wheelRadius + this._outerThickness;
            
            // Calculate the final selector position
            const selectorX = wrapperCenterX + boundedX;
            const selectorY = wrapperCenterY + boundedY;
            
            return `
                <style>
                    .color-wheel-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        margin-bottom: 16px;
                    }
                    .wheel-wrapper {
                        position: relative;
                        width: ${this._wheelRadius * 2 + this._outerThickness * 2}px;
                        height: ${this._wheelRadius * 2 + this._outerThickness * 2}px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        margin: 20px 0;
                    }
                    .outer-circle {
                        position: absolute;
                        width: ${this._wheelRadius * 2 + this._outerThickness * 2}px;
                        height: ${this._wheelRadius * 2 + this._outerThickness * 2}px;
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
                            #FF0300,   /* 0° - Red */
                            #FF00C7,   /* 45° - Magenta */
                            #7900FF,   /* 90° - Purple */
                            #003EFF,   /* 135° - Blue */
                            #00FFFC,   /* 180° - Cyan */
                            #00FF49,   /* 225° - Green */
                            #75FF00,   /* 270° - Yellow-Green */
                            #FFC200,   /* 315° - Orange-Yellow */
                            #FF0300    /* 360° - Red again */
                        );
                        border: ${this._padding}px solid white;
                        box-sizing: border-box;
                        z-index: 2;
                        overflow: visible;
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
                        width: ${Math.max(10, this._wheelRadius / 10)}px;
                        height: ${Math.max(10, this._wheelRadius / 10)}px;
                        border-radius: 50%;
                        border: 2px solid white;
                        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
                        transform: translate(-50%, -50%);
                        background-color: ${color};
                        z-index: 3;
                        pointer-events: none;
                        left: ${selectorX}px;
                        top: ${selectorY}px;
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
                        </div>
                        <div class="color-selector" id="colorSelector"></div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('[ColorWheel] Error creating HTML content:', error);
            return `
                <div style="color: red; padding: 16px;">
                    Error creating color wheel: ${error.message}
                </div>
            `;
        }
    }

    _setupEventListeners() {
        const colorWheel = this.content.querySelector('#colorWheel');
        if (!colorWheel) {
            return;
        }
        
        // Use direct event binding for immediate response
        colorWheel.onmousedown = (e) => {
            e.preventDefault();
            this._isDragging = true;
            this._updateColorFromEvent(e);
            
            document.onmousemove = (e) => {
                e.preventDefault();
                if (this._isDragging) {
                    this._updateColorFromEvent(e);
                }
            };
            
            document.onmouseup = () => {
                this._isDragging = false;
                this._updateEntityValue();
                document.onmousemove = null;
                document.onmouseup = null;
            };
        };
        
        colorWheel.ontouchstart = (e) => {
            e.preventDefault();
            this._isDragging = true;
            this._updateColorFromEvent(e.touches[0]);
            
            document.ontouchmove = (e) => {
                e.preventDefault();
                if (this._isDragging) {
                    this._updateColorFromEvent(e.touches[0]);
                }
            };
            
            document.ontouchend = () => {
                this._isDragging = false;
                this._updateEntityValue();
                document.ontouchmove = null;
                document.ontouchend = null;
            };
        };
        
        // Add a click handler as a backup
        colorWheel.onclick = (e) => {
            if (!this._isDragging) {
                this._updateColorFromEvent(e);
                this._updateEntityValue();
            }
        };
    }
    
    _removeEventListeners() {
        const colorWheel = this.content.querySelector('#colorWheel');
        if (colorWheel) {
            colorWheel.onmousedown = null;
            colorWheel.ontouchstart = null;
            colorWheel.onclick = null;
        }
        
        // Clean up any lingering document handlers
        document.onmousemove = null;
        document.onmouseup = null;
        document.ontouchmove = null;
        document.ontouchend = null;
    }

    _onMouseDown(event) {
        event.preventDefault(); // Prevent default to ensure drag works on first click
        this._isDragging = true;
        this._updateColorFromEvent(event);
    }

    _onMouseMove(event) {
        if (this._isDragging) {
            // Only update if the mouse has actually moved
            this._updateColorFromEvent(event);
        }
    }

    _onMouseUp(event) {
        if (this._isDragging) {
            this._isDragging = false;
            // Update entity value when mouse is released
            this._updateEntityValue();
        }
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

    _onTouchEnd(event) {
        if (this._isDragging) {
            this._isDragging = false;
            // Update entity value when touch ends
            this._updateEntityValue();
        }
    }

    _updateColorFromEvent(event) {
        const colorWheel = this.content.querySelector('#colorWheel');
        const colorSelector = this.content.querySelector('#colorSelector');
        const outerCircle = this.content.querySelector('.outer-circle');
        const wheelWrapper = this.content.querySelector('.wheel-wrapper');
        
        if (!colorWheel || !colorSelector || !wheelWrapper) {
            return;
        }
        
        // Get the wheel's dimensions and position
        const wheelRect = colorWheel.getBoundingClientRect();
        const wrapperRect = wheelWrapper.getBoundingClientRect();
        
        // Calculate the center of the wheel
        const wheelCenterX = wheelRect.width / 2;
        const wheelCenterY = wheelRect.height / 2;
        
        // Calculate the click position relative to the wheel's center
        const clickX = event.clientX - wheelRect.left - wheelCenterX;
        const clickY = event.clientY - wheelRect.top - wheelCenterY;
        
        // Calculate the distance from center
        const clickDistance = Math.sqrt(clickX * clickX + clickY * clickY);
        
        // Calculate the effective radius (accounting for padding)
        const effectiveRadius = (this._wheelRadius - this._padding);
        
        // Determine if the click is outside the effective radius
        const isOutsideBounds = clickDistance > effectiveRadius;
        
        // Calculate the bounded position
        let boundedDistance = clickDistance;
        if (isOutsideBounds) {
            boundedDistance = effectiveRadius;
        }
        
        // Calculate the angle in radians
        const angleRad = Math.atan2(clickY, clickX);
        
        // Calculate the bounded position
        const boundedX = Math.cos(angleRad) * boundedDistance;
        const boundedY = Math.sin(angleRad) * boundedDistance;
        
        // ===== COLOR MAPPING LOGIC =====
        // IMPORTANT: There are three coordinate systems to consider:
        // 1. Standard math angles: 0° at 3 o'clock, going counterclockwise
        // 2. CSS angles: 0° at 12 o'clock, going clockwise
        // 3. HSV color wheel: 0° is red, 120° is green, 240° is blue
        
        // The CSS conic-gradient in our wheel is defined with these colors at these angles:
        // 0°/360° (top/12 o'clock): Red (#FF0300)
        // 45° (1:30 o'clock): Magenta (#FF00C7)
        // 90° (3 o'clock): Purple (#7900FF)
        // 135° (4:30 o'clock): Blue (#003EFF)
        // 180° (bottom/6 o'clock): Cyan (#00FFFC)
        // 225° (7:30 o'clock): Green (#00FF49)
        // 270° (9 o'clock): Yellow-Green (#75FF00)
        // 315° (10:30 o'clock): Orange-Yellow (#FFC200)
        
        // Convert from standard math angle to CSS angle
        // Math angle: 0° is at 3 o'clock, going counterclockwise
        // CSS angle: 0° is at 12 o'clock, going clockwise
        let degrees = angleRad * 180 / Math.PI;
        
        // To map correctly:
        // 1. Convert from math angle to CSS angle
        // 2. CSS angle is 0° at top, going clockwise
        let hueAngle = (90 - degrees + 180) % 360;
        if (hueAngle < 0) hueAngle += 360;
        
        // Calculate saturation (0-1)
        const saturation = Math.min(clickDistance / effectiveRadius, 1);
        
        // Convert HSV to RGB
        const rgb = this._hsvToRgb(hueAngle, saturation, 1);
        this._selectedColor = rgb;
        
        // Position the selector relative to the wrapper
        const wrapperCenterX = wrapperRect.width / 2;
        const wrapperCenterY = wrapperRect.height / 2;
        
        // Position the selector at the bounded position
        colorSelector.style.left = `${wrapperCenterX + boundedX}px`;
        colorSelector.style.top = `${wrapperCenterY + boundedY}px`;
        
        // Update color display
        const colorRgb = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        colorSelector.style.backgroundColor = colorRgb;
        
        // Update the outer circle color
        if (outerCircle) {
            outerCircle.style.backgroundColor = colorRgb;
        }
    }

    _updateEntityValue() {
        if (!this._selectedColor || !this._entityId) {
            return;
        }
        
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
            console.error('[ColorWheel] Failed to update entity:', error);
            // Try alternative service if input_text fails
            this._hass.callService('homeassistant', 'update_entity', {
                entity_id: this._entityId,
                new_state: formattedColor
            }).catch(err => {
                console.error('[ColorWheel] Failed to update entity with alternative method:', err);
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

    static getConfigElement() {
        return document.createElement("color-wheel-editor");
    }

    static getStubConfig() {
        return {
            entity: '',
            format: 'auto',
            wheelSize: 300,
            padding: 5,
            outerThickness: 15
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