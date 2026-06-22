// All styles for the annotation widget, injected into Shadow DOM
// This is a JS string so it can be bundled inline

export const STYLES = `
/* === Reset within Shadow DOM === */
:host {
  all: initial;
}

/* === CSS Variables (themeable) === */
:host {
  --aw-primary: #4A90D9;
  --aw-danger: #E74C3C;
  --aw-success: #27AE60;
  --aw-warning: #F39C12;
  --aw-bg: #ffffff;
  --aw-bg-secondary: #f5f7fa;
  --aw-text: #2c3e50;
  --aw-text-secondary: #7f8c8d;
  --aw-border: #e0e4e8;
  --aw-shadow: 0 4px 16px rgba(0,0,0,0.12);
  --aw-shadow-lg: 0 8px 32px rgba(0,0,0,0.16);
  --aw-radius: 8px;
  --aw-radius-sm: 4px;
  --aw-z-toolbar: 100000;
  --aw-z-marker: 99990;
  --aw-z-editor: 100010;
  --aw-z-panel: 100020;
  --aw-z-overlay: 100015;
  --aw-z-tooltip: 100005;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  color: var(--aw-text);
  line-height: 1.5;
}

/* === Toolbar === */
.aw-toolbar {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: var(--aw-z-toolbar);
  display: flex;
  gap: 4px;
  background: var(--aw-bg);
  border-radius: var(--aw-radius);
  box-shadow: var(--aw-shadow);
  padding: 4px;
}

.aw-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--aw-radius-sm);
  background: transparent;
  color: var(--aw-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.aw-btn:hover {
  background: var(--aw-bg-secondary);
  color: var(--aw-text);
}

.aw-btn.aw-active {
  background: var(--aw-primary);
  color: #fff;
}

.aw-btn.aw-eye-off svg {
  opacity: 0.4;
}

/* === Markers === */
.aw-markers-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: var(--aw-z-marker);
}

.aw-marker {
  position: fixed;
  pointer-events: auto;
  cursor: pointer;
  z-index: var(--aw-z-marker);
}

.aw-marker-badge {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 33px;
  height: 33px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  transition: transform 0.15s;
  user-select: none;
}

.aw-marker-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.aw-marker-number {
  position: relative;
  z-index: 1;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  pointer-events: none;
}

.aw-marker:hover .aw-marker-badge {
  transform: scale(1.2);
}

.aw-marker.aw-dragging .aw-marker-badge {
  transform: scale(1.3);
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.45));
}

.aw-marker-orphaned .aw-marker-badge {
  opacity: 0.5;
}

.aw-marker-orphaned .aw-marker-badge::after {
  content: '?';
  position: absolute;
  z-index: 2;
  font-size: 9px;
  top: 1px;
  right: 5px;
  color: #fff;
  font-weight: 700;
  pointer-events: none;
}

/* === Editor === */
.aw-editor {
  position: fixed;
  z-index: var(--aw-z-editor);
  width: 320px;
  background: var(--aw-bg);
  border-radius: var(--aw-radius);
  box-shadow: var(--aw-shadow-lg);
  overflow: hidden;
}

.aw-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--aw-border);
}

.aw-editor-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--aw-text);
}

.aw-editor-colors {
  display: flex;
  gap: 6px;
}

.aw-color-dot {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.15s;
}

.aw-color-dot:hover {
  transform: scale(1.15);
}

.aw-color-dot.aw-color-active {
  border-color: var(--aw-text);
  box-shadow: 0 0 0 2px #fff, 0 0 0 3px currentColor;
}

.aw-editor-textarea {
  display: block;
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  border: none;
  outline: none;
  resize: vertical;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  color: var(--aw-text);
  background: var(--aw-bg);
  box-sizing: border-box;
}

.aw-editor-textarea::placeholder {
  color: var(--aw-text-secondary);
}

.aw-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--aw-border);
  background: var(--aw-bg-secondary);
}

.aw-editor-actions-right {
  display: flex;
  gap: 6px;
}

.aw-btn-save {
  background: var(--aw-primary) !important;
  color: #fff !important;
  width: auto !important;
  padding: 0 14px !important;
  font-size: 12px;
  height: 30px !important;
}

.aw-btn-save:hover {
  opacity: 0.9;
}

.aw-btn-cancel {
  width: auto !important;
  padding: 0 14px !important;
  font-size: 12px;
  height: 30px !important;
}

.aw-btn-danger {
  color: var(--aw-danger) !important;
  width: auto !important;
  padding: 0 10px !important;
  font-size: 12px;
  height: 30px !important;
}

.aw-btn-danger:hover {
  background: #fde8e8 !important;
}

/* === Tooltip === */
.aw-tooltip {
  position: fixed;
  z-index: var(--aw-z-tooltip);
  max-width: 260px;
  padding: 6px 10px;
  background: rgba(44, 62, 80, 0.92);
  color: #fff;
  font-size: 12px;
  border-radius: var(--aw-radius-sm);
  white-space: pre-wrap;
  word-break: break-word;
  pointer-events: none;
  line-height: 1.4;
}

/* === Panel Overlay === */
.aw-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.3);
  z-index: var(--aw-z-overlay);
}

/* === Panel === */
.aw-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  background: var(--aw-bg);
  border-radius: var(--aw-radius);
  box-shadow: var(--aw-shadow-lg);
  z-index: var(--aw-z-panel);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aw-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--aw-border);
}

.aw-panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.aw-panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 20px;
  color: var(--aw-text-secondary);
  cursor: pointer;
  border-radius: var(--aw-radius-sm);
}

.aw-panel-close:hover {
  background: var(--aw-bg-secondary);
  color: var(--aw-text);
}

/* === Panel Filter Bar === */
.aw-panel-filter {
  display: flex;
  gap: 4px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--aw-border);
  background: var(--aw-bg-secondary);
}

.aw-panel-filter-btn {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--aw-border);
  border-radius: var(--aw-radius-sm);
  background: var(--aw-bg);
  color: var(--aw-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.aw-panel-filter-btn:hover {
  color: var(--aw-text);
  border-color: var(--aw-primary);
}

.aw-panel-filter-btn.aw-filter-active {
  background: var(--aw-primary);
  color: #fff;
  border-color: var(--aw-primary);
}

/* === Panel Item Scope === */
.aw-panel-item-scope {
  font-size: 11px;
  color: var(--aw-text-secondary);
  background: var(--aw-bg-secondary);
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 4px;
}

.aw-scope-global {
  color: var(--aw-primary);
  font-weight: 500;
}

/* === Toggle Scope Button === */
.aw-btn-toggle-scope {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: var(--aw-radius-sm);
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
  line-height: 1;
}

.aw-btn-toggle-scope:hover {
  background: var(--aw-bg-secondary);
}

.aw-panel-search {
  padding: 10px 16px;
  border-bottom: 1px solid var(--aw-border);
}

.aw-panel-search-input {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--aw-border);
  border-radius: var(--aw-radius-sm);
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.aw-panel-search-input:focus {
  border-color: var(--aw-primary);
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
}

.aw-panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.aw-panel-empty {
  text-align: center;
  padding: 40px 16px;
  color: var(--aw-text-secondary);
  font-size: 14px;
}

.aw-panel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--aw-border);
  cursor: default;
  transition: background 0.1s;
}

.aw-panel-item:hover {
  background: var(--aw-bg-secondary);
}

.aw-panel-item-num {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.aw-panel-item-content {
  flex: 1;
  min-width: 0;
}

.aw-panel-item-text {
  font-size: 13px;
  color: var(--aw-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aw-panel-item-meta {
  font-size: 11px;
  color: var(--aw-text-secondary);
  margin-top: 2px;
}

.aw-panel-item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.aw-btn-small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 8px;
  border: none;
  border-radius: var(--aw-radius-sm);
  background: transparent;
  color: var(--aw-text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.aw-btn-small:hover {
  background: var(--aw-bg-secondary);
  color: var(--aw-text);
}

.aw-btn-edit:hover {
  color: var(--aw-primary);
}

.aw-btn-nav:hover {
  color: var(--aw-success);
}

.aw-btn-del-item:hover {
  color: var(--aw-danger);
}

.aw-panel-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--aw-border);
  background: var(--aw-bg-secondary);
}

.aw-btn-toggle-all,
.aw-btn-export,
.aw-btn-import {
  width: auto !important;
  padding: 0 12px !important;
  font-size: 12px;
  height: 30px !important;
}

.aw-btn-import:hover {
  color: var(--aw-primary);
}

.aw-btn-clear-all {
  background: transparent !important;
  color: var(--aw-danger) !important;
  width: auto !important;
  padding: 0 12px !important;
  font-size: 12px;
  height: 30px !important;
}

.aw-btn-clear-all:hover {
  background: #fde8e8 !important;
}

/* === Scrolling for panel list === */
.aw-panel-list::-webkit-scrollbar {
  width: 6px;
}

.aw-panel-list::-webkit-scrollbar-thumb {
  background: var(--aw-border);
  border-radius: 3px;
}

/* === Keyboard shortcut hint === */
.aw-editor::after {
  content: '';
}
`;
