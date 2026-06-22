export function getXPath(element) {
  if (!element || element === document.body) return '/html/body';
  if (element === document.documentElement) return '/html';
  if (element.id) return `//*[@id="${element.id}"]`;

  const parts = [];
  let node = element;
  while (node && node !== document.body && node !== document.documentElement) {
    let segment = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`*[@id="${node.id}"]`);
      break;
    }
    const parent = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        c => c.tagName === node.tagName
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(node) + 1;
        segment += `[${idx}]`;
      }
    }
    parts.unshift(segment);
    node = node.parentElement;
  }
  if (node === document.body) parts.unshift('body');
  else if (node === document.documentElement) parts.unshift('html');
  return '/' + parts.join('/');
}

export function resolveXPath(xpath) {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  } catch {
    return null;
  }
}

export function isVueScopedClass(className) {
  return /^data-v-/.test(className);
}
