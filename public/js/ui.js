// public/js/ui.js
/**
 * UI State and DOM View Manager
 * Single Responsibility: Updates screen indicators, cards, badges, logs, and drawer
 */

class UIManager {
    constructor() {
        this.statusBox = document.getElementById('drawing-status');
        this.finishBtn = document.getElementById('btn-finish-shape');
        this.cancelBtn = document.getElementById('btn-cancel-shape');
        this.coordTooltip = document.getElementById('coordinates-tooltip');
        this.liveBadge = document.getElementById('live-measure-badge');
        this.liveText = document.getElementById('live-measure-text');
        this.liveIcon = document.getElementById('live-measure-icon');
        this.logList = document.getElementById('log-list');

        this.distMetric = document.getElementById('metric-distance');
        this.areaMetric = document.getElementById('metric-area');
        this.perimeterMetric = document.getElementById('metric-perimeter');
        this.noteMetric = document.getElementById('metric-extra');

        this.sideDrawer = document.getElementById('side-drawer');
        this.drawerToggleBtn = document.getElementById('btn-toggle-drawer');
        this.floatingDrawingControls = document.getElementById('floating-drawing-controls');
        this.toastEl = document.getElementById('toast-notification');
        this.toastTimer = null;
    }

    setStatus(text) {
        if (this.statusBox) this.statusBox.innerHTML = text;
    }

    setCoordinates(lat, lng) {
        if (this.coordTooltip) {
            this.coordTooltip.textContent = `Lat: ${lat.toFixed(5)} | Lng: ${lng.toFixed(5)}`;
        }
    }

    toggleDrawingControls(show) {
        if (this.floatingDrawingControls) {
            if (show) this.floatingDrawingControls.classList.remove('hidden');
            else this.floatingDrawingControls.classList.add('hidden');
        }
    }

    showLiveBadge(icon, text) {
        if (!this.liveBadge) return;
        this.liveBadge.classList.remove('hidden');
        if (this.liveIcon) this.liveIcon.textContent = icon;
        if (this.liveText) this.liveText.textContent = text;
    }

    hideLiveBadge() {
        if (this.liveBadge) this.liveBadge.classList.add('hidden');
    }

    updateMetrics({ distance = '--', area = '--', perimeter = '--', note = '' }) {
        if (this.distMetric) this.distMetric.textContent = distance;
        if (this.areaMetric) this.areaMetric.textContent = area;
        if (this.perimeterMetric) this.perimeterMetric.textContent = perimeter;
        if (this.noteMetric && note) this.noteMetric.textContent = note;
    }

    logShape(type, details, onFocus = null, onDelete = null) {
        if (!this.logList) return;
        const emptyState = this.logList.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const item = document.createElement('div');
        item.className = 'log-item';
        item.innerHTML = `
            <div class="log-content" title="${details}">
                <strong>${type}</strong>: <span>${details}</span>
            </div>
            <div class="log-actions">
                ${onFocus ? '<button class="btn-item-action btn-item-focus" title="Focus and view on map">🔍</button>' : ''}
                ${onDelete ? '<button class="btn-item-action btn-item-delete" title="Delete this shape">🗑️</button>' : ''}
            </div>
        `;

        if (onFocus) {
            const focusBtn = item.querySelector('.btn-item-focus');
            if (focusBtn) {
                focusBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onFocus();
                });
            }
        }

        if (onDelete) {
            const deleteBtn = item.querySelector('.btn-item-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onDelete();
                    item.remove();
                    if (this.logList.children.length === 0) {
                        this.logList.innerHTML = '<p class="empty-state">No shapes created yet. Pick a tool to start drawing.</p>';
                    }
                });
            }
        }

        this.logList.prepend(item);
    }

    clearLogs() {
        if (this.logList) {
            this.logList.innerHTML = '<p class="empty-state">Map cleared. No shapes available.</p>';
        }
    }

    toggleDrawer(forceOpen = null) {
        if (!this.sideDrawer) return;
        if (forceOpen === true) {
            this.sideDrawer.classList.remove('collapsed');
        } else if (forceOpen === false) {
            this.sideDrawer.classList.add('collapsed');
        } else {
            this.sideDrawer.classList.toggle('collapsed');
        }
    }

    showToast(message, duration = 2500) {
        if (!this.toastEl) return;
        clearTimeout(this.toastTimer);
        this.toastEl.textContent = message;
        this.toastEl.classList.remove('hidden');
        this.toastEl.classList.add('show');

        this.toastTimer = setTimeout(() => {
            this.toastEl.classList.remove('show');
            setTimeout(() => this.toastEl.classList.add('hidden'), 300);
        }, duration);
    }
}

export const uiManager = new UIManager();
