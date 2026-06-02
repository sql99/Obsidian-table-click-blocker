/***********************
 * Obsidian Table Click Blocker (Custom DOM Inspector Fix)
 * Goal: 
 * - Prevent table editor focus / cursor jumping completely on single clicks
 * - Fix: Allow clicking native "+" buttons via .table-col-btn and .table-row-btn
 * - Native double-click word selection EVEN IF split by Obsidian Search (.cm-searchMatch)
 * - Full drag-to-select mouse functionality (anche sui nodi span laterali e aree vuote)
 * - FIX: Mantiene la tabella bloccata in Source Mode senza rompere la selezione a destra.
 ***********************/

'use strict';

const { Plugin, PluginSettingTab, Setting } = require('obsidian');

const DEFAULT_SETTINGS = {
    mode: 'soft', // 'soft' | 'strict' | 'disabled'
};

module.exports = class TableClickBlockerPlugin extends Plugin {

    async onload() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.addSettingTab(new TableClickBlockerSettingTab(this.app, this));
        
        this._isMouseDown = false;
        this._startX = 0;
        this._startY = 0;
        this._isDragging = false;

        this._registerEvents();
        console.log('TableClickBlocker loaded');
    }

    _isInTableWidget(target) {
        if (!target) return false;
        if (!target.closest('.cm-editor')) return false;
        return !!target.closest('.cm-table-widget') || !!target.closest('.HyperMD-table-row');
    }

    /* Rileva se il click è indirizzato a elementi interattivi o ai pulsanti rilevati dall'inspect */
    _isInteractive(target) {
        if (!target) return false;
        return !!(
            target.closest('a') ||
            target.closest('input') ||
            target.closest('button') ||
            target.closest('.table-col-btn') ||
            target.closest('.table-row-btn') ||
            target.closest('.obsidian-table-overlay') || 
            target.closest('.obsidian-table-overlay-button') ||
            target.closest('.cm-table-drag-handle')
        );
    }

    /* Ricostruisce l'intera parola anche se spezzata dai tag di ricerca di Obsidian */
    _selectWordAtPoint(x, y) {
        const sel = window.getSelection();
        if (!sel) return;

        let range = null;
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(x, y);
        } else if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(x, y);
            if (pos) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.setEnd(pos.offsetNode, pos.offset);
            }
        }

        if (!range) return;

        let targetNode = range.startContainer;
        let offset = range.startOffset;

        if (targetNode.nodeType !== Node.TEXT_NODE && targetNode.childNodes[offset]) {
            targetNode = targetNode.childNodes[offset];
            offset = 0;
            while (targetNode && targetNode.nodeType !== Node.TEXT_NODE) {
                targetNode = targetNode.firstChild;
            }
        }

        if (!targetNode || targetNode.nodeType !== Node.TEXT_NODE) return;

        const container = targetNode.parentElement.closest('.HyperMD-table-row, td') || targetNode.parentElement;
        
        const textNodes = [];
        const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        let n;
        while (n = walk.nextNode()) {
            textNodes.push(n);
        }

        let absoluteOffset = 0;
        let currentTextNodeIndex = textNodes.indexOf(targetNode);
        
        for (let i = 0; i < currentTextNodeIndex; i++) {
            absoluteOffset += textNodes[i].textContent.length;
        }
        absoluteOffset += offset;

        const fullText = textNodes.map(node => node.textContent).join('');

        let start = absoluteOffset;
        while (start > 0 && /[\w\p{L}\p{N}]/u.test(fullText[start - 1])) {
            start--;
        }
        let end = absoluteOffset;
        while (end < fullText.length && /[\w\p{L}\p{N}]/u.test(fullText[end])) {
            end++;
        }

        if (start === end) return;

        let startNode = null, startOffset = 0;
        let endNode = null, endOffset = 0;
        let accumulatedLength = 0;

        for (const node of textNodes) {
            const nodeLength = node.textContent.length;
            
            if (!startNode && start <= accumulatedLength + nodeLength) {
                startNode = node;
                startOffset = start - accumulatedLength;
            }
            if (!endNode && end <= accumulatedLength + nodeLength) {
                endNode = node;
                endOffset = end - accumulatedLength;
                break;
            }
            accumulatedLength += nodeLength;
        }

        if (startNode && endNode) {
            const wordRange = document.createRange();
            wordRange.setStart(startNode, startOffset);
            wordRange.setEnd(endNode, endOffset);
            sel.removeAllRanges();
            sel.addRange(wordRange);
        }
    }

    _registerEvents() {
        
        this._onMousedown = (evt) => {
            if (this.settings.mode === 'disabled') return;
            if (!this._isInTableWidget(evt.target)) return;
            if (this._isInteractive(evt.target)) return; 

            if (this.settings.mode === 'strict') {
                evt.preventDefault();
                evt.stopImmediatePropagation();
                return;
            }

            if (this.settings.mode === 'soft') {
                if (evt.detail === 2) {
                    evt.preventDefault();
                    evt.stopImmediatePropagation();
                    this._selectWordAtPoint(evt.clientX, evt.clientY);
                    return;
                }

                // NON blocchiamo il mousedown nativo con stopImmediatePropagation,
                // altrimenti gli span periferici (es. span:nth-child(4)) non inizieranno mai il drag.
                this._isMouseDown = true;
                this._isDragging = false;
                this._startX = evt.clientX;
                this._startY = evt.clientY;
            }
        };

        this._onMousemove = (evt) => {
            if (!this._isMouseDown || this.settings.mode !== 'soft') return;

            const deltaX = Math.abs(evt.clientX - this._startX);
            const deltaY = Math.abs(evt.clientY - this._startY);
            
            if (deltaX > 3 || deltaY > 3) {
                this._isDragging = true;
            }
        };

        this._onMouseup = (evt) => {
            if (!this._isMouseDown) return;
            
            const wasDragging = this._isDragging;
            this._isMouseDown = false;
            this._isDragging = false;

            if (this.settings.mode === 'soft') {
                if (this._isInteractive(evt.target)) return;

                // Se l'utente ha trascinato (drag a destra/sinistra), la selezione è completata.
                // Intercettiamo l'evento ORA per impedire a Obsidian di ricalcolare il Live Preview.
                evt.preventDefault();
                evt.stopImmediatePropagation();

                // Trucco per congelare la selezione ed evitare il refresh distruttivo di CodeMirror
                if (wasDragging) {
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0) {
                        const savedRange = sel.getRangeAt(0).cloneRange();
                        setTimeout(() => {
                            sel.removeAllRanges();
                            sel.addRange(savedRange);
                        }, 0);
                    }
                }
            }
        };

        this._onClick = (evt) => {
            if (this.settings.mode === 'disabled') return;
            if (!this._isInTableWidget(evt.target)) return;
            if (this._isInteractive(evt.target)) return;

            if (this.settings.mode === 'soft') {
                // Sganciamo il click per evitare salti di cursore indesiderati
                evt.preventDefault();
                evt.stopImmediatePropagation();
            }
        };

        document.addEventListener('mousedown', this._onMousedown, true);
        document.addEventListener('mousemove', this._onMousemove, true);
        document.addEventListener('mouseup', this._onMouseup, true);
        document.addEventListener('click', this._onClick, true);
    }

    onunload() {
        document.removeEventListener('mousedown', this._onMousedown, true);
        document.removeEventListener('mousemove', this._onMousemove, true);
        document.removeEventListener('mouseup', this._onMouseup, true);
        document.removeEventListener('click', this._onClick, true);
        console.log('TableClickBlocker unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
};

class TableClickBlockerSettingTab extends PluginSettingTab {
    constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }

    display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Table Click Blocker' });

    // 1. Definiamo le descrizioni per ogni modalità
    const descrizioni = {
        soft: 'Soft = Prevent table editor focus / cursor jumping completely on single clicks. Full drag-to-select mouse functionality.',
        strict: 'Strict = Blocks all mouse interactions inside tables completely (read-only behavior for markdown tables).',
        disabled: 'Disabled = Plugin inactive. Default Obsidian table behavior.'
    };

    // 2. Creiamo l'impostazione salvando il riferimento in una variabile
    const settingMode = new Setting(containerEl)
        .setName('Mode')
        // Impostiamo la descrizione iniziale basata sul valore attualmente salvato
        .setDesc(descrizioni[this.plugin.settings.mode] || descrizioni.soft);

    settingMode.addDropdown((d) =>
        d
            .addOption('soft', 'Soft (recommended)')
            .addOption('strict', 'Strict')
            .addOption('disabled', 'Disabled')
            .setValue(this.plugin.settings.mode)
            .onChange(async (v) => {
                this.plugin.settings.mode = v;
                await this.plugin.saveSettings();
                
                // 3. Aggiorniamo dinamicamente il testo della descrizione a schermo
                settingMode.setDesc(descrizioni[v]);
            })
    );
}
}