import { LitElement, html, css } from 'https://unpkg.com/lit@2.2.7/index.js?module';

export class ColorWheelEditor extends LitElement {
    constructor() {
        super();
        this._hass = null;
        this.config = { entity: '', format: 'auto' };
    }

    static get properties() {
        return {
            _hass: { type: Object },  // Home Assistant object
            config: { type: Object },  // Configuration object
            schema: { type: Array },  // Schema
        };
    }
      
    get schema() {
        return [
            { name: 'title', label: this._hass.localize('ui.panel.lovelace.editor.card.generic.title'), selector: { text: { } } },
            { name: 'entity', label: this._hass.localize('ui.panel.lovelace.editor.card.generic.entity'), selector: { entity: { } } },
            { name: 'format', label: 'Color Format', selector: { select: { 
                options: [
                    { value: 'auto', label: 'Auto-detect' },
                    { value: 'hex', label: 'Hex (#RRGGBB)' },
                    { value: 'rgb', label: 'RGB (rgb(r,g,b))' },
                    { value: 'array', label: 'Array ([r,g,b])' }
                ]
            } } },
        ];
    }

    static styles = css`
      div {
        padding: 10px;
      }
    `;

    setConfig(config) {
        this.config = config || { entity: '', format: 'auto' };
        this.render(); // Trigger re-render when config is set
    }

    set hass(hass) {
        this._hass = hass;
        this.render(); // Trigger re-render when hass is set
    }

    render() {
        // Make sure necessary data is available
        if (!this._hass || !this.config) {
            return html``;
        }

        return html`
            <ha-form 
                .hass=${this._hass} 
                .data=${this.config} 
                .schema=${this.schema} 
                .computeLabel=${this._computeLabel}
                @value-changed=${this._valueChanged}>
            </ha-form>
        `;
    }

    _computeLabel(schema) {
        if (schema.label) {
            return schema.label;
        }
        return schema.name;
    }

    _valueChanged(event) {
        const updatedValue = event.detail.value;
        this.config = { ...this.config, ...updatedValue };
        this._requestUpdate();
    }

    _requestUpdate() {
        // Dispatch config-changed event
        this.dispatchEvent(
            new CustomEvent('config-changed', { 
                detail: { config: this.config }, 
                bubbles: true, 
                composed: true 
            })
        );
    }
}