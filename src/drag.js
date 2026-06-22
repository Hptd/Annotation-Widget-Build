import { isAnnotationWidget, getViewportPercent } from './utils/dom.js';

export function createDrag(engine, shadowHost) {
  let dragState = null;

  function startDrag(annotation, event) {
    if (event.button !== 0) return; // left button only

    event.preventDefault();
    event.stopPropagation();

    const markerEl = shadowHost.querySelector(`[data-annotation-id="${annotation.id}"]`);
    if (!markerEl) return;

    const ghost = markerEl.cloneNode(true);
    ghost.classList.add('aw-dragging');
    ghost.style.position = 'fixed';
    ghost.style.zIndex = '100000';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.8';
    ghost.style.left = event.clientX - 10 + 'px';
    ghost.style.top = event.clientY - 10 + 'px';
    document.body.appendChild(ghost);

    dragState = {
      annotation,
      ghost,
      startX: event.clientX,
      startY: event.clientY,
      currentTarget: null,
      highlightEl: null
    };

    document.addEventListener('mousemove', onDrag, { passive: false });
    document.addEventListener('mouseup', endDrag);
    // Clean up on window blur or right-click to avoid stuck ghost
    window.addEventListener('blur', cancelDrag);
    document.addEventListener('contextmenu', cancelDrag);
  }

  function onDrag(event) {
    if (!dragState) return;
    event.preventDefault();

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;

    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;

    // Move ghost
    dragState.ghost.style.left = event.clientX - 10 + 'px';
    dragState.ghost.style.top = event.clientY - 10 + 'px';

    // Check target element
    dragState.ghost.style.display = 'none';
    const target = document.elementFromPoint(event.clientX, event.clientY);
    dragState.ghost.style.display = '';

    if (target && !isAnnotationWidget(target, shadowHost) && target !== document.body && target !== document.documentElement) {
      if (target !== dragState.currentTarget) {
        clearHighlight();
        dragState.currentTarget = target;
        showHighlight(target);
      }
    } else {
      clearHighlight();
      dragState.currentTarget = null;
    }
  }

  function endDrag(event) {
    if (!dragState) return;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    window.removeEventListener('blur', cancelDrag);
    document.removeEventListener('contextmenu', cancelDrag);

    clearHighlight();

    dragState.ghost.style.display = 'none';
    const target = document.elementFromPoint(event.clientX, event.clientY);
    dragState.ghost.style.display = '';

    if (target && !isAnnotationWidget(target, shadowHost) && target !== document.body && target !== document.documentElement) {
      engine.rebindAnnotation(dragState.annotation.id, target);
    } else if (!target || target === document.body || target === document.documentElement) {
      // Convert to position annotation
      const pos = getViewportPercent(event.clientX, event.clientY);
      engine.updateAnnotation(dragState.annotation.id, {
        type: 'position',
        elementSelector: null,
        position: pos
      });
    }

    if (dragState.ghost.parentNode) {
      dragState.ghost.parentNode.removeChild(dragState.ghost);
    }
    dragState = null;
  }

  function showHighlight(el) {
    const highlight = document.createElement('div');
    highlight.className = 'aw-highlight-overlay';
    const rect = el.getBoundingClientRect();
    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: rgba(74, 144, 217, 0.15);
      border: 2px solid rgba(74, 144, 217, 0.6);
      border-radius: 2px;
      pointer-events: none;
      z-index: 99999;
    `;
    document.body.appendChild(highlight);
    dragState.highlightEl = highlight;
  }

  function clearHighlight() {
    if (dragState?.highlightEl) {
      if (dragState.highlightEl.parentNode) {
        dragState.highlightEl.parentNode.removeChild(dragState.highlightEl);
      }
      dragState.highlightEl = null;
    }
    dragState && (dragState.currentTarget = null);
  }

  function cancelDrag() {
    if (!dragState) return;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    window.removeEventListener('blur', cancelDrag);
    document.removeEventListener('contextmenu', cancelDrag);
    clearHighlight();
    if (dragState.ghost?.parentNode) {
      dragState.ghost.parentNode.removeChild(dragState.ghost);
    }
    dragState = null;
  }

  return { startDrag, cancelDrag };
}
