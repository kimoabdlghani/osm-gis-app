// public/js/geotiff.js
/**
 * GeoTIFF Raster Layer Manager
 * Single Responsibility: Parses GeoTIFF raster data, manages raster layers on Leaflet,
 * handles layer opacity, bounding box calculations, and map projection alignment.
 * 
 * Follows SOLID principles:
 * - SRP: Exclusively handles GeoTIFF raster processing and Leaflet layer lifecycle.
 * - Open/Closed: Supports georaster-layer-for-leaflet when loaded, with pure JS fallback.
 */

export class GeoTIFFService {
    constructor() {
        this.map = null;
        this.currentLayer = null;
        this.activeMetadata = null;
        this.opacity = 0.85;

        // Callback hooks for decoupled UI observation
        this.onLayerLoaded = null;
        this.onLayerRemoved = null;
        this.onError = null;
    }

    /**
     * Bind Leaflet map instance
     * @param {L.Map} map 
     */
    init(map) {
        this.map = map;
    }

    /**
     * Load GeoTIFF file from File input or Blob
     * @param {File|Blob} file 
     */
    async loadFromFile(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            return await this.loadFromArrayBuffer(arrayBuffer, file.name);
        } catch (err) {
            console.error('Failed to load GeoTIFF file:', err);
            if (this.onError) this.onError(err.message || 'Failed to read GeoTIFF file');
            throw err;
        }
    }

    /**
     * Load GeoTIFF from a remote URL or local path
     * @param {string} url 
     * @param {string} fileName 
     */
    async loadFromUrl(url, fileName = 'sample.tif') {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch GeoTIFF at ${url}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return await this.loadFromArrayBuffer(arrayBuffer, fileName);
        } catch (err) {
            console.error('Failed to fetch GeoTIFF URL:', err);
            if (this.onError) this.onError(err.message || 'Failed to fetch GeoTIFF');
            throw err;
        }
    }

    /**
     * Core loader: checks for georaster library first, falls back to native canvas parser
     * @param {ArrayBuffer} arrayBuffer 
     * @param {string} fileName 
     */
    async loadFromArrayBuffer(arrayBuffer, fileName = 'raster.tif') {
        this.removeCurrentLayer();

        // 1. Try modern GeoRaster renderer if available globally
        if (typeof window.parseGeoraster === 'function' && typeof window.GeoRasterLayer === 'function') {
            try {
                const georaster = await window.parseGeoraster(arrayBuffer);
                const layer = new window.GeoRasterLayer({
                    georaster: georaster,
                    opacity: this.opacity,
                    resolution: 256
                });

                layer.addTo(this.map);
                this.currentLayer = layer;

                const bounds = [
                    [georaster.ymin, georaster.xmin],
                    [georaster.ymax, georaster.xmax]
                ];

                this.activeMetadata = {
                    fileName,
                    width: georaster.width,
                    height: georaster.height,
                    bands: georaster.numberOfRasters || 1,
                    bounds,
                    projection: georaster.projection || 4326,
                    pixelWidth: georaster.pixelWidth ? georaster.pixelWidth.toFixed(6) : '--',
                    pixelHeight: georaster.pixelHeight ? georaster.pixelHeight.toFixed(6) : '--'
                };

                this.fitBounds();

                if (this.onLayerLoaded) this.onLayerLoaded(this.activeMetadata);
                return this.activeMetadata;
            } catch (rasterErr) {
                console.warn('GeoRaster parser encountered an issue, trying native TIFF fallback...', rasterErr);
            }
        }

        // 2. Fallback: Pure JavaScript TIFF parser & Canvas imageOverlay
        const parsed = this._parseTiffFallback(arrayBuffer);
        if (!parsed) {
            throw new Error('Unable to parse GeoTIFF metadata. Verify that the file is a valid GeoTIFF.');
        }

        const canvas = this._renderTiffToCanvas(parsed);
        const dataUrl = canvas.toDataURL('image/png');

        const imageOverlay = L.imageOverlay(dataUrl, parsed.bounds, {
            opacity: this.opacity,
            interactive: true
        }).addTo(this.map);

        this.currentLayer = imageOverlay;
        this.activeMetadata = {
            fileName,
            width: parsed.width,
            height: parsed.height,
            bands: parsed.samplesPerPixel,
            bounds: parsed.bounds,
            projection: parsed.crs || 'WGS 84 (EPSG:4326)',
            pixelWidth: parsed.pixelScale ? parsed.pixelScale[0].toFixed(6) : '--',
            pixelHeight: parsed.pixelScale ? parsed.pixelScale[1].toFixed(6) : '--'
        };

        this.fitBounds();

        if (this.onLayerLoaded) this.onLayerLoaded(this.activeMetadata);
        return this.activeMetadata;
    }

    /**
     * Adjust transparency of active GeoTIFF layer
     * @param {number} opacity (0.0 to 1.0)
     */
    setOpacity(opacity) {
        this.opacity = Math.max(0, Math.min(1, opacity));
        if (this.currentLayer) {
            if (typeof this.currentLayer.setOpacity === 'function') {
                this.currentLayer.setOpacity(this.opacity);
            }
        }
    }

    /**
     * Zoom and center map view around GeoTIFF extent
     */
    fitBounds() {
        if (!this.map || !this.activeMetadata || !this.activeMetadata.bounds) return;
        this.map.fitBounds(this.activeMetadata.bounds, { padding: [50, 50], maxZoom: 17 });
    }

    /**
     * Remove current GeoTIFF layer from map
     */
    removeCurrentLayer() {
        if (this.currentLayer && this.map) {
            this.map.removeLayer(this.currentLayer);
            this.currentLayer = null;
        }
        this.activeMetadata = null;
        if (this.onLayerRemoved) this.onLayerRemoved();
    }

    /**
     * Check if a layer is currently active
     */
    hasActiveLayer() {
        return this.currentLayer !== null;
    }

    // ==============================================================================
    // Internal Fallback GeoTIFF Parser & Canvas Generator
    // ==============================================================================

    /**
     * Parse binary TIFF structure and GeoTIFF geographic tags
     * @private
     */
    _parseTiffFallback(arrayBuffer) {
        try {
            const view = new DataView(arrayBuffer);
            const isLE = String.fromCharCode(view.getUint8(0), view.getUint8(1)) === 'II';
            const version = isLE ? view.getUint16(2, true) : view.getUint16(2, false);
            if (version !== 42) return null;

            const firstIFD = isLE ? view.getUint32(4, true) : view.getUint32(4, false);
            const numTags = isLE ? view.getUint16(firstIFD, true) : view.getUint16(firstIFD, false);

            let width = 0;
            let height = 0;
            let samplesPerPixel = 1;
            let stripOffsets = [];
            let stripByteCounts = [];
            let pixelScale = null;
            let tiepoint = null;

            for (let i = 0; i < numTags; i++) {
                const offset = firstIFD + 2 + i * 12;
                const tag = isLE ? view.getUint16(offset, true) : view.getUint16(offset, false);
                const count = isLE ? view.getUint32(offset + 4, true) : view.getUint32(offset + 4, false);
                const valOrOff = isLE ? view.getUint32(offset + 8, true) : view.getUint32(offset + 8, false);

                if (tag === 256) width = valOrOff; // ImageWidth
                if (tag === 257) height = valOrOff; // ImageLength
                if (tag === 277) samplesPerPixel = valOrOff; // SamplesPerPixel
                if (tag === 273) { // StripOffsets
                    stripOffsets = this._readTagValues(view, isLE, count, valOrOff, 4);
                }
                if (tag === 279) { // StripByteCounts
                    stripByteCounts = this._readTagValues(view, isLE, count, valOrOff, 4);
                }
                if (tag === 33550) { // ModelPixelScaleTag
                    pixelScale = [
                        view.getFloat64(valOrOff, isLE),
                        view.getFloat64(valOrOff + 8, isLE),
                        view.getFloat64(valOrOff + 16, isLE)
                    ];
                }
                if (tag === 33922) { // ModelTiepointTag
                    tiepoint = [
                        view.getFloat64(valOrOff, isLE),
                        view.getFloat64(valOrOff + 8, isLE),
                        view.getFloat64(valOrOff + 16, isLE),
                        view.getFloat64(valOrOff + 24, isLE),
                        view.getFloat64(valOrOff + 32, isLE),
                        view.getFloat64(valOrOff + 40, isLE)
                    ];
                }
            }

            if (!width || !height) return null;

            let bounds = null;
            if (tiepoint && pixelScale) {
                const minLng = tiepoint[3];
                const maxLat = tiepoint[4];
                const maxLng = minLng + width * pixelScale[0];
                const minLat = maxLat - height * pixelScale[1];
                bounds = [[minLat, minLng], [maxLat, maxLng]];
            } else {
                // If tiepoints are missing, default around map center
                const center = this.map ? this.map.getCenter() : { lat: 30.0444, lng: 31.2357 };
                const span = 0.03;
                bounds = [
                    [center.lat - span, center.lng - span],
                    [center.lat + span, center.lng + span]
                ];
            }

            return {
                view,
                isLE,
                width,
                height,
                samplesPerPixel,
                stripOffsets,
                stripByteCounts,
                pixelScale,
                tiepoint,
                bounds
            };
        } catch (e) {
            console.error('Error in TIFF fallback parser:', e);
            return null;
        }
    }

    /**
     * Read values array from IFD tag offset
     * @private
     */
    _readTagValues(view, isLE, count, valOrOffset, bytesPerItem) {
        if (count === 1) return [valOrOffset];
        const res = [];
        for (let i = 0; i < count; i++) {
            const pos = valOrOffset + i * bytesPerItem;
            res.push(bytesPerItem === 4 ? view.getUint32(pos, isLE) : view.getUint16(pos, isLE));
        }
        return res;
    }

    /**
     * Render uncompressed TIFF pixel strips to an HTML5 Canvas
     * @private
     */
    _renderTiffToCanvas(parsed) {
        const canvas = document.createElement('canvas');
        canvas.width = parsed.width;
        canvas.height = parsed.height;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(parsed.width, parsed.height);
        const data = imgData.data;

        const view = parsed.view;
        const spp = parsed.samplesPerPixel;
        let outIdx = 0;

        for (let s = 0; s < parsed.stripOffsets.length; s++) {
            const stripOffset = parsed.stripOffsets[s];
            const byteCount = parsed.stripByteCounts[s] || (parsed.width * parsed.height * spp);

            for (let b = 0; b < byteCount && outIdx < data.length; b += spp) {
                const bytePos = stripOffset + b;
                if (bytePos >= view.byteLength) break;

                if (spp >= 3) {
                    data[outIdx]     = view.getUint8(bytePos);     // Red
                    data[outIdx + 1] = view.getUint8(bytePos + 1); // Green
                    data[outIdx + 2] = view.getUint8(bytePos + 2); // Blue
                    data[outIdx + 3] = spp >= 4 ? view.getUint8(bytePos + 3) : 255; // Alpha
                } else {
                    // Grayscale
                    const gray = view.getUint8(bytePos);
                    data[outIdx]     = gray;
                    data[outIdx + 1] = gray;
                    data[outIdx + 2] = gray;
                    data[outIdx + 3] = 255;
                }
                outIdx += 4;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }
}

export const geoTiffService = new GeoTIFFService();
