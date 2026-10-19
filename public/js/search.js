// public/js/search.js
/**
 * Geocoding & Autocomplete Search Service
 * Single Responsibility: Querying Nominatim API and managing search markers
 */

import { API_ENDPOINTS } from './config.js';
import { mapService } from './map.js';

class SearchService {
    constructor() {
        this.searchMarker = null;
    }

    /**
     * Fetch location autocomplete suggestions as user types
     * @param {string} query 
     * @param {number} limit 
     * @returns {Promise<Array<{lat: number, lon: number, displayName: string, shortName: string}>>}
     */
    async fetchSuggestions(query, limit = 5) {
        if (!query || query.trim().length < 2) return [];

        const url = `${API_ENDPOINTS.nominatimSearch}?format=json&q=${encodeURIComponent(query.trim())}&limit=${limit}&addressdetails=1`;
        try {
            const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            if (!res.ok) return [];
            const results = await res.json();

            return results.map(item => ({
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                displayName: item.display_name,
                shortName: item.display_name.split(',').slice(0, 2).join(' - ')
            }));
        } catch (err) {
            console.warn('Could not fetch search suggestions:', err);
            return [];
        }
    }

    /**
     * Move camera to location and show search marker
     * @param {number} lat 
     * @param {number} lon 
     * @param {string} displayName 
     */
    goToLocation(lat, lon, displayName) {
        mapService.setView(lat, lon, 14);

        if (this.searchMarker) {
            mapService.map.removeLayer(this.searchMarker);
        }

        this.searchMarker = L.marker([lat, lon])
            .addTo(mapService.map)
            .bindPopup(`
                <div class="popup-details">
                    <b>📍 Search Result:</b><br>
                    ${displayName}<br>
                    <small style="color: #94a3b8;">[${lat.toFixed(4)}, ${lon.toFixed(4)}]</small>
                </div>
            `)
            .openPopup();
    }

    /**
     * Search directly for top matching place
     * @param {string} query 
     */
    async searchLocation(query) {
        if (!query || !query.trim()) {
            throw new Error('Please enter a location or address to search.');
        }

        const suggestions = await this.fetchSuggestions(query, 1);
        if (!suggestions || suggestions.length === 0) {
            return null;
        }

        const first = suggestions[0];
        this.goToLocation(first.lat, first.lon, first.displayName);
        return first;
    }
}

export const searchService = new SearchService();
