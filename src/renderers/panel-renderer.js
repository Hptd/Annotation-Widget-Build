import { getCurrentPath } from '../utils/dom.js';

export function createPanelRenderer() {
  let shadowRoot = null;
  let panelEl = null;
  let overlayEl = null;
  let currentAnnotations = null;
  let currentEngine = null;
  let filterMode = 'current'; // 'current' | 'all'

  function init(sr) {
    shadowRoot = sr;
  }

  function show(annotations, engine) {
    if (panelEl) hide();

    currentAnnotations = annotations;
    currentEngine = engine;

    // Create overlay
    overlayEl = document.createElement('div');
    overlayEl.className = 'aw-panel-overlay';
    overlayEl.addEventListener('click', hide);

    // Create panel
    panelEl = document.createElement('div');
    panelEl.className = 'aw-panel';

    buildPanelContent();

    shadowRoot.appendChild(overlayEl);
    shadowRoot.appendChild(panelEl);
  }

  function buildPanelContent() {
    // Filter annotations by scope
    const currentPath = getCurrentPath();
    const filtered = filterMode === 'current'
      ? currentAnnotations.filter(a => {
          if (!a.scope || a.scope.type === 'global') return true;
          return a.scope.url === currentPath;
        })
      : currentAnnotations;

    const allCount = currentAnnotations.length;
    const filteredCount = filtered.length;
    const ro = currentEngine && currentEngine.readOnly;

    panelEl.innerHTML = `
      <div class="aw-panel-header">
        <h3 class="aw-panel-title">标注管理 (${filteredCount}${filterMode === 'all' ? ' / ' + allCount : ''})${ro ? ' — 只读模式' : ''}</h3>
        <button class="aw-panel-close" title="关闭">&times;</button>
      </div>
      <div class="aw-panel-filter">
        <button class="aw-panel-filter-btn${filterMode === 'current' ? ' aw-filter-active' : ''}" data-filter="current">当前页面</button>
        <button class="aw-panel-filter-btn${filterMode === 'all' ? ' aw-filter-active' : ''}" data-filter="all">全部 (${allCount})</button>
      </div>
      <div class="aw-panel-search">
        <input type="text" class="aw-panel-search-input" placeholder="搜索标注..." />
      </div>
      <div class="aw-panel-list">
        ${filteredCount === 0 ? '<div class="aw-panel-empty">${filterMode === "current" ? "当前页面暂无标注" : "暂无标注"}</div>' : ''}
      </div>
      <div class="aw-panel-footer">
        <button class="aw-btn aw-btn-toggle-all">${currentEngine.store.settings.visible ? '隐藏全部' : '显示全部'}</button>
        ${ro ? '' : '<button class="aw-btn aw-btn-import">导入 JSON</button>'}
        <button class="aw-btn aw-btn-export">导出 JSON</button>
        ${ro ? '' : '<button class="aw-btn aw-btn-danger aw-btn-clear-all">清空全部</button>'}
      </div>
    `;

    // Wire up filter buttons
    const filterBtns = panelEl.querySelectorAll('.aw-panel-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterMode = btn.dataset.filter;
        buildPanelContent();
        rebindEvents();
      });
    });

    // Wire up events
    panelEl.querySelector('.aw-panel-close').addEventListener('click', hide);

    const listEl = panelEl.querySelector('.aw-panel-list');
    filtered.forEach((ann, i) => {
      const origIndex = currentAnnotations.findIndex(a => a.id === ann.id);
      listEl.appendChild(createListItem(ann, origIndex));
    });

    rebindEvents();
  }

  function rebindEvents() {
    const searchInput = panelEl.querySelector('.aw-panel-search-input');
    const listEl = panelEl.querySelector('.aw-panel-list');

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      const items = listEl.querySelectorAll('.aw-panel-item');
      items.forEach(item => {
        const text = (item.dataset.searchText || '').toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
      });
    });

    const toggleBtn = panelEl.querySelector('.aw-btn-toggle-all');
    toggleBtn.addEventListener('click', () => {
      currentEngine.toggleVisibility();
      toggleBtn.textContent = currentEngine.store.settings.visible ? '隐藏全部' : '显示全部';
    });

    const importBtn = panelEl.querySelector('.aw-btn-import');
    if (importBtn) {
      let importInput = panelEl.querySelector('.aw-import-input');
      if (!importInput) {
        importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = '.json';
        importInput.className = 'aw-import-input';
        importInput.style.display = 'none';
        panelEl.appendChild(importInput);
      }
      importBtn.addEventListener('click', () => {
        importInput.click();
      });
      importInput.addEventListener('change', () => {
        const file = importInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const count = currentEngine.importAnnotations(reader.result);
            if (count > 0) {
              hide();
              show(currentEngine.store.annotations, currentEngine);
            }
          } catch (err) {
            alert('导入失败：' + err.message);
          }
          importInput.value = '';
        };
        reader.readAsText(file);
      });
    }

    panelEl.querySelector('.aw-btn-export').addEventListener('click', () => {
      currentEngine.store && currentEngine.exportAnnotations
        ? currentEngine.exportAnnotations()
        : exportAnnotationsFallback();
    });

    const clearBtn = panelEl.querySelector('.aw-btn-clear-all');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('确定清空全部标注？此操作不可恢复。')) {
          const ids = currentAnnotations.map(a => a.id);
          ids.forEach(id => currentEngine.deleteAnnotation(id));
          hide();
        }
      });
    }
  }

  function createListItem(ann, index) {
    const item = document.createElement('div');
    item.className = 'aw-panel-item';
    const text = ann.content.text || '(空标注)';
    const targetInfo = ann.type === 'element'
      ? (ann.elementSelector?.tagName || '未知元素')
      : '自由浮动';
    const color = ann.content.color || '#4A90D9';
    const orphaned = ann.type === 'element' && ann._computedVisible === null ? ' · 孤立' : '';

    // Build scope display
    const isGlobal = ann.scope?.type === 'global';
    const scopeLabel = isGlobal ? '[全局]' : (ann.scope?.url || '');
    const scopeClass = isGlobal ? 'aw-panel-item-scope aw-scope-global' : 'aw-panel-item-scope';

    const ro = currentEngine && currentEngine.readOnly;

    item.dataset.searchText = text + ' ' + targetInfo + ' ' + scopeLabel;
    item.innerHTML = `
      <span class="aw-panel-item-num" style="background:${color}">${index + 1}</span>
      <div class="aw-panel-item-content">
        <div class="aw-panel-item-text">${escapeHtml(text.substring(0, 80))}${text.length > 80 ? '...' : ''}</div>
        <div class="aw-panel-item-meta">${targetInfo}${orphaned} · <span class="${scopeClass}">${escapeHtml(scopeLabel)}</span></div>
      </div>
      ${ro ? '' : '<div class="aw-panel-item-actions"><button class="aw-btn-small aw-btn-toggle-scope" data-id="' + ann.id + '" title="' + (isGlobal ? '切换为页面标注' : '切换为全局标注') + '">' + (isGlobal ? '📌' : '🌐') + '</button></div>'}
      <div class="aw-panel-item-actions">
        ${ro ? '' : '<button class="aw-btn-small aw-btn-edit" data-id="' + ann.id + '" title="编辑">编辑</button>'}
        <button class="aw-btn-small aw-btn-nav" data-id="${ann.id}" title="导航">定位</button>
        ${ro ? '' : '<button class="aw-btn-small aw-btn-del-item" data-id="' + ann.id + '" title="删除">&times;</button>'}
      </div>
    `;

    // Wire up per-item events
    const scopeToggle = item.querySelector('.aw-btn-toggle-scope');
    if (scopeToggle) {
      scopeToggle.addEventListener('click', e => {
        e.stopPropagation();
        const currentAnn = currentAnnotations.find(a => a.id === ann.id);
        if (!currentAnn) return;
        const newType = currentAnn.scope?.type === 'global' ? 'page' : 'global';
        currentEngine.updateAnnotation(ann.id, {
          scope: { type: newType, url: newType === 'page' ? getCurrentPath() : (currentAnn.scope?.url || getCurrentPath()) }
        });
        // Refresh panel
        hide();
        show(currentEngine.store.annotations, currentEngine);
      });
    }

    const editBtn = item.querySelector('.aw-btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        hide();
        currentEngine.exitAnnotationMode();
        currentEngine.enterAnnotationMode();
        const idx = currentAnnotations.findIndex(a => a.id === ann.id);
        const a = currentAnnotations[idx];
        if (currentEngine._showEditor) {
          currentEngine._showEditor(a);
        }
      });
    }

    item.querySelector('.aw-btn-nav').addEventListener('click', e => {
      e.stopPropagation();
      hide();
      currentEngine.navigateToAnnotation(ann.id);
    });

    const delBtn = item.querySelector('.aw-btn-del-item');
    if (delBtn) {
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('删除此标注？')) {
          currentEngine.deleteAnnotation(ann.id);
          hide();
          show(currentAnnotations.filter(a => a.id !== ann.id), currentEngine);
        }
      });
    }

    return item;
  }

  function hide() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
    }
    if (panelEl && panelEl.parentNode) {
      panelEl.parentNode.removeChild(panelEl);
    }
    overlayEl = null;
    panelEl = null;
  }

  function exportAnnotationsFallback() {
    if (!currentAnnotations) return;
    // Strip internal fields before export
    const clean = currentAnnotations.map(a => {
      const { _computedVisible, _spotX, _spotY, ...rest } = a;
      return rest;
    });
    const data = JSON.stringify(clean, null, 2);
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

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function destroy() {
    hide();
  }

  return { init, show, hide, destroy };
}
