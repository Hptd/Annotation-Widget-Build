export function createTooltipRenderer() {
  let shadowRoot = null;
  let tooltipEl = null;
  let hideTimer = null;

  function init(sr) {
    shadowRoot = sr;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'aw-tooltip';
    tooltipEl.style.display = 'none';
    shadowRoot.appendChild(tooltipEl);
  }

  function show(text, x, y) {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    tooltipEl.textContent = text;
    tooltipEl.style.display = '';
    tooltipEl.style.left = (x + 12) + 'px';
    tooltipEl.style.top = (y - 8) + 'px';
  }

  function hide() {
    hideTimer = setTimeout(() => {
      tooltipEl.style.display = 'none';
    }, 150);
  }

  function hideImmediate() {
    if (hideTimer) clearTimeout(hideTimer);
    tooltipEl.style.display = 'none';
  }

  function destroy() {
    hideImmediate();
    if (tooltipEl && tooltipEl.parentNode) {
      tooltipEl.parentNode.removeChild(tooltipEl);
    }
  }

  return { init, show, hide, hideImmediate, destroy };
}
