import { percentToPixel } from '../utils/dom.js';

export function createMarkerRenderer() {
  let shadowRoot = null;
  let container = null;
  const markers = new Map();

  function init(sr) {
    shadowRoot = sr;
    container = document.createElement('div');
    container.className = 'aw-markers-container';
    shadowRoot.appendChild(container);
  }

  function render(annotation, index) {
    if (markers.has(annotation.id)) {
      update(annotation, index);
      return;
    }

    const marker = document.createElement('div');
    marker.className = 'aw-marker';
    marker.setAttribute('data-annotation-id', annotation.id);
    marker.innerHTML = `<span class="aw-marker-badge" style="color:${annotation.content.color || '#4A90D9'}"><svg class="aw-marker-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M921.6 409.6c0 307.2-327.68 614.4-409.6 614.4S102.4 716.8 102.4 409.6C102.4 183.37792 285.77792 0 512 0s409.6 183.37792 409.6 409.6z" fill="currentColor"/></svg><span class="aw-marker-number">${index + 1}</span></span>`;
    marker.addEventListener('click', e => {
      e.stopPropagation();
    });

    container.appendChild(marker);
    markers.set(annotation.id, marker);
    update(annotation, index);
  }

  function update(annotation, index, targetRect) {
    const marker = markers.get(annotation.id);
    if (!marker) return;

    const badge = marker.querySelector('.aw-marker-badge');
    if (badge) {
      const numEl = badge.querySelector('.aw-marker-number');
      if (numEl) numEl.textContent = index + 1;
      badge.style.color = annotation.content.color || '#4A90D9';
    }

    // Determine visibility
    // Position annotations: always visible (free-floating)
    // Element annotations: only visible when element exists AND is visible
    //   _computedVisible = true  → element found, visible → show
    //   _computedVisible = false → element found, hidden → hide
    //   _computedVisible = null  → element not in DOM → hide (orphaned status shown in panel)
    const globalVisible = container.style.display !== 'none';
    const selfVisible = annotation.visible !== false;
    const elVisible = annotation._computedVisible === true;
    const isVisible = globalVisible && selfVisible &&
      (annotation.type === 'position' || elVisible);

    if (!isVisible) {
      marker.style.display = 'none';
      return;
    }

    marker.style.display = '';

    // Element-bound with a valid target: position relative to the element + click offset
    if (annotation.type === 'element' && annotation.elementSelector && elVisible && targetRect) {
      const ox = (annotation.offset && annotation.offset.left != null) ? annotation.offset.left : 0;
      const oy = (annotation.offset && annotation.offset.top != null)  ? annotation.offset.top  : -10;
      // If using legacy placement (no click offset), position at element top-right
      const useLegacy = !annotation.offset || annotation.offset.placement !== 'click';
      marker.style.position = 'fixed';
      if (useLegacy) {
        marker.style.left = (targetRect.right + 4) + 'px';
        marker.style.top = (targetRect.top - 10) + 'px';
        marker.style.transform = 'none';
      } else {
        marker.style.left = (targetRect.left + ox) + 'px';
        marker.style.top = (targetRect.top + oy) + 'px';
        marker.style.transform = 'translate(-50%, -50%)';
      }
      marker.classList.remove('aw-marker-orphaned');
    } else {
      // Position-based rendering (free-floating, orphaned, or initial placement)
      // Prefer raw pixel coords (_spotX/_spotY) over viewport-percent conversion
      let px, py;
      if (annotation._spotX != null && annotation._spotY != null) {
        px = annotation._spotX;
        py = annotation._spotY;
      } else {
        const pp = percentToPixel(annotation.position);
        px = pp.x;
        py = pp.y;
      }
      marker.style.position = 'fixed';
      marker.style.left = px + 'px';
      marker.style.top = py + 'px';
      marker.style.transform = 'translate(-50%, -50%)';

      if (annotation._computedVisible === null && annotation.type === 'element') {
        marker.classList.add('aw-marker-orphaned');
      } else {
        marker.classList.remove('aw-marker-orphaned');
      }
    }
  }

  function remove(id) {
    const marker = markers.get(id);
    if (marker && marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
    markers.delete(id);
  }

  function setAllVisible(visible) {
    container.style.display = visible ? '' : 'none';
  }

  function destroy() {
    for (const [, marker] of markers) {
      if (marker.parentNode) marker.parentNode.removeChild(marker);
    }
    markers.clear();
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  return { init, render, update, remove, setAllVisible, destroy };
}
