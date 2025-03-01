/*
       ______ ____   __    ____   ____  _       __ __  __ ______ ______ __       
      / ____// __ \ / /   / __ \ / __ \| |     / // / / // ____// ____// /       
     / /    / / / // /   / / / // /_/ /| | /| / // /_/ // __/  / __/  / /        
    / /___ / /_/ // /___/ /_/ // _, _/ | |/ |/ // __  // /___ / /___ / /___      
    \____/ \____//_____/\____//_/ |_|  |__/|__//_/ /_//_____//_____//_____/      
                                                                             
    Copyright AndyMcLoid (c) 2024
*/

import { ColorWheelCard } from './ColorWheelCard.js';
import { ColorWheelEditor } from './ColorWheelEditor.js';
customElements.define('color-wheel-editor', ColorWheelEditor);
customElements.define('color-wheel-card', ColorWheelCard);

var Ht = "1.0.0";
console.groupCollapsed(`%cCOLOR-WHEEL-CARD ${Ht} IS INSTALLED`, "color: green; font-weight: bold"),
console.log("Readme:", "https://github.com/andymcloid/colorwheel-hass"),
console.groupEnd();