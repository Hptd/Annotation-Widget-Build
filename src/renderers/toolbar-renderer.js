export function createToolbarRenderer() {
  let shadowRoot = null;
  let toolbar = null;
  let pinBtn = null;
  let listBtn = null;
  let eyeBtn = null;
  let callbacks = {};
  let readOnly = false;

  function init(sr, cb) {
    shadowRoot = sr;
    callbacks = cb;

    toolbar = document.createElement('div');
    toolbar.className = 'aw-toolbar';
    toolbar.innerHTML = `
      <button class="aw-btn aw-btn-pin" title="标注模式">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2 L12 22 M12 2 L6 8 M12 2 L18 8"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      <button class="aw-btn aw-btn-list" title="标注列表">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      </button>
      <button class="aw-btn aw-btn-eye" title="显示/隐藏标注">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
    `;

    pinBtn = toolbar.querySelector('.aw-btn-pin');
    listBtn = toolbar.querySelector('.aw-btn-list');
    eyeBtn = toolbar.querySelector('.aw-btn-eye');

    pinBtn.addEventListener('click', e => {
      e.stopPropagation();
      callbacks.onPinClick();
    });

    listBtn.addEventListener('click', e => {
      e.stopPropagation();
      callbacks.onListClick();
    });

    eyeBtn.addEventListener('click', e => {
      e.stopPropagation();
      callbacks.onEyeClick();
    });

    if (readOnly) {
      pinBtn.style.display = 'none';
    }

    shadowRoot.appendChild(toolbar);
  }

  function setReadOnly(ro) {
    readOnly = ro;
    if (pinBtn) {
      pinBtn.style.display = ro ? 'none' : '';
    }
  }

  function updateState(state) {
    if (!pinBtn) return;
    if (state === 'annotation-mode') {
      pinBtn.classList.add('aw-active');
    } else {
      pinBtn.classList.remove('aw-active');
    }
  }

  function updateEyeIcon(visible) {
    if (!eyeBtn) return;
    const svg = eyeBtn.querySelector('svg');
    if (visible) {
      svg.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      `;
      eyeBtn.classList.remove('aw-eye-off');
    } else {
      svg.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      `;
      eyeBtn.classList.add('aw-eye-off');
    }
  }

  function destroy() {
    if (toolbar && toolbar.parentNode) {
      toolbar.parentNode.removeChild(toolbar);
    }
  }

  return { init, updateState, updateEyeIcon, setReadOnly, destroy };
}
