// public/js/storage.js
/**
 * Storage, API, and GeoJSON Export/Import Service
 * Single Responsibility: Manages persistence, API synchronization, and GeoJSON serialization
 */

import { API_ENDPOINTS } from './config.js';

class StorageService {
    /**
     * Retrieve saved shapes from server
     */
    async fetchShapes() {
        try {
            const res = await fetch(API_ENDPOINTS.shapes);
            const json = await res.json();
            return json.success && Array.isArray(json.data) ? json.data : [];
        } catch (err) {
            console.error('Failed to fetch shapes from server:', err);
            return [];
        }
    }

    /**
     * Save a new shape to the server
     */
    async saveShape(shapeData) {
        try {
            const res = await fetch(API_ENDPOINTS.shapes, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shapeData)
            });
            return await res.json();
        } catch (err) {
            console.error('Failed to save shape to server:', err);
            return null;
        }
    }

    /**
     * Overwrite/sync all shapes on the server
     */
    async updateAllShapes(shapes) {
        try {
            const res = await fetch(API_ENDPOINTS.shapes, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shapes)
            });
            return await res.json();
        } catch (err) {
            console.error('Failed to update shapes on server:', err);
            return null;
        }
    }

    /**
     * Clear all saved shapes from server
     */
    async clearServerShapes() {
        try {
            const res = await fetch(API_ENDPOINTS.shapes, { method: 'DELETE' });
            return await res.json();
        } catch (err) {
            console.warn('Could not clear server shapes:', err);
            return null;
        }
    }

    /**
     * Export all current map shapes to standard GeoJSON
     * @param {L.LayerGroup} drawnItems 
     */
    exportGeoJSON(drawnItems) {
        if (!drawnItems || drawnItems.getLayers().length === 0) {
            throw new Error('No shapes on the map to export.');
        }

        const geojsonObj = {
            type: "FeatureCollection",
            features: []
        };

        drawnItems.eachLayer(layer => {
            if (layer.toGeoJSON) {
                const feature = layer.toGeoJSON();
                if (layer._customData) {
                    feature.properties = { ...feature.properties, ...layer._customData };
                }
                geojsonObj.features.push(feature);
            }
        });

        const blob = new Blob([JSON.stringify(geojsonObj, null, 2)], { type: 'application/geo+json' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `map_features_${new Date().toISOString().slice(0, 10)}.geojson`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    }

    /**
     * Parse uploaded GeoJSON file
     * @param {File} file 
     * @returns {Promise<object>}
     */
    async parseGeoJSONFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    if (parsed.type !== 'FeatureCollection' && parsed.type !== 'Feature') {
                        throw new Error('File does not contain valid GeoJSON data.');
                    }
                    resolve(parsed);
                } catch (err) {
                    reject(new Error('Invalid GeoJSON file format: ' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('Could not read file from disk.'));
            reader.readAsText(file);
        });
    }
}

export const storageService = new StorageService();
