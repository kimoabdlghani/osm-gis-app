// public/js/export-image.js
/**
 * Map Image Export Service (PNG)
 * Single Responsibility: Captures map DOM and downloads high-resolution PNG snapshots
 */

class ExportImageService {
    /**
     * Capture and export the current map canvas to a PNG file
     * @param {string} mapElementId 
     */
    async exportMapAsPNG(mapElementId = 'map') {
        const mapElement = document.getElementById(mapElementId);
        if (!mapElement) {
            throw new Error('Map container element not found.');
        }

        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas library is not loaded.');
        }

        const canvas = await html2canvas(mapElement, {
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            backgroundColor: '#0f172a'
        });

        const imageUri = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imageUri;
        link.download = `map_snapshot_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export const exportImageService = new ExportImageService();
