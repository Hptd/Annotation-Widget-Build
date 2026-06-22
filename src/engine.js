import { uuid } from './utils/uuid.js';
import { createEventBus } from './utils/event-bus.js';
import { generateSelector, resolveElementCached, clearResolveCache } from './selector.js';
import { createObserver } from './observer.js';
import { createPersistence } from './persistence.js';
import { createDrag } from './drag.js';
import { isElementVisible, getViewportPercent, getCurrentPath, extractPathname } from './utils/dom.js';

// Renderers will be set after initialization (to avoid circular dependency)
let renderers = {};

export function setRenderers(r) {
  renderers = r;
}

export function createEngine() {
  const bus = createEventBus();
  const observer = createObserver(null); // engine ref set below
  const persistence = createPersistence();

  let store = null;
  let drag = null;
  let selectedAnnotationId = null;
  let resolveElFn = null;

  // Hover highlight state (annotation mode)
  let _hoveredElement = null;
  let _highlightEl = null;
  let _isCreating = false;

  const engine = {
    bus,
    store: null,

    init() {
      if (this.readOnly) {
        store = { version: 1, annotations: [], settings: { annotationMode: false, visible: true } };
        this.store = store;

        const obs = createObserver(this);
        Object.assign(observer, obs);
        observer.init();

        window.addEventListener('scroll', this._handleScroll, { passive: true });
        window.addEventListener('resize', this._handleResize);

        // Load from server, then poll
        this._pollFromServer();
        this._pollTimer = setInterval(() => this._pollFromServer(), 10000);

        renderers.renderToolbar();
        bus.emit('INITIALIZED', { annotations: [] });
        return;
      }

      store = persistence.load();
      this.store = store;

      // Create drag system
      drag = createDrag(this, renderers.getShadowHost());

      // Wire up observer engine ref
      const obs = createObserver(this);
      Object.assign(observer, obs);

      observer.init();
      this.recheckAllAnnotations();

      // Global click handler for annotation mode
      document.addEventListener('click', this._handlePageClick, true);

      // Scroll/resize tracking
      window.addEventListener('scroll', this._handleScroll, { passive: true });
      window.addEventListener('resize', this._handleResize);

      // Keyboard shortcut: Ctrl+Shift+A to toggle annotation mode
      window.addEventListener('keydown', this._handleKeydown);

      // Restore all markers (only those in current page scope)
      for (let i = 0; i < store.annotations.length; i++) {
        const ann = store.annotations[i];
        if (!this._isAnnotationInScope(ann)) continue;
        if (ann.type === 'element') {
          observer.startTracking(ann);
        }
        renderers.renderMarker(ann, i);
      }

      renderers.renderToolbar();
      this._syncVisibility();

      // Sync initial state to server
      if (this._syncToServer) {
        setTimeout(() => this._syncToServer(), 500);
      }

      bus.emit('INITIALIZED', { annotations: store.annotations });
    },

    _pollFromServer() {
      if (!this._loadFromServer || !store) return;
      this._loadFromServer().then(data => {
        if (!Array.isArray(data)) return;
        const currentSnapshot = JSON.stringify(store.annotations.map(a => ({
          id: a.id, text: a.content?.text, color: a.content?.color, type: a.type, visible: a.visible
        })));
        const newSnapshot = JSON.stringify(data.map(a => ({
          id: a.id, text: a.content?.text, color: a.content?.color, type: a.type, visible: a.visible
        })));
        if (currentSnapshot !== newSnapshot) {
          for (const a of store.annotations) {
            renderers.removeMarker(a.id);
          }
          store.annotations = data;
          for (let i = 0; i < store.annotations.length; i++) {
            const ann = store.annotations[i];
            if (!this._isAnnotationInScope(ann)) continue;
            if (ann.type === 'element') {
              observer.startTracking(ann);
            }
            renderers.renderMarker(ann, i);
          }
          this.recheckAllAnnotations();
          bus.emit('STORAGE_CHANGED', { annotations: store.annotations });
        }
      }).catch(() => { /* ignore network errors */ });
    },

    enterAnnotationMode() {
      if (this.readOnly) return;
      store.settings.annotationMode = true;
      persistence.save(store);
      renderers.updateToolbarState('annotation-mode');
      document.body.style.cursor = 'crosshair';
      document.addEventListener('mousemove', _handleMouseMove, { passive: true });
      bus.emit('ANNOTATION_MODE_ON');
    },

    exitAnnotationMode() {
      store.settings.annotationMode = false;
      persistence.save(store);
      renderers.updateToolbarState('idle');
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', _handleMouseMove);
      _clearHoverHighlight();
      renderers.hideEditor();
      bus.emit('ANNOTATION_MODE_OFF');
    },

    toggleAnnotationMode() {
      if (store.settings.annotationMode) {
        this.exitAnnotationMode();
      } else {
        this.enterAnnotationMode();
      }
    },

    _handlePageClick(e) {
      if (!store || !store.settings.annotationMode || _isCreating) return;

      // Ignore clicks on the widget itself
      const shadowHost = renderers.getShadowHost();
      if (!shadowHost) return;

      // Check if click target is inside shadow host
      let node = e.target;
      while (node) {
        if (node === shadowHost) return;
        node = node.parentElement;
      }

      // Don't intercept clicks on annotation badges
      // Use composedPath to pierce through retargeted Shadow DOM events
      const path = e.composedPath();
      if (path.some(el => el instanceof Element && el.hasAttribute && el.hasAttribute('data-annotation-id'))) return;

      // Prevent re-entry during creation
      _isCreating = true;

      // Get the element directly from the click event (composedPath for shadow-piercing)
      const composedTarget = e.composedPath()[0];
      // Never use hoveredElement if click is on body/html — creates wrong annotation type
      const isBodyOrDoc = !composedTarget || composedTarget === document.body || composedTarget === document.documentElement;
      const target = (!isBodyOrDoc && _hoveredElement) ? _hoveredElement : composedTarget;

      if (!target || target === document.body || target === document.documentElement) {
        engine.createPositionAnnotation(e.clientX, e.clientY);
      } else if (target.nodeType === 1) {
        engine.createElementAnnotation(target, e.clientX, e.clientY);
      }

      _isCreating = false;
    },

    createElementAnnotation(element, clickX, clickY) {
      if (this.readOnly) return;
      const selector = generateSelector(element);
      if (!selector) return;

      const rect = element.getBoundingClientRect();
      const id = uuid();
      const now = Date.now();

      // Default to element center if no click coordinates
      const cx = clickX != null ? clickX : rect.left + rect.width / 2;
      const cy = clickY != null ? clickY : rect.top;

      // Pixel offset from element top-left (for element-bound positioning)
      const ox = cx - rect.left;
      const oy = cy - rect.top;

      const annotation = {
        id,
        type: 'element',
        elementSelector: selector,
        position: getViewportPercent(cx, cy),
        offset: { top: oy, left: ox, placement: 'click' },
        scope: { type: 'page', url: getCurrentPath() },
        // Raw pixel position at creation time — used for initial marker placement
        _spotX: cx,
        _spotY: cy,
        content: {
          text: '',
          createdAt: now,
          updatedAt: now,
          author: '',
          color: '#4A90D9'
        },
        metadata: {
          url: window.location.href,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          pageTitle: document.title
        },
        visible: true,
        _computedVisible: true
      };

      store.annotations.push(annotation);
      persistence.save(store);

      const index = store.annotations.length - 1;
      // Render marker BEFORE starting observer, so IntersectionObserver's
      // initial callback doesn't hide the marker before it first appears
      renderers.renderMarker(annotation, index);
      // Position marker at the element with click offset immediately
      const elRect = element.getBoundingClientRect();
      renderers.updateMarker(annotation, index, elRect);
      renderers.showEditor(annotation, engine);
      selectedAnnotationId = id;

      // Start visibility tracking after initial render
      observer.startTracking(annotation);

      if (this._syncToServer) this._syncToServer();
      bus.emit('ANNOTATION_ADD', { annotation, index });
    },

    createPositionAnnotation(clientX, clientY) {
      if (this.readOnly) return;
      const id = uuid();
      const now = Date.now();

      const annotation = {
        id,
        type: 'position',
        elementSelector: null,
        position: getViewportPercent(clientX, clientY),
        offset: { top: 0, left: 0, placement: 'auto' },
        scope: { type: 'page', url: getCurrentPath() },
        _spotX: clientX,
        _spotY: clientY,
        content: {
          text: '',
          createdAt: now,
          updatedAt: now,
          author: '',
          color: '#4A90D9'
        },
        metadata: {
          url: window.location.href,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          pageTitle: document.title
        },
        visible: true,
        _computedVisible: true
      };

      store.annotations.push(annotation);
      persistence.save(store);

      const index = store.annotations.length - 1;
      renderers.renderMarker(annotation, index);
      renderers.showEditor(annotation, engine);
      selectedAnnotationId = id;

      if (this._syncToServer) this._syncToServer();
      bus.emit('ANNOTATION_ADD', { annotation, index });
    },

    updateAnnotation(id, changes) {
      if (this.readOnly) return;
      const idx = store.annotations.findIndex(a => a.id === id);
      if (idx === -1) return;

      const ann = store.annotations[idx];

      if (changes.content) {
        Object.assign(ann.content, changes.content);
        ann.content.updatedAt = Date.now();
      }
      if (changes.position) ann.position = changes.position;
      if (changes.type !== undefined) ann.type = changes.type;
      if (changes.elementSelector !== undefined) ann.elementSelector = changes.elementSelector;
      if (changes.offset) Object.assign(ann.offset, changes.offset);
      if (changes.visible !== undefined) ann.visible = changes.visible;
      if (changes.scope) {
        if (!ann.scope) ann.scope = {};
        Object.assign(ann.scope, changes.scope);
      }

      persistence.save(store);
      this._updateMarkerWithRect(ann, idx);
      if (this._syncToServer) this._syncToServer();
      bus.emit('ANNOTATION_UPDATE', { annotation: ann, index: idx });
    },

    deleteAnnotation(id) {
      if (this.readOnly) return;
      const idx = store.annotations.findIndex(a => a.id === id);
      if (idx === -1) return;

      observer.stopTracking(id);
      store.annotations.splice(idx, 1);
      persistence.save(store);
      renderers.removeMarker(id);
      renderers.hideEditor();

      if (selectedAnnotationId === id) selectedAnnotationId = null;

      // Re-index remaining markers
      for (let i = 0; i < store.annotations.length; i++) {
        this._updateMarkerWithRect(store.annotations[i], i);
      }

      if (this._syncToServer) this._syncToServer();
      bus.emit('ANNOTATION_DELETE', { id, index: idx });
    },

    rebindAnnotation(id, newElement) {
      if (this.readOnly) return;
      const idx = store.annotations.findIndex(a => a.id === id);
      if (idx === -1) return;

      const annotation = store.annotations[idx];
      const selector = generateSelector(newElement);

      if (selector) {
        observer.stopTracking(id);
        annotation.type = 'element';
        annotation.elementSelector = selector;
        const rect = newElement.getBoundingClientRect();
        annotation.position = getViewportPercent(rect.left, rect.top);
        annotation.offset = { top: 0, left: 0, placement: 'auto' };
        annotation._computedVisible = isElementVisible(newElement);
        observer.startTracking(annotation);
      } else {
        // Element cannot be identified — convert to position annotation
        observer.stopTracking(id);
        annotation.type = 'position';
        annotation.elementSelector = null;
        annotation._computedVisible = true;
      }

      annotation.content.updatedAt = Date.now();
      persistence.save(store);
      clearResolveCache();
      this._updateMarkerWithRect(annotation, idx);
      if (this._syncToServer) this._syncToServer();
      bus.emit('ANNOTATION_REBIND', { annotation, index: idx });
    },

    resolveAnnotationElement(annotation) {
      if (annotation.type !== 'element' || !annotation.elementSelector) return null;
      return resolveElementCached(annotation.elementSelector);
    },

    _getAnnotationRect(ann) {
      if (ann.type === 'element' && ann.elementSelector) {
        const el = this.resolveAnnotationElement(ann);
        if (el && isElementVisible(el)) {
          return el.getBoundingClientRect();
        }
      }
      return null;
    },

    // Check if annotation belongs to current page scope
    _isAnnotationInScope(ann) {
      if (!ann.scope) return true; // no scope data → global fallback
      if (ann.scope.type === 'global') return true;
      if (ann.scope.type === 'page') {
        const current = getCurrentPath();
        const scopeUrl = extractPathname(ann.scope.url);
        return current === scopeUrl;
      }
      return true; // unknown scope type → global fallback
    },

    _updateMarkerWithRect(ann, idx) {
      // Remove marker for annotations not in current page scope
      if (!this._isAnnotationInScope(ann)) {
        renderers.removeMarker(ann.id);
        return;
      }
      // Re-create if marker was removed (e.g. navigating back to this page)
      renderers.renderMarker(ann, idx);
      const rect = this._getAnnotationRect(ann);
      renderers.updateMarker(ann, idx, rect);
    },

    recheckAllAnnotations() {
      for (let i = 0; i < store.annotations.length; i++) {
        const ann = store.annotations[i];
        if (!this._isAnnotationInScope(ann)) {
          renderers.removeMarker(ann.id);
          continue;
        }
        if (ann.type !== 'element') {
          renderers.updateMarker(ann, i, null);
          continue;
        }

        const el = this.resolveAnnotationElement(ann);
        if (!el) {
          ann._computedVisible = null; // orphaned
        } else {
          ann._computedVisible = isElementVisible(el);
        }
        this._updateMarkerWithRect(ann, i);
      }
    },

    updateMarkerVisibility(id, visible) {
      const idx = store.annotations.findIndex(a => a.id === id);
      if (idx === -1) return;
      store.annotations[idx]._computedVisible = visible;
      this._updateMarkerWithRect(store.annotations[idx], idx);
    },

    showAll() {
      store.settings.visible = true;
      for (const ann of store.annotations) ann.visible = true;
      persistence.save(store);
      this._syncVisibility();
      this.recheckAllAnnotations();
    },

    hideAll() {
      store.settings.visible = false;
      persistence.save(store);
      this._syncVisibility();
    },

    toggleVisibility() {
      if (store.settings.visible) {
        this.hideAll();
      } else {
        this.showAll();
      }
    },

    _syncVisibility() {
      const visible = store.settings.visible;
      renderers.setAllMarkersVisible(visible);
    },

    navigateToAnnotation(id) {
      const ann = store.annotations.find(a => a.id === id);
      if (!ann) return;

      if (ann.type === 'element' && ann.elementSelector) {
        const el = this.resolveAnnotationElement(ann);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Flash highlight
          this._flashElement(el);
        }
      } else {
        // Scroll to position
        const px = (ann.position.x / 100) * window.innerWidth;
        window.scrollTo({ left: px - window.innerWidth / 2, behavior: 'smooth' });
      }

      bus.emit('ANNOTATION_SELECT', { id });
    },

    _flashElement(el) {
      const overlay = document.createElement('div');
      const rect = el.getBoundingClientRect();
      overlay.style.cssText = `
        position: absolute;
        left: ${rect.left + window.scrollX}px;
        top: ${rect.top + window.scrollY}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background: rgba(74, 144, 217, 0.2);
        border: 2px solid #4A90D9;
        border-radius: 2px;
        pointer-events: none;
        z-index: 99999;
        transition: opacity 0.5s;
      `;
      document.body.appendChild(overlay);
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.parentNode && overlay.parentNode.removeChild(overlay), 500);
      }, 1500);
    },

    _handleScroll() {
      if (!store) return;
      // Throttle with rAF to avoid jank with many annotations
      if (this._scrollRaf) return;
      this._scrollRaf = true;
      requestAnimationFrame(() => {
        this._scrollRaf = false;
        if (!store) return;
        for (let i = 0; i < store.annotations.length; i++) {
          this._updateMarkerWithRect(store.annotations[i], i);
        }
      });
    },

    _handleResize() {
      if (!store) return;
      clearResolveCache();
      this.recheckAllAnnotations();
    },

    _handleKeydown(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        this.toggleAnnotationMode();
      }
    },

    _updateHoverHighlight(el) {
      _clearHoverHighlight();
      _hoveredElement = el;
      const rect = el.getBoundingClientRect();
      _highlightEl = document.createElement('div');
      _highlightEl.className = 'aw-hover-highlight';
      _highlightEl.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background: rgba(74, 144, 217, 0.08);
        border: 2px solid #4A90D9;
        border-radius: 2px;
        pointer-events: none;
        z-index: 99999;
        transition: none;
      `;
      document.body.appendChild(_highlightEl);
    },

    startDrag(annotation, event) {
      if (drag) drag.startDrag(annotation, event);
    },

    importAnnotations(jsonString) {
      if (this.readOnly) return 0;
      const imported = persistence.importJSON(jsonString);
      let added = 0;
      for (const ann of imported) {
        // Skip duplicates by id
        if (store.annotations.some(a => a.id === ann.id)) continue;
        // Ensure scope exists on imported data
        if (!ann.scope) {
          ann.scope = { type: 'page', url: getCurrentPath() };
        }
        ann._computedVisible = true;
        store.annotations.push(ann);
        if (ann.type === 'element') {
          observer.startTracking(ann);
        }
        added++;
      }
      if (added > 0) {
        persistence.save(store);
        clearResolveCache();
        this.recheckAllAnnotations();
        // Re-render all in-scope markers
        for (let i = 0; i < store.annotations.length; i++) {
          if (!this._isAnnotationInScope(store.annotations[i])) continue;
          renderers.renderMarker(store.annotations[i], i);
        }
        if (this._syncToServer) this._syncToServer();
        bus.emit('STORAGE_CHANGED', { annotations: store.annotations });
      }
      return added;
    },

    openPanel() {
      renderers.showPanel(store.annotations, engine);
      bus.emit('PANEL_OPEN');
    },

    closePanel() {
      renderers.hidePanel();
      bus.emit('PANEL_CLOSE');
    },

    destroy() {
      if (this._pollTimer) {
        clearInterval(this._pollTimer);
        this._pollTimer = null;
      }
      if (this._scrollRaf) {
        this._scrollRaf = false;
      }
      document.removeEventListener('click', this._handlePageClick, true);
      document.removeEventListener('mousemove', _handleMouseMove);
      window.removeEventListener('scroll', this._handleScroll);
      window.removeEventListener('resize', this._handleResize);
      window.removeEventListener('keydown', this._handleKeydown);
      observer.destroy();
      renderers.destroy();
      document.body.style.cursor = '';
      _clearHoverHighlight();
      store = null;
    }
  };

  function _clearHoverHighlight() {
    if (_highlightEl && _highlightEl.parentNode) {
      _highlightEl.parentNode.removeChild(_highlightEl);
    }
    _highlightEl = null;
    _hoveredElement = null;
  }

  function _handleMouseMove(e) {
    if (!store || !store.settings.annotationMode) return;

    const shadowHost = renderers.getShadowHost();
    if (!shadowHost) return;

    // Hide ghost briefly to get the element underneath
    let target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) return;

    // Skip the shadow host itself and its children
    let node = target;
    while (node) {
      if (node === shadowHost) return;
      node = node.parentElement;
    }

    // Skip body/html
    if (target === document.body || target === document.documentElement) {
      _clearHoverHighlight();
      return;
    }

    // Skip non-element nodes
    if (target.nodeType !== 1) {
      _clearHoverHighlight();
      return;
    }

    if (target !== _hoveredElement) {
      engine._updateHoverHighlight(target);
    }
  }

  return engine;
}
