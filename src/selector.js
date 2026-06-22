import { getXPath, resolveXPath, isVueScopedClass } from './utils/xpath.js';

export function generateSelector(element) {
  if (!element || element === document.body || element === document.documentElement) {
    return null;
  }

  const tagName = element.tagName.toLowerCase();
  const xpath = getXPath(element);

  // Build CSS selector
  const cssParts = [];
  let node = element;
  while (node && node !== document.body && node !== document.documentElement) {
    const tag = node.tagName.toLowerCase();
    if (node.id) {
      cssParts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    const parent = node.parentElement;
    let selector = tag;
    if (node.className && typeof node.className === 'string') {
      const classes = node.className
        .trim()
        .split(/\s+/)
        .filter(c => c && !isVueScopedClass(c) && !c.startsWith('el-') && c.length < 30)
        .slice(0, 2);
      if (classes.length) {
        selector += '.' + classes.map(c => CSS.escape(c)).join('.');
      }
    }
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === node.tagName);
      if (siblings.length > 1) {
        selector += `:nth-child(${siblings.indexOf(node) + 1})`;
      }
    }
    cssParts.unshift(selector);
    node = node.parentElement;
  }

  const cssSelector = cssParts.join(' > ');
  const textContent = (element.textContent || '').trim().substring(0, 50);

  return { xpath, cssSelector, tagName, textContent };
}

export function resolveElement(selectorData) {
  if (!selectorData) return null;

  // Try XPath first
  const el = resolveXPath(selectorData.xpath);
  if (el) return el;

  // Try CSS fallback
  try {
    const cssEl = document.querySelector(selectorData.cssSelector);
    if (cssEl) return cssEl;
  } catch {
    // invalid CSS selector
  }

  return null;
}

const resolveCache = new Map();
let cacheTimer = null;

export function resolveElementCached(selectorData) {
  if (!selectorData) return null;
  const key = selectorData.xpath;
  if (resolveCache.has(key)) return resolveCache.get(key);

  const el = resolveElement(selectorData);
  resolveCache.set(key, el);

  if (!cacheTimer) {
    cacheTimer = setTimeout(() => {
      resolveCache.clear();
      cacheTimer = null;
    }, 500);
  }
  return el;
}

export function clearResolveCache() {
  resolveCache.clear();
  if (cacheTimer) {
    clearTimeout(cacheTimer);
    cacheTimer = null;
  }
}
