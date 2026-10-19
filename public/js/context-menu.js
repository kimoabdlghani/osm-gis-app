// public/js/context-menu.js
/**
 * Map Context Menu Service (Right-Click Menu like Google Maps)
 * Single Responsibility: Manages opening, closing, and actions for right-click context menu
 */

import { mapService } from './map.js';
import { drawingManager } from './drawing.js';
import { uiManager } from './ui.js';

class ContextMenuService {
    constructor() {
        this.menuEl = null;
        this.currentLatLng = null;
    }

    init() {
        this.menuEl = document.getElementById('map-context-menu');
        if (!this.menuEl) return;

        // Bind menu item clicks
        this.menuEl.querySelectorAll('.ctx-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                this.handleAction(action);
                this.close();
            });
        });

        // Close menu on click anywhere else
        document.addEventListener('click', () => this.close());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    }

    /**
     * Open context menu at screen coordinates (x, y) with geographic latlng
     */
    open(x, y, latlng) {
        if (!this.menuEl) return;
        this.currentLatLng = latlng;

        // Position menu with boundary check
        const menuWidth = 220;
        const menuHeight = 210;
        const adjustedX = (x + menuWidth > window.innerWidth) ? x - menuWidth : x;
        const adjustedY = (y + menuHeight > window.innerHeight) ? y - menuHeight : y;

        this.menuEl.style.left = `${adjustedX}px`;
        this.menuEl.style.top = `${adjustedY}px`;
        this.menuEl.classList.remove('hidden');

        // Update coordinates label in menu
        const coordsLabel = this.menuEl.querySelector('.ctx-coords-label');
        if (coordsLabel) {
            coordsLabel.textContent = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
        }
    }

    close() {
        if (this.menuEl) {
            this.menuEl.classList.add('hidden');
        }
        this.currentLatLng = null;
    }

    handleAction(action) {
        if (!this.currentLatLng) return;
        const { lat, lng } = this.currentLatLng;

        switch (action) {
            case 'marker':
                drawingManager.addPoint(lat, lng, 'Dropped Pin');
                break;

            case 'measure':
                drawingManager.setMode('line');
                document.querySelectorAll('.btn-tool').forEach(b => {
                    if (b.dataset.mode === 'line') b.classList.add('active');
                    else b.classList.remove('active');
                });
                drawingManager.handleMapClick(lat, lng);
                uiManager.setStatus('Measuring distance from selected point &bull; Click to add points');
                uiManager.toggleDrawingControls(true);
                break;

            case 'copy':
                const text = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                navigator.clipboard.writeText(text).then(() => {
                    uiManager.showToast('Coordinates copied to clipboard!');
                }).catch(() => {
                    uiManager.showToast(`Coordinates: ${text}`);
                });
                break;

            case 'center':
                mapService.setView(lat, lng, mapService.map.getZoom());
                break;

            case 'gmaps':
                window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener');
                break;
        }
    }
}

export const contextMenuService = new ContextMenuService();
