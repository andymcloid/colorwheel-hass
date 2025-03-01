export class ColorWheelCard extends HTMLElement {
    set hass(hass) {
        this._hass = hass;
        if (!this.content) {
            const card = document.createElement('ha-card');
            card.header = this.config.title || 'Color Wheel';
            this.content = document.createElement('div');
            this.content.style.padding = '0 16px 16px';
            card.appendChild(this.content);
            this.appendChild(card);
        }

        // Get the entity from config
        const entityId = this.config.entity;
        
        if (!entityId || !this._hass.states[entityId]) {
            this.content.innerHTML = `
                <div class="color-error">
                    Entity not found or not specified
                </div>
            `;
            return;
        }

        const entityState = this._hass.states[entityId].state;
        const format = this.config.format || 'auto';
        
        // Parse the color based on format
        const color = this.parseColor(entityState, format);
        
        if (!color) {
            this.content.innerHTML = `
                <div class="color-error">
                    Unable to parse color: ${entityState}
                </div>
            `;
            return;
        }

        // Display the color
        this.content.innerHTML = `
            <style>
                .color-display {
                    width: 100%;
                    height: 100px;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    background-color: ${color};
                }
                .color-value {
                    font-family: var(--paper-font-body1_-_font-family);
                    padding: 8px;
                    text-align: center;
                }
                .color-error {
                    color: var(--error-color);
                    padding: 8px;
                }
            </style>
            <div class="color-display"></div>
            <div class="color-value">${entityState}</div>
        `;
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
        return 3;
    }
}