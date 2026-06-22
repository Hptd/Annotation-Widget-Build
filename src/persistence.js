import { extractPathname } from './utils/dom.js';

const STORAGE_KEY = 'annotation_widget_store';
const SCHEMA_VERSION = 1;

const DEFAULT_STORE = {
  version: SCHEMA_VERSION,
  annotations: [],
  settings: {
    annotationMode: false,
    visible: true
  }
};

export function createPersistence() {
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STORE, annotations: [], settings: { ...DEFAULT_STORE.settings } };

      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return createDefault();

      // Schema migration
      if (!data.version) {
        data.version = 1;
      }

      if (!Array.isArray(data.annotations)) {
        data.annotations = [];
      }

      if (!data.settings) {
        data.settings = { ...DEFAULT_STORE.settings };
      }

      // Ensure every annotation has required fields
      data.annotations = data.annotations.filter(a => a && a.id).map(normalizeAnnotation);

      return data;
    } catch {
      return createDefault();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('[AnnotationWidget] localStorage full, export your annotations.');
      }
    }
  }

  function exportJSON(annotations) {
    const data = JSON.stringify(annotations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(jsonString) {
    let imported;
    try {
      imported = JSON.parse(jsonString);
    } catch {
      throw new Error('JSON 格式无效');
    }

    if (!Array.isArray(imported)) {
      // Maybe it's a full store object
      if (imported && Array.isArray(imported.annotations)) {
        imported = imported.annotations;
      } else {
        throw new Error('标注数据格式不正确，需要 JSON 数组');
      }
    }

    return imported.filter(a => a && a.id).map(normalizeAnnotation);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { load, save, exportJSON, importJSON, clear };
}

function createDefault() {
  return {
    version: SCHEMA_VERSION,
    annotations: [],
    settings: { annotationMode: false, visible: true }
  };
}

function normalizeAnnotation(a) {
  // Scope migration: old data without scope → extract from metadata.url
  let scope = a.scope;
  if (!scope) {
    const url = a.metadata?.url || '';
    const pathname = extractPathname(url);
    scope = { type: 'page', url: pathname === '/' || !pathname ? '/' : pathname };
  }

  return {
    id: a.id || '',
    type: a.type || 'element',
    elementSelector: a.elementSelector || null,
    position: a.position || { x: 50, y: 50 },
    offset: a.offset || { top: 0, left: 0, placement: 'auto' },
    scope,
    content: {
      text: a.content?.text || '',
      createdAt: a.content?.createdAt || Date.now(),
      updatedAt: a.content?.updatedAt || Date.now(),
      author: a.content?.author || '',
      color: a.content?.color || '#4A90D9'
    },
    metadata: {
      url: a.metadata?.url || window.location.href,
      viewport: a.metadata?.viewport || { width: window.innerWidth, height: window.innerHeight },
      pageTitle: a.metadata?.pageTitle || document.title
    },
    visible: a.visible !== false,
    _computedVisible: true
  };
}
