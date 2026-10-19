// public/js/geometry.js
/**
 * العمليات والحسابات الجغرافية المكانية (GIS Geometry & Metrics)
 * Single Responsibility: مسؤول حصرياً عن حساب المسافات والمساحات وتنسيق الأرقام الجغرافية
 */

/**
 * حساب طول المسار/الخط بالأمتار
 * @param {Array<[number, number]>} latlngs 
 * @param {object} map - كائن خريطة Leaflet لحساب مسافات كروية دقيقة
 * @returns {number}
 */
export function calculateLineDistance(latlngs, map) {
    if (!latlngs || latlngs.length < 2) return 0;
    let totalMeters = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
        const p1 = L.latLng(latlngs[i]);
        const p2 = L.latLng(latlngs[i + 1]);
        totalMeters += map.distance(p1, p2);
    }
    return totalMeters;
}

/**
 * حساب المساحة المغلقة والمحيط للمضلع
 * @param {Array<[number, number]>} latlngs 
 * @param {object} map 
 * @returns {{ area: number, perimeter: number }}
 */
export function calculatePolygonMetrics(latlngs, map) {
    if (!latlngs || latlngs.length < 3) return { area: 0, perimeter: 0 };

    // حساب المحيط
    let perimeter = 0;
    for (let i = 0; i < latlngs.length; i++) {
        const p1 = L.latLng(latlngs[i]);
        const p2 = L.latLng(latlngs[(i + 1) % latlngs.length]);
        perimeter += map.distance(p1, p2);
    }

    // حساب المساحة عبر Turf.js أو البديل الكروي
    let area = 0;
    if (typeof turf !== 'undefined' && turf.polygon && turf.area) {
        try {
            const coords = latlngs.map(pt => [pt[1], pt[0]]);
            coords.push([coords[0][0], coords[0][1]]);
            const poly = turf.polygon([coords]);
            area = turf.area(poly);
        } catch (e) {
            area = sphericalPolygonArea(latlngs);
        }
    } else {
        area = sphericalPolygonArea(latlngs);
    }

    return { area, perimeter };
}

/**
 * حساب كروي جيوديسي لمساحة المضلع على سطح الأرض
 */
export function sphericalPolygonArea(latlngs) {
    const R = 6378137; // نصف قطر الأرض بالمتر
    const rad = Math.PI / 180;
    let total = 0;
    const len = latlngs.length;
    for (let i = 0; i < len; i++) {
        const p1 = latlngs[i];
        const p2 = latlngs[(i + 1) % len];
        total += (p2[1] - p1[1]) * rad * (2 + Math.sin(p1[0] * rad) + Math.sin(p2[0] * rad));
    }
    return Math.abs(total * R * R / 2.0);
}

/**
 * Format distance for human readability (m / km)
 */
export function formatDistance(meters) {
    if (meters < 1000) {
        return `${meters.toFixed(1)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Format area for human readability (m² / km² with acres)
 */
export function formatArea(sqMeters) {
    let mainText = '';
    if (sqMeters < 10000) {
        mainText = `${sqMeters.toLocaleString('en-US', { maximumFractionDigits: 1 })} m²`;
    } else {
        mainText = `${(sqMeters / 1000000).toFixed(3)} km²`;
    }
    const acres = (sqMeters / 4046.86).toFixed(2);
    return { formatted: mainText, secondary: `${acres} acres` };
}
