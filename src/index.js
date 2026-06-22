import { createEngine, setRenderers } from './engine.js';
import { createMarkerRenderer } from './renderers/marker-renderer.js';
import { createToolbarRenderer } from './renderers/toolbar-renderer.js';
import { createEditorRenderer } from './renderers/editor-renderer.js';
import { createTooltipRenderer } from './renderers/tooltip-renderer.js';
import { createPanelRenderer } from './renderers/panel-renderer.js';
import { STYLES } from './styles.js';

(function () {
  // Prevent double initialization
  if (window.__ANNOTATION_WIDGET_INIT__) return;
  window.__ANNOTATION_WIDGET_INIT__ = true;

  // Wait for DOM ready
  function boot() {
    // Create Shadow DOM host
    const host = document.createElement('div');
    host.id = '__annotation-widget-host__';
    const shadow = host.attachShadow({ mode: 'closed' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLES;
    shadow.appendChild(styleEl);

    // Create renderers
    const markerRenderer = createMarkerRenderer();
    const editorRenderer = createEditorRenderer();
    const tooltipRenderer = createTooltipRenderer();
    const toolbarRenderer = createToolbarRenderer();
    const panelRenderer = createPanelRenderer();

    // Initialize renderers
    markerRenderer.init(shadow);
    editorRenderer.init(shadow);
    tooltipRenderer.init(shadow);
    toolbarRenderer.init(shadow, {
      onPinClick() {
        engine.toggleAnnotationMode();
      },
      onListClick() {
        engine.openPanel();
      },
      onEyeClick() {
        engine.toggleVisibility();
        toolbarRenderer.updateEyeIcon(engine.store.settings.visible);
      }
    });
    panelRenderer.init(shadow);

    // Track which markers already have event listeners to avoid duplicates
    const wiredMarkerIds = new Set();

    // Create the unified renderers API that engine.js uses
    const renderers = {
      getShadowHost() { return host; },

      renderMarker(annotation, index) {
        markerRenderer.render(annotation, index);
        // Wire up marker events (only once per marker)
        if (wiredMarkerIds.has(annotation.id)) return;
        const markerEl = shadow.querySelector(`[data-annotation-id="${annotation.id}"]`);
        if (markerEl) {
          wiredMarkerIds.add(annotation.id);

          // Click to toggle editor
          markerEl.addEventListener('click', e => {
            if (engine.store.settings.annotationMode) return;
            e.stopPropagation();
            if (editorRenderer.isOpen() && editorRenderer.getAnnotationId() === annotation.id) {
              editorRenderer.hide();
            } else {
              editorRenderer.show(annotation, engine);
            }
          });

          // Hover for tooltip
          markerEl.addEventListener('mouseenter', e => {
            const text = annotation.content.text;
            if (text) {
              tooltipRenderer.show(text, e.clientX, e.clientY);
            }
          });
          markerEl.addEventListener('mouseleave', () => {
            tooltipRenderer.hide();
          });

          // Drag to rebind
          markerEl.addEventListener('mousedown', e => {
            if (engine.store.settings.annotationMode) return; // Don't drag in annotation mode
            engine.startDrag(annotation, e);
          });
        }
      },

      updateMarker(annotation, index, targetRect) {
        markerRenderer.update(annotation, index, targetRect);
      },

      removeMarker(id) {
        wiredMarkerIds.delete(id);
        markerRenderer.remove(id);
        tooltipRenderer.hideImmediate();
      },

      setAllMarkersVisible(visible) {
        markerRenderer.setAllVisible(visible);
      },

      renderToolbar() {
        // Toolbar is already initialized by index.js directly — no-op re-render
      },

      updateToolbarState(state) {
        toolbarRenderer.updateState(state);
      },

      showEditor(annotation, engineRef) {
        editorRenderer.show(annotation, engineRef);
      },

      hideEditor() {
        editorRenderer.hide();
      },

      showPanel(annotations, engineRef) {
        panelRenderer.show(annotations, engineRef);
      },

      hidePanel() {
        panelRenderer.hide();
      },

      destroy() {
        clearTimeout(_syncTimer);
        wiredMarkerIds.clear();
        markerRenderer.destroy();
        editorRenderer.destroy();
        tooltipRenderer.destroy();
        toolbarRenderer.destroy();
        panelRenderer.destroy();
        if (host.parentNode) {
          host.parentNode.removeChild(host);
        }
        window.__ANNOTATION_WIDGET_INIT__ = false;
      }
    };

    // Wire up renderers to engine
    setRenderers(renderers);

    // Detect read-only mode (non-localhost = read-only)
    const hostname = window.location.hostname;
    const isReadOnly = hostname !== 'localhost'
      && hostname !== '127.0.0.1'
      && hostname !== '::1'
      && hostname !== '[::1]'
      && !hostname.startsWith('127.')
      && hostname !== '0.0.0.0';

    // Create and initialize engine
    const engine = createEngine();
    engine.readOnly = isReadOnly;

    // Server sync helpers (debounced to avoid excessive POSTs during rapid edits)
    let _syncTimer = null;
    async function saveToServer() {
      if (isReadOnly || !engine.store) return;
      clearTimeout(_syncTimer);
      _syncTimer = setTimeout(async () => {
        try {
          await fetch('/api/annotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(engine.store.annotations)
          });
        } catch { /* ignore */ }
      }, 300);
    }

    async function loadFromServer() {
      try {
        const res = await fetch('/api/annotations');
        if (!res.ok) return [];
        return await res.json();
      } catch { return []; }
    }

    engine._syncToServer = saveToServer;
    engine._loadFromServer = loadFromServer;

    engine.exportAnnotations = function () {
      const { exportJSON } = requirePersistence();
      // Strip internal fields before export
      const clean = engine.store.annotations.map(a => {
        const { _computedVisible, _spotX, _spotY, ...rest } = a;
        return rest;
      });
      exportJSON(clean);
    };

    // Expose engine reference for editor renderer to use
    engine._showEditor = (ann) => {
      editorRenderer.show(ann, engine);
    };

    // Pass readOnly to toolbar
    toolbarRenderer.setReadOnly(isReadOnly);

    // Append host to body and init
    document.body.appendChild(host);
    engine.init();

    // Set initial eye icon state
    toolbarRenderer.updateEyeIcon(engine.store.settings.visible);

    // Expose API globally for programmatic control
    window.__AnnotationWidget = {
      enter: () => engine.enterAnnotationMode(),
      exit: () => engine.exitAnnotationMode(),
      toggle: () => engine.toggleAnnotationMode(),
      showAll: () => engine.showAll(),
      hideAll: () => engine.hideAll(),
      toggleVisibility: () => engine.toggleVisibility(),
      openPanel: () => engine.openPanel(),
      destroy: () => engine.destroy(),
      getAnnotations: () => engine.store?.annotations || [],
      get engine() { return engine; }
    };
  }

  function requirePersistence() {
    // Lazy import - actually just access via engine
    return {
      exportJSON(annotations) {
        const data = JSON.stringify(annotations, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `annotations-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    };
  }

  // Boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
