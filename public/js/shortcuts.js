// public/js/shortcuts.js
/**
 * Keyboard Shortcuts and Cursor Hint Guide Service
 * Single Responsibility: Manages hotkeys and interactive cursor guidance
 */

class ShortcutsService {
    constructor() {
        this.cursorHintEl = null;
    }

    init({ onUndoPoint, onUndoShape, onCancel, onFocusSearch }) {
        this.cursorHintEl = document.getElementById('cursor-hint-tooltip');

        // Global keydown listeners
        document.addEventListener('keydown', (e) => {
            // Don't intercept when user is actively typing in search input
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            const isTyping = activeTag === 'input' || activeTag === 'textarea';

            // Slash '/' key focuses search bar (Universal standard)
            if (e.key === '/' && !isTyping) {
                e.preventDefault();
                if (onFocusSearch) onFocusSearch();
                return;
            }

            // Escape key cancels drawing or closes dialogs
            if (e.key === 'Escape') {
                if (onCancel) onCancel();
                return;
            }

            // Backspace or Delete key undos the last point placed during drawing
            if ((e.key === 'Backspace' || e.key === 'Delete') && !isTyping) {
                if (onUndoPoint && onUndoPoint()) {
                    e.preventDefault();
                }
                return;
            }

            // Ctrl+Z or Cmd+Z undos the last created shape
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isTyping) {
                e.preventDefault();
                if (onUndoShape) onUndoShape();
                return;
            }
        });
    }

    /**
     * Update position and text of the interactive floating cursor hint
     */
    updateCursorHint(x, y, text) {
        if (!this.cursorHintEl) return;
        if (!text) {
            this.cursorHintEl.classList.add('hidden');
            return;
        }

        this.cursorHintEl.textContent = text;
        this.cursorHintEl.style.left = `${x + 16}px`;
        this.cursorHintEl.style.top = `${y + 16}px`;
        this.cursorHintEl.classList.remove('hidden');
    }

    hideCursorHint() {
        if (this.cursorHintEl) {
            this.cursorHintEl.classList.add('hidden');
        }
    }
}

export const shortcutsService = new ShortcutsService();
