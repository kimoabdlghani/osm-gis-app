// public/js/config.js
/**
 * Application Settings and Map Constants
 * Single Responsibility: Defines static configurations only
 */

export const MAP_CONFIG = {
    initialCenter: [30.0444, 31.2357], // Cairo, Egypt (Default)
    initialZoom: 13,
    maxZoom: 19
};

export const TILE_LAYERS = {
    osm: {
        name: 'Default',
        label: 'Default Streets',
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }
    },
    satellite: {
        name: 'Satellite',
        label: 'Satellite Imagery',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri'
        }
    },
    dark: {
        name: 'Dark',
        label: 'Dark Mode',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        options: {
            maxZoom: 20,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
        }
    },
    topo: {
        name: 'Terrain',
        label: 'Topographic',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        options: {
            maxZoom: 17,
            attribution: '&copy; OpenStreetMap, SRTM | OpenTopoMap'
        }
    }
};

export const API_ENDPOINTS = {
    shapes: '/api/shapes',
    nominatimSearch: 'https://nominatim.openstreetmap.org/search'
};
