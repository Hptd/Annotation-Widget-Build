import { isElementVisible } from './utils/dom.js';
import { clearResolveCache } from './selector.js';
import { debounce } from './utils/throttler.js';

export function createObserver(engine) {
  let mutationObserver = null;
  let debouncedHandler = null;
  const intersectionObservers = new Map();

  function init() {
    debouncedHandler = debounce(() => {
      clearResolveCache();
      engine.recheckAllAnnotations();
    }, 200);

    mutationObserver = new MutationObserver(debouncedHandler);

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden']
    });
  }

  function startTracking(annotation) {
    if (annotation.type !== 'element') return;

    const el = engine.resolveAnnotationElement(annotation);
    if (!el) return;

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            const visible = entry.isIntersecting;
            if (annotation._computedVisible !== visible) {
              annotation._computedVisible = visible;
              engine.updateMarkerVisibility(annotation.id, visible);
            }
          }
        },
        { threshold: [0, 0.1] }
      );
      io.observe(el);
      intersectionObservers.set(annotation.id, io);
    }
  }

  function stopTracking(annotationId) {
    const io = intersectionObservers.get(annotationId);
    if (io) {
      io.disconnect();
      intersectionObservers.delete(annotationId);
    }
  }

  function checkVisibility(annotation) {
    if (annotation.type !== 'element') return true;

    const el = engine.resolveAnnotationElement(annotation);
    if (!el) return null; // orphaned

    return isElementVisible(el);
  }

  function checkAllAnnotations(annotations) {
    for (const ann of annotations) {
      if (ann.type !== 'element') continue;
      const visible = checkVisibility(ann);
      engine.updateMarkerVisibility(ann.id, visible);
    }
  }

  function destroy() {
    if (debouncedHandler) {
      debouncedHandler.cancel();
      debouncedHandler = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    for (const io of intersectionObservers.values()) {
      io.disconnect();
    }
    intersectionObservers.clear();
  }

  return { init, startTracking, stopTracking, checkVisibility, checkAllAnnotations, destroy };
}
