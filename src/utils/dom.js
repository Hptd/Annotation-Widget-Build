export function getElementRect(el) {
  const r = el.getBoundingClientRect();
  return {
    top: r.top + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
    height: r.height,
    bottom: r.bottom + window.scrollY,
    right: r.right + window.scrollX
  };
}

export function isElementVisible(el) {
  if (!el || !el.isConnected) return false;
  if (el.hidden) return false;
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;
  return el.offsetParent !== null || style.position === 'fixed';
}

export function getViewportPercent(clientX, clientY) {
  return {
    x: (clientX / window.innerWidth) * 100,
    y: (clientY / window.innerHeight) * 100
  };
}

export function percentToPixel(pos) {
  return {
    x: (pos.x / 100) * window.innerWidth,
    y: (pos.y / 100) * window.innerHeight
  };
}

export function isAnnotationWidget(el, shadowHost) {
  if (!el) return false;
  let node = el;
  while (node) {
    if (node === shadowHost) return true;
    if (node === document.body) return false;
    node = node.parentElement;
  }
  return false;
}

/**
 * Extract pathname from a full URL string, ignoring query and hash.
 * Works with both absolute URLs and pathname-only strings.
 * Handles SPA hash-routed URLs (e.g. http://localhost/#/dashboard → /dashboard).
 */
export function extractPathname(url) {
  if (!url) return '/';
  try {
    // Try as full URL first
    const u = new URL(url);
    // If the URL uses hash routing (#/prefix), extract the hash path
    if (u.hash && u.hash.startsWith('#/')) {
      return extractPathname(u.hash);
    }
    return u.pathname || '/';
  } catch {
    // Already a pathname-like string — strip query & hash
    // Also handle hash-only paths like '#/dashboard'
    if (url.startsWith('#/')) {
      const cleaned = url.split('?')[0].split('#')[0];
      return cleaned || '/';
    }
    const cleaned = url.split('?')[0].split('#')[0];
    return cleaned || '/';
  }
}

/**
 * Get the current page path for scope matching.
 * Supports SPA hash routing (e.g. /#/dashboard) by extracting the hash path.
 */
export function getCurrentPath() {
  // SPA hash routing: /#/dashboard, /#/users/123
  if (location.hash.startsWith('#/')) {
    return extractPathname(location.hash);
  }
  return location.pathname || '/';
}
