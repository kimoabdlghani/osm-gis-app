// public/js/map.js
/**
 * Leaflet Map and Layer Manager
 * Single Responsibility: Map initialization, tile layers, and viewport control
 */

import { MAP_CONFIG, TILE_LAYERS } from './config.js';

class MapService {
    constructor() {
        this.map = null;
        this.activeLayer = null;
        this.baseLayers = {};
        this.drawnItems = null;
    }

    /**
     * Initialize Leaflet map and base tile layers
     * @param {string} containerId 
     */
    init(containerId = 'map') {
        // Disable default double-click zoom so dblclick can cancel selection/drawing
        this.map = L.map(containerId, {
            doubleClickZoom: false,
            zoomControl: false // custom position like Google Maps
        }).setView(MAP_CONFIG.initialCenter, MAP_CONFIG.initialZoom);

        // Place zoom control at bottom-right (Google Maps style)
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Instantiate base layers from config
        Object.keys(TILE_LAYERS).forEach(key => {
            const layerDef = TILE_LAYERS[key];
            this.baseLayers[key] = L.tileLayer(layerDef.url, layerDef.options);
        });

        // Set default layer (OSM Streets)
        this.activeLayer = this.baseLayers.osm.addTo(this.map);

        // Group container for drawn items
        this.drawnItems = L.layerGroup().addTo(this.map);

        return this.map;
    }

    /**
     * Switch active base tile layer
     * @param {string} layerKey 
     */
    switchBaseLayer(layerKey) {
        if (!this.baseLayers[layerKey] || this.activeLayer === this.baseLayers[layerKey]) return;

        this.map.removeLayer(this.activeLayer);
        this.activeLayer = this.baseLayers[layerKey].addTo(this.map);
    }

    /**
     * Clear all drawn vector items
     */
    clearDrawnItems() {
        if (this.drawnItems) {
            this.drawnItems.clearLayers();
        }
    }

    /**
     * Move camera to specific coordinates
     */
    setView(lat, lng, zoom = 14) {
        this.map.setView([lat, lng], zoom);
    }

    /**
     * Fit camera bounds to geometry
     */
    fitBounds(bounds, padding = [40, 40]) {
        this.map.fitBounds(bounds, { padding });
    }
}

export const mapService = new MapService();
