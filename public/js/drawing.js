// public/js/drawing.js
/**
 * Shape Generation and Interactive Drawing Manager
 * Single Responsibility: Manages point, line, and polygon drawing states and lifecycle
 */

import { mapService } from './map.js';
import { calculateLineDistance, calculatePolygonMetrics, formatDistance, formatArea } from './geometry.js';

class DrawingManager {
    constructor() {
        this.currentMode = null; // 'point' | 'line' | 'polygon' | null
        this.tempPoints = [];
        this.tempPreviewLayer = null;

        // Decoupled callbacks
        this.onShapeCreated = null;
        this.onDrawingProgress = null;
        this.onDrawingCancelled = null;
    }

    /**
     * Activate or toggle a drawing mode
     * @param {'point'|'line'|'polygon'|null} mode 
     */
    setMode(mode) {
        this.resetTempState();
        this.currentMode = this.currentMode === mode ? null : mode;
        return this.currentMode;
    }

    /**
     * Cancel active drawing and reset state (e.g. on Double Click or Esc key)
     */
    cancelDrawing() {
        const wasActive = this.currentMode !== null || this.tempPoints.length > 0;
        this.resetTempState();
        this.currentMode = null;
        if (wasActive && this.onDrawingCancelled) {
            this.onDrawingCancelled();
        }
        return wasActive;
    }

    resetTempState() {
        if (this.tempPreviewLayer && mapService.map) {
            mapService.map.removeLayer(this.tempPreviewLayer);
            this.tempPreviewLayer = null;
        }
        this.tempPoints = [];
    }

    /**
     * Undo the last point placed during line or polygon drawing (e.g. Backspace key)
     */
    undoLastPoint() {
        if (!this.currentMode || this.tempPoints.length === 0) return false;
        this.tempPoints.pop();

        if (this.tempPreviewLayer && mapService.map) {
            mapService.map.removeLayer(this.tempPreviewLayer);
            this.tempPreviewLayer = null;
        }

        if (this.tempPoints.length === 0) {
            if (this.onDrawingProgress) {
                this.onDrawingProgress({ pointsCount: 0, mode: this.currentMode });
            }
            return true;
        }

        let progressData = { pointsCount: this.tempPoints.length, mode: this.currentMode };

        if (this.currentMode === 'line') {
            this.tempPreviewLayer = L.polyline(this.tempPoints, { color: '#f59e0b', dashArray: '6, 6' }).addTo(mapService.map);
            const currentDist = calculateLineDistance(this.tempPoints, mapService.map);
            progressData.distance = formatDistance(currentDist);
        } else if (this.currentMode === 'polygon') {
            this.tempPreviewLayer = L.polygon(this.tempPoints, { color: '#f59e0b', dashArray: '6, 6', fillOpacity: 0.25 }).addTo(mapService.map);
            if (this.tempPoints.length >= 3) {
                const { area } = calculatePolygonMetrics(this.tempPoints, mapService.map);
                progressData.area = formatArea(area).formatted;
            }
        }

        if (this.onDrawingProgress) {
            this.onDrawingProgress(progressData);
        }
        return true;
    }

    /**
     * Undo the last created shape from the map (Ctrl+Z)
     */
    undoLastShape() {
        const layers = mapService.drawnItems.getLayers();
        if (layers.length === 0) return null;
        const lastLayer = layers[layers.length - 1];
        mapService.drawnItems.removeLayer(lastLayer);
        return lastLayer;
    }

    /**
     * Add a Marker Point
     */
    addPoint(lat, lng, title = "New Location") {
        const marker = L.marker([lat, lng]);
        marker.bindPopup(`
            <div class="popup-details">
                <b>📍 ${title}</b><br>
                Latitude: <strong>${lat.toFixed(5)}</strong><br>
                Longitude: <strong>${lng.toFixed(5)}</strong>
                <div class="popup-links-bar">
                    <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener" class="popup-gmaps-link" title="Open in Google Maps">
                        🗺️ Google Maps
                    </a>
                </div>
            </div>
        `);

        marker._customData = { type: 'Point', title, coordinates: [lat, lng] };
        marker.addTo(mapService.drawnItems);

        if (this.onShapeCreated) {
            this.onShapeCreated({
                type: 'Point',
                title,
                coordinates: [lat, lng],
                details: `[${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
                layer: marker
            });
        }
        return marker;
    }

    /**
     * Add a Line / Path with distance measurement
     */
    addLine(latlngs, options = { color: '#0284c7', weight: 4 }, title = "Path / Route") {
        const polyline = L.polyline(latlngs, options);
        const distanceMeters = calculateLineDistance(latlngs, mapService.map);
        const distanceFormatted = formatDistance(distanceMeters);

        const centerPt = latlngs[Math.floor(latlngs.length / 2)];
        polyline.bindPopup(`
            <div class="popup-details">
                <b>📏 ${title}</b><br>
                Points: <strong>${latlngs.length}</strong><br>
                Total Distance: <span class="popup-metric-tag">${distanceFormatted}</span>
                <div class="popup-links-bar">
                    <a href="https://www.google.com/maps?q=${centerPt[0]},${centerPt[1]}" target="_blank" rel="noopener" class="popup-gmaps-link">
                        🗺️ View Area on Google Maps
                    </a>
                </div>
            </div>
        `);

        polyline._customData = { type: 'Line', coordinates: latlngs, distance: distanceFormatted, title };
        polyline.addTo(mapService.drawnItems);

        if (this.onShapeCreated) {
            this.onShapeCreated({
                type: 'Line',
                title,
                coordinates: latlngs,
                distance: distanceFormatted,
                details: `${latlngs.length} pts | Length: ${distanceFormatted}`,
                layer: polyline
            });
        }
        return polyline;
    }

    /**
     * Add a Polygon / Area with area and perimeter calculation
     */
    addPolygon(latlngs, options = { color: '#10b981', fillColor: '#34d399', fillOpacity: 0.4 }, title = "Polygon Area") {
        const polygon = L.polygon(latlngs, options);
        const { area, perimeter } = calculatePolygonMetrics(latlngs, mapService.map);
        const { formatted: areaFormatted, secondary } = formatArea(area);
        const perimeterFormatted = formatDistance(perimeter);

        const centerPt = latlngs[0];
        polygon.bindPopup(`
            <div class="popup-details">
                <b>📐 ${title}</b><br>
                Area: <span class="popup-metric-tag">${areaFormatted}</span> (${secondary})<br>
                Perimeter: <strong>${perimeterFormatted}</strong><br>
                Vertices: <strong>${latlngs.length}</strong>
                <div class="popup-links-bar">
                    <a href="https://www.google.com/maps?q=${centerPt[0]},${centerPt[1]}" target="_blank" rel="noopener" class="popup-gmaps-link">
                        🗺️ View on Google Maps
                    </a>
                </div>
            </div>
        `);

        polygon._customData = {
            type: 'Polygon',
            coordinates: latlngs,
            area: areaFormatted,
            secondary,
            perimeter: perimeterFormatted,
            title
        };
        polygon.addTo(mapService.drawnItems);

        if (this.onShapeCreated) {
            this.onShapeCreated({
                type: 'Polygon',
                title,
                coordinates: latlngs,
                area: areaFormatted,
                secondary,
                perimeter: perimeterFormatted,
                details: `Area: ${areaFormatted} (${secondary})`,
                layer: polygon
            });
        }
        return polygon;
    }

    /**
     * Handle map clicks while in drawing mode
     */
    handleMapClick(lat, lng) {
        if (!this.currentMode) return;

        if (this.currentMode === 'point') {
            this.addPoint(lat, lng, 'Dropped Pin');
            return;
        }

        if (this.currentMode === 'line' || this.currentMode === 'polygon') {
            this.tempPoints.push([lat, lng]);

            if (this.tempPreviewLayer) {
                mapService.map.removeLayer(this.tempPreviewLayer);
            }

            let progressData = { pointsCount: this.tempPoints.length, mode: this.currentMode };

            if (this.currentMode === 'line') {
                this.tempPreviewLayer = L.polyline(this.tempPoints, { color: '#f59e0b', dashArray: '6, 6' }).addTo(mapService.map);
                const currentDist = calculateLineDistance(this.tempPoints, mapService.map);
                progressData.distance = formatDistance(currentDist);
            } else if (this.currentMode === 'polygon') {
                this.tempPreviewLayer = L.polygon(this.tempPoints, { color: '#f59e0b', dashArray: '6, 6', fillOpacity: 0.25 }).addTo(mapService.map);
                if (this.tempPoints.length >= 3) {
                    const { area } = calculatePolygonMetrics(this.tempPoints, mapService.map);
                    progressData.area = formatArea(area).formatted;
                }
            }

            if (this.onDrawingProgress) {
                this.onDrawingProgress(progressData);
            }
        }
    }

    /**
     * Complete and render the active shape
     */
    finishCurrentShape() {
        if (this.currentMode === 'line') {
            if (this.tempPoints.length < 2) throw new Error('At least 2 points are required to draw a path.');
            this.addLine(this.tempPoints);
        } else if (this.currentMode === 'polygon') {
            if (this.tempPoints.length < 3) throw new Error('At least 3 vertices are required to form a polygon.');
            this.addPolygon(this.tempPoints);
        }
        this.resetTempState();
    }
}

export const drawingManager = new DrawingManager();
