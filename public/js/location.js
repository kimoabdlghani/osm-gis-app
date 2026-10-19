// public/js/location.js
/**
 * GPS Geolocation Service
 * Single Responsibility: Requests and displays user GPS coordinates on the map
 */

import { mapService } from './map.js';

class LocationService {
    constructor() {
        this.userMarker = null;
        this.accuracyCircle = null;
    }

    /**
     * Get current GPS location and center the map
     * @returns {Promise<{lat: number, lng: number, accuracy: number}>}
     */
    async getCurrentLocation() {
        if (!navigator.geolocation) {
            throw new Error('Your browser does not support GPS Geolocation.');
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const accuracy = position.coords.accuracy;

                    this.displayLocationOnMap(lat, lng, accuracy);
                    resolve({ lat, lng, accuracy });
                },
                (error) => {
                    let message = 'Unable to retrieve your current location.';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message = 'Location access permission was denied.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            message = 'Location request timed out.';
                            break;
                    }
                    reject(new Error(message));
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    /**
     * Render accuracy circle and user marker on map
     */
    displayLocationOnMap(lat, lng, accuracy) {
        this.clearUserLocation();

        // Accuracy circle
        this.accuracyCircle = L.circle([lat, lng], {
            radius: accuracy,
            color: '#1a73e8',
            fillColor: '#1a73e8',
            fillOpacity: 0.15,
            weight: 2
        }).addTo(mapService.map);

        // User location marker
        this.userMarker = L.marker([lat, lng])
            .addTo(mapService.map)
            .bindPopup(`
                <div class="popup-details">
                    <b>🎯 Your Location</b><br>
                    Accuracy: <strong>±${Math.round(accuracy)} m</strong><br>
                    <small style="color: #94a3b8;">[${lat.toFixed(5)}, ${lng.toFixed(5)}]</small>
                </div>
            `)
            .openPopup();

        mapService.setView(lat, lng, 16);
    }

    /**
     * Clear previous user location indicators
     */
    clearUserLocation() {
        if (this.userMarker && mapService.map) {
            mapService.map.removeLayer(this.userMarker);
            this.userMarker = null;
        }
        if (this.accuracyCircle && mapService.map) {
            mapService.map.removeLayer(this.accuracyCircle);
            this.accuracyCircle = null;
        }
    }
}

export const locationService = new LocationService();
