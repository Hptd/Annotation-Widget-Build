export function createEditorRenderer() {
  let shadowRoot = null;
  let editorEl = null;
  let currentAnnotation = null;
  let currentEngine = null;
  let textarea = null;

  function init(sr) {
    shadowRoot = sr;
  }

  function show(annotation, engine) {
    hide();

    currentAnnotation = annotation;
    currentEngine = engine;

    const ro = engine.readOnly;

    editorEl = document.createElement('div');
    editorEl.className = 'aw-editor';
    editorEl.innerHTML = `
      <div class="aw-editor-header">
        <span class="aw-editor-title">标注 #${getAnnotationIndex(annotation)}${ro ? ' (只读)' : ''}</span>
        <div class="aw-editor-colors">
          ${['#4A90D9', '#E74C3C', '#27AE60', '#F39C12', '#9B59B6', '#1ABC9C']
            .map(c => `<span class="aw-color-dot${annotation.content.color === c ? ' aw-color-active' : ''}" data-color="${c}" style="background:${c}${ro ? '; cursor: default; opacity: 0.7' : ''}"></span>`)
            .join('')}
        </div>
      </div>
      <textarea class="aw-editor-textarea" placeholder="输入标注说明..."${ro ? ' readonly' : ''}>${escapeHtml(annotation.content.text)}</textarea>
      <div class="aw-editor-footer">
        ${ro ? '' : '<button class="aw-btn aw-btn-danger">删除</button>'}
        <div class="aw-editor-actions-right">
          <button class="aw-btn aw-btn-cancel">${ro ? '关闭' : '取消'}</button>
          ${ro ? '' : '<button class="aw-btn aw-btn-save">保存</button>'}
        </div>
      </div>
    `;

    // Wire up events
    const saveBtn = editorEl.querySelector('.aw-btn-save');
    const cancelBtn = editorEl.querySelector('.aw-btn-cancel');
    const deleteBtn = editorEl.querySelector('.aw-btn-danger');
    textarea = editorEl.querySelector('.aw-editor-textarea');
    const colorDots = editorEl.querySelectorAll('.aw-color-dot');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const text = textarea.value.trim();
        engine.updateAnnotation(annotation.id, {
          content: { ...annotation.content, text, updatedAt: Date.now() }
        });
        hide();
      });
    }

    cancelBtn.addEventListener('click', () => {
      hide();
    });

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm('确定删除此标注？')) {
          engine.deleteAnnotation(annotation.id);
          hide();
          engine.exitAnnotationMode();
        }
      });
    }

    if (!ro) {
      colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
          const color = dot.dataset.color;
          annotation.content.color = color;
          engine.updateAnnotation(annotation.id, {
            content: { ...annotation.content, color }
          });
          colorDots.forEach(d => d.classList.remove('aw-color-active'));
          dot.classList.add('aw-color-active');
        });
      });
    }

    // Auto-focus textarea
    if (!ro) {
      setTimeout(() => textarea && textarea.focus(), 100);
    }

    // Handle Escape key to close
    editorEl._escHandler = e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        hide();
      }
    };
    document.addEventListener('keydown', editorEl._escHandler);

    // Position editor near the annotation
    positionEditor(annotation);

    shadowRoot.appendChild(editorEl);
  }

  function hide() {
    if (editorEl && editorEl._escHandler) {
      document.removeEventListener('keydown', editorEl._escHandler);
    }
    if (editorEl && editorEl.parentNode) {
      editorEl.parentNode.removeChild(editorEl);
    }
    editorEl = null;
    currentAnnotation = null;
    currentEngine = null;
    textarea = null;
  }

  function isOpen() {
    return editorEl !== null;
  }

  function getAnnotationId() {
    return currentAnnotation ? currentAnnotation.id : null;
  }

  function positionEditor(annotation) {
    if (!editorEl) return;
    const editorWidth = 320;
    const gap = 5;

    let top, left;

    // Position directly below the marker badge
    const markerEl = shadowRoot.querySelector(`[data-annotation-id="${annotation.id}"]`);
    if (markerEl) {
      const mr = markerEl.getBoundingClientRect();
      if (mr.width > 0) {
        top = mr.bottom + gap;
        left = mr.left + mr.width / 2 - editorWidth / 2;
      }
    }

    // Fallback to annotation position if marker not found
    if (top == null) {
      top = (annotation.position.y / 100) * window.innerHeight;
      left = (annotation.position.x / 100) * window.innerWidth - editorWidth / 2;
    }

    // Keep within viewport
    if (left < 16) left = 16;
    if (left + editorWidth > window.innerWidth - 16) {
      left = window.innerWidth - editorWidth - 16;
    }
    if (top < 16) {
      top = 16;
    }
    // Check bottom overflow — reposition above marker if editor goes offscreen
    const editorHeight = editorEl.offsetHeight || 200;
    if (top + editorHeight > window.innerHeight - 16) {
      top = window.innerHeight - editorHeight - 16;
      if (top < 16) top = 16;
    }

    editorEl.style.top = top + 'px';
    editorEl.style.left = left + 'px';
  }

  function getAnnotationIndex(annotation) {
    if (!currentEngine || !currentEngine.store) return '?';
    return currentEngine.store.annotations.findIndex(a => a.id === annotation.id) + 1;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function destroy() {
    hide();
  }

  return { init, show, hide, isOpen, getAnnotationId, destroy };
}
