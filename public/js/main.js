// public/js/main.js
/**
 * Main Application Orchestrator
 * Connects modular services (Map, Drawing, UI, Storage, Search, Geolocation, Export)
 * Follows SOLID principles and Clean Architecture
 */

import { mapService } from './map.js';
import { drawingManager } from './drawing.js';
import { uiManager } from './ui.js';
import { storageService } from './storage.js';
import { searchService } from './search.js';
import { locationService } from './location.js';
import { exportImageService } from './export-image.js';
import { contextMenuService } from './context-menu.js';
import { shortcutsService } from './shortcuts.js';
import { geoTiffService } from './geotiff.js';

// ==============================================================================
// 1. Map Initialization
// ==============================================================================

const map = mapService.init('map');

// Synchronize remaining shapes on the map with the server
function syncShapesToServer() {
    const remaining = [];
    mapService.drawnItems.eachLayer(layer => {
        if (layer._customData) {
            remaining.push(layer._customData);
        }
    });
    storageService.updateAllShapes(remaining);
}

// Register a shape to the UI with Focus and Delete action buttons
function registerShapeToUI(shape) {
    const onFocus = () => {
        if (shape.coordinates && shape.type === 'Point') {
            mapService.setView(shape.coordinates[0], shape.coordinates[1], 16);
        } else if (shape.layer && shape.layer.getBounds) {
            mapService.fitBounds(shape.layer.getBounds());
        }
        if (shape.layer && shape.layer.openPopup) {
            shape.layer.openPopup();
        }
    };

    const onDelete = () => {
        if (shape.layer && mapService.drawnItems) {
            mapService.drawnItems.removeLayer(shape.layer);
        }
        syncShapesToServer();
        uiManager.showToast('Shape removed');
    };

    uiManager.logShape(shape.type, shape.details || shape.title, onFocus, onDelete);
}

// ==============================================================================
// 2. Drawing Manager Callbacks
// ==============================================================================

drawingManager.onShapeCreated = (shape) => {
    // 1. Register in UI drawer list
    registerShapeToUI(shape);

    // 2. Update metrics panel
    uiManager.updateMetrics({
        distance: shape.distance || '--',
        area: shape.area || '--',
        perimeter: shape.perimeter || '--',
        note: `Created: ${shape.title || shape.type}`
    });

    // 3. Persist to server
    storageService.saveShape({
        type: shape.type,
        title: shape.title,
        coordinates: shape.coordinates,
        distance: shape.distance,
        area: shape.area,
        secondary: shape.secondary,
        perimeter: shape.perimeter
    });

    // Hide drawing pill and live badge
    uiManager.toggleDrawingControls(false);
    uiManager.hideLiveBadge();
    document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('active'));
    uiManager.showToast(`New ${shape.type} created!`);
};

drawingManager.onDrawingProgress = (progress) => {
    uiManager.toggleDrawingControls(true);

    if (progress.mode === 'line') {
        const text = `Points: ${progress.pointsCount} | Length: ${progress.distance}`;
        uiManager.showLiveBadge('📏', progress.distance);
        uiManager.setStatus(`Drawing Path &bull; ${text}`);
    } else if (progress.mode === 'polygon') {
        const areaText = progress.area ? `Area: ${progress.area}` : `Vertices: ${progress.pointsCount}`;
        uiManager.showLiveBadge('📐', progress.area || `${progress.pointsCount} pts`);
        uiManager.setStatus(`Drawing Area &bull; Vertices: ${progress.pointsCount}`);
    }
};

drawingManager.onDrawingCancelled = () => {
    uiManager.toggleDrawingControls(false);
    uiManager.hideLiveBadge();
    document.getElementById('map').classList.remove('map-crosshair');
    shortcutsService.hideCursorHint();
    document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('active'));
    uiManager.showToast('Drawing selection cancelled');
};

// ==============================================================================
// 3. Right-Click Context Menu (Google Maps Native Style)
// ==============================================================================

contextMenuService.init();

map.on('contextmenu', (e) => {
    contextMenuService.open(e.originalEvent.clientX, e.originalEvent.clientY, e.latlng);
});

// ==============================================================================
// 4. Map Mouse Events (Including Crosshair & Cursor Guidance)
// ==============================================================================

map.on('mousemove', (e) => {
    uiManager.setCoordinates(e.latlng.lat, e.latlng.lng);

    if (drawingManager.currentMode) {
        document.getElementById('map').classList.add('map-crosshair');
        const points = drawingManager.tempPoints.length;
        let hintText = 'Click on map to start';
        if (points > 0) {
            hintText = `Point ${points} placed &bull; Backspace to undo point &bull; Esc to cancel`;
        }
        shortcutsService.updateCursorHint(e.originalEvent.clientX, e.originalEvent.clientY, hintText);
    } else {
        document.getElementById('map').classList.remove('map-crosshair');
        shortcutsService.hideCursorHint();
    }
});

map.on('click', (e) => {
    contextMenuService.close();
    drawingManager.handleMapClick(e.latlng.lat, e.latlng.lng);
});

// Double-click cancels active selection / drawing mode
map.on('dblclick', (e) => {
    const wasDrawing = drawingManager.cancelDrawing();
    if (wasDrawing) {
        uiManager.showToast('Selection cancelled');
    }
});

// Helper for Undo Shape
function handleUndoShape() {
    const removedLayer = drawingManager.undoLastShape();
    if (removedLayer) {
        syncShapesToServer();
        const logList = document.getElementById('log-list');
        if (logList && logList.firstElementChild && !logList.firstElementChild.classList.contains('empty-state')) {
            logList.firstElementChild.remove();
            if (logList.children.length === 0) {
                logList.innerHTML = '<p class="empty-state">No shapes created yet. Pick a tool above to start drawing.</p>';
            }
        }
        uiManager.showToast('Last shape undone (Undo)');
    } else {
        uiManager.showToast('No shapes to undo');
    }
}

// Bind Undo Chip Button
const undoBtn = document.getElementById('btn-undo');
if (undoBtn) {
    undoBtn.addEventListener('click', handleUndoShape);
}

// ==============================================================================
// 5. Universal Keyboard Shortcuts
// ==============================================================================

shortcutsService.init({
    onUndoPoint: () => {
        const undone = drawingManager.undoLastPoint();
        if (undone) {
            uiManager.showToast('Last vertex removed (Undo Point)');
        }
        return undone;
    },
    onUndoShape: handleUndoShape,
    onCancel: () => {
        drawingManager.cancelDrawing();
        contextMenuService.close();
        uiManager.toggleDrawer(false);
    },
    onFocusSearch: () => {
        const searchInput = document.getElementById('input-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
});

// ==============================================================================
// 6. Drawing Tool Chips & Floating Controls
// ==============================================================================

const toolButtons = document.querySelectorAll('.btn-tool');
toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const activeMode = drawingManager.setMode(mode);

        toolButtons.forEach(b => b.classList.remove('active'));
        uiManager.toggleDrawingControls(false);
        uiManager.hideLiveBadge();

        if (activeMode) {
            btn.classList.add('active');
            const toolNames = { point: 'Marker (Point)', line: 'Distance / Path', polygon: 'Area / Polygon' };
            uiManager.setStatus(`Active Tool: <strong>${toolNames[activeMode]}</strong> &bull; Click on map`);
            uiManager.toggleDrawingControls(true);
        } else {
            uiManager.setStatus('Explore mode &bull; Click on any tool above to draw');
            document.getElementById('map').classList.remove('map-crosshair');
            shortcutsService.hideCursorHint();
        }
    });
});

// Finish Shape Button
document.getElementById('btn-finish-shape').addEventListener('click', () => {
    try {
        drawingManager.finishCurrentShape();
        document.getElementById('map').classList.remove('map-crosshair');
        shortcutsService.hideCursorHint();
    } catch (err) {
        alert(err.message);
    }
});

// Cancel Shape Button
document.getElementById('btn-cancel-shape').addEventListener('click', () => {
    drawingManager.cancelDrawing();
});

// ==============================================================================
// 5. Google Maps Style Layer Switcher Widget
// ==============================================================================

const layerWidget = document.querySelector('.gm-layer-widget');
const layerToggleBtn = document.getElementById('btn-layer-toggle');

if (layerToggleBtn && layerWidget) {
    layerToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        layerWidget.classList.toggle('active');
    });
}

document.querySelectorAll('.gm-layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const layerKey = btn.dataset.layer;
        mapService.switchBaseLayer(layerKey);

        document.querySelectorAll('.gm-layer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (layerWidget) layerWidget.classList.remove('active');
        uiManager.showToast(`Layer switched: ${btn.querySelector('span:last-child').textContent}`);
    });
});

// Close layer dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (layerWidget && !layerWidget.contains(e.target)) {
        layerWidget.classList.remove('active');
    }
});

// ==============================================================================
// 6. Sliding Left Drawer (Panel Toggle)
// ==============================================================================

const drawerToggleBtn = document.getElementById('btn-toggle-drawer');
const drawerCloseBtn = document.getElementById('btn-close-drawer');

if (drawerToggleBtn) {
    drawerToggleBtn.addEventListener('click', () => {
        uiManager.toggleDrawer();
    });
}

if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', () => {
        uiManager.toggleDrawer(false);
    });
}

// ==============================================================================
// 7. Geocoding Search & Autocomplete
// ==============================================================================

const searchInput = document.getElementById('input-search');
const searchBtn = document.getElementById('btn-search');
const clearSearchBtn = document.getElementById('btn-clear-search');
const searchStatus = document.getElementById('search-status');
const suggestionsList = document.getElementById('search-suggestions');

let searchDebounceTimer = null;

function renderSuggestions(suggestions) {
    if (!suggestionsList) return;
    suggestionsList.innerHTML = '';

    if (!suggestions || suggestions.length === 0) {
        suggestionsList.classList.add('hidden');
        return;
    }

    suggestions.forEach(item => {
        const li = document.createElement('li');
        li.className = 'search-suggestion-item';
        li.textContent = item.displayName;
        li.addEventListener('click', () => {
            searchInput.value = item.shortName;
            suggestionsList.classList.add('hidden');
            searchService.goToLocation(item.lat, item.lon, item.displayName);
            searchStatus.textContent = `Found: ${item.shortName}`;
            searchStatus.style.color = '#38bdf8';
            if (clearSearchBtn) clearSearchBtn.classList.remove('hidden');
        });
        suggestionsList.appendChild(li);
    });

    suggestionsList.classList.remove('hidden');
}

if (searchInput) {
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        const query = searchInput.value.trim();

        if (clearSearchBtn) {
            if (query.length > 0) clearSearchBtn.classList.remove('hidden');
            else clearSearchBtn.classList.add('hidden');
        }

        if (query.length < 2) {
            renderSuggestions([]);
            return;
        }

        searchDebounceTimer = setTimeout(async () => {
            const suggestions = await searchService.fetchSuggestions(query, 5);
            renderSuggestions(suggestions);
        }, 300);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (suggestionsList) suggestionsList.classList.add('hidden');
            handleSearch();
        }
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        if (suggestionsList) suggestionsList.classList.add('hidden');
        searchStatus.textContent = '';
        searchInput.focus();
    });
}

document.addEventListener('click', (e) => {
    if (suggestionsList && !e.target.closest('.gm-search-wrapper')) {
        suggestionsList.classList.add('hidden');
    }
});

async function handleSearch() {
    const query = searchInput.value;
    if (!query.trim()) {
        searchStatus.textContent = 'Please enter a place name or address.';
        searchStatus.style.color = '#f87171';
        return;
    }

    searchStatus.textContent = 'Searching location...';
    searchStatus.style.color = '#38bdf8';
    searchBtn.disabled = true;

    try {
        const result = await searchService.searchLocation(query);
        if (result) {
            searchStatus.textContent = `Located: ${result.shortName}`;
            searchStatus.style.color = '#34d399';
        } else {
            searchStatus.textContent = 'No matching places found.';
            searchStatus.style.color = '#f87171';
        }
    } catch (err) {
        searchStatus.textContent = err.message;
        searchStatus.style.color = '#f87171';
    } finally {
        searchBtn.disabled = false;
    }
}

if (searchBtn) {
    searchBtn.addEventListener('click', () => {
        if (suggestionsList) suggestionsList.classList.add('hidden');
        handleSearch();
    });
}

// GPS Locate Me Button
const locateBtn = document.getElementById('btn-locate-me');
if (locateBtn) {
    locateBtn.addEventListener('click', async () => {
        searchStatus.textContent = 'Detecting GPS location...';
        searchStatus.style.color = '#38bdf8';
        locateBtn.disabled = true;

        try {
            const loc = await locationService.getCurrentLocation();
            searchStatus.textContent = `Location locked (±${Math.round(loc.accuracy)} m)`;
            searchStatus.style.color = '#34d399';
            uiManager.showToast('GPS Location Found!');
        } catch (err) {
            searchStatus.textContent = err.message;
            searchStatus.style.color = '#f87171';
        } finally {
            locateBtn.disabled = false;
        }
    });
}

// ==============================================================================
// 8. Image Export & GeoJSON Handlers
// ==============================================================================

// Export PNG Snapshot
const exportImageBtn = document.getElementById('btn-export-image');
if (exportImageBtn) {
    exportImageBtn.addEventListener('click', async () => {
        const originalHtml = exportImageBtn.innerHTML;
        exportImageBtn.disabled = true;
        exportImageBtn.innerHTML = '<span class="chip-icon">⏳</span> Saving...';

        try {
            await exportImageService.exportMapAsPNG('map');
            uiManager.showToast('Map snapshot exported as PNG!');
        } catch (err) {
            alert('Could not export screenshot: ' + err.message);
        } finally {
            exportImageBtn.disabled = false;
            exportImageBtn.innerHTML = originalHtml;
        }
    });
}

// Export GeoJSON
document.getElementById('btn-export-geojson').addEventListener('click', () => {
    try {
        storageService.exportGeoJSON(mapService.drawnItems);
        uiManager.showToast('GeoJSON exported!');
    } catch (err) {
        alert(err.message);
    }
});

// Import GeoJSON
const importInput = document.getElementById('input-geojson-file');
const importTriggerBtn = document.getElementById('btn-import-geojson-trigger');

importTriggerBtn.addEventListener('click', () => {
    importInput.value = '';
    importInput.click();
});

importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const geojsonData = await storageService.parseGeoJSONFile(file);

        const importedLayer = L.geoJSON(geojsonData, {
            onEachFeature: (feature, layer) => {
                const props = feature.properties || {};
                const name = props.title || props.name || feature.geometry.type;
                layer.bindPopup(`<b>${name}</b><br><small>Imported from GeoJSON</small>`);
                layer._customData = {
                    type: feature.geometry.type,
                    title: name,
                    coordinates: feature.geometry.coordinates
                };
                mapService.drawnItems.addLayer(layer);
                registerShapeToUI({
                    type: feature.geometry.type,
                    title: name,
                    details: name,
                    layer: layer
                });
            }
        });
        syncShapesToServer();

        const bounds = importedLayer.getBounds();
        if (bounds.isValid()) {
            mapService.fitBounds(bounds);
        }

        uiManager.showToast('GeoJSON file imported successfully!');
    } catch (err) {
        alert(err.message);
    }
});

// Clear All Map Shapes
document.getElementById('btn-clear').addEventListener('click', async () => {
    mapService.clearDrawnItems();
    drawingManager.resetTempState();
    uiManager.toggleDrawingControls(false);
    uiManager.hideLiveBadge();
    uiManager.clearLogs();
    uiManager.updateMetrics({ distance: '--', area: '--', perimeter: '--', note: 'All shapes cleared' });
    await storageService.clearServerShapes();
    uiManager.showToast('All shapes cleared');
});

// ==============================================================================
// 9. GeoTIFF Raster Overlays Integration
// ==============================================================================

geoTiffService.init(map);

const geotiffFileInput = document.getElementById('input-geotiff-file');
const geotiffDetailsCard = document.getElementById('geotiff-details-card');
const geotiffBadge = document.getElementById('geotiff-badge');
const geotiffName = document.getElementById('geotiff-name');
const geotiffDims = document.getElementById('geotiff-dims');
const geotiffCrs = document.getElementById('geotiff-crs');
const geotiffBands = document.getElementById('geotiff-bands');
const geotiffOpacitySlider = document.getElementById('geotiff-opacity-slider');
const geotiffOpacityPct = document.getElementById('geotiff-opacity-pct');

// On GeoTIFF successfully placed on map
geoTiffService.onLayerLoaded = (meta) => {
    if (geotiffDetailsCard) geotiffDetailsCard.classList.remove('hidden');
    if (geotiffBadge) {
        geotiffBadge.textContent = 'Active';
        geotiffBadge.classList.add('active');
    }
    if (geotiffName) geotiffName.textContent = meta.fileName;
    if (geotiffDims) geotiffDims.textContent = `${meta.width} × ${meta.height} px`;
    if (geotiffCrs) geotiffCrs.textContent = String(meta.projection || 'EPSG:4326');
    if (geotiffBands) geotiffBands.textContent = `${meta.bands} band(s)`;

    uiManager.toggleDrawer(true);
    uiManager.showToast(`GeoTIFF loaded: ${meta.fileName}`);
};

// On GeoTIFF layer removed
geoTiffService.onLayerRemoved = () => {
    if (geotiffDetailsCard) geotiffDetailsCard.classList.add('hidden');
    if (geotiffBadge) {
        geotiffBadge.textContent = 'No layer';
        geotiffBadge.classList.remove('active');
    }
    if (geotiffFileInput) geotiffFileInput.value = '';
    uiManager.showToast('GeoTIFF layer removed');
};

// On GeoTIFF error
geoTiffService.onError = (errorMsg) => {
    uiManager.showToast(`GeoTIFF: ${errorMsg}`, 3500);
};

// Tool Chip: Open drawer and prompt file dialog
const geotiffChipBtn = document.getElementById('btn-geotiff-trigger');
if (geotiffChipBtn) {
    geotiffChipBtn.addEventListener('click', () => {
        uiManager.toggleDrawer(true);
        if (geotiffFileInput) geotiffFileInput.click();
    });
}

// Drawer Upload Button
const drawerUploadBtn = document.getElementById('btn-drawer-upload-geotiff');
if (drawerUploadBtn && geotiffFileInput) {
    drawerUploadBtn.addEventListener('click', () => {
        geotiffFileInput.click();
    });
}

// Handle File Input Change
if (geotiffFileInput) {
    geotiffFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uiManager.showToast('Reading GeoTIFF file...', 1500);
        try {
            await geoTiffService.loadFromFile(file);
        } catch (err) {
            uiManager.showToast(`Error: ${err.message}`, 3000);
        }
    });
}

// Drawer Sample GeoTIFF Button
const drawerSampleBtn = document.getElementById('btn-drawer-sample-geotiff');
if (drawerSampleBtn) {
    drawerSampleBtn.addEventListener('click', async () => {
        uiManager.showToast('Loading Cairo sample GeoTIFF...', 1500);
        try {
            await geoTiffService.loadFromUrl('/samples/cairo-satellite-sample.tif', 'cairo-satellite-sample.tif');
        } catch (err) {
            uiManager.showToast(`Sample error: ${err.message}`, 3000);
        }
    });
}

// Opacity Slider
if (geotiffOpacitySlider) {
    geotiffOpacitySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (geotiffOpacityPct) geotiffOpacityPct.textContent = `${val}%`;
        geoTiffService.setOpacity(val / 100);
    });
}

// Focus Button
const focusTiffBtn = document.getElementById('btn-geotiff-focus');
if (focusTiffBtn) {
    focusTiffBtn.addEventListener('click', () => {
        geoTiffService.fitBounds();
    });
}

// Remove Button
const removeTiffBtn = document.getElementById('btn-geotiff-remove');
if (removeTiffBtn) {
    removeTiffBtn.addEventListener('click', () => {
        geoTiffService.removeCurrentLayer();
    });
}

// ==============================================================================
// 10. Load Initial Saved Shapes
// ==============================================================================

async function loadInitialData() {
    const shapes = await storageService.fetchShapes();
    shapes.forEach(item => {
        if (item.type === 'Point' && item.coordinates) {
            drawingManager.addPoint(item.coordinates[0], item.coordinates[1], item.title || "Saved Location");
        } else if (item.type === 'Line' && item.coordinates) {
            drawingManager.addLine(item.coordinates, { color: '#0284c7', weight: 4 }, item.title || "Saved Path");
        } else if (item.type === 'Polygon' && item.coordinates) {
            drawingManager.addPolygon(item.coordinates, { color: '#10b981', fillColor: '#34d399', fillOpacity: 0.4 }, item.title || "Saved Area");
        }
    });
}

loadInitialData();
