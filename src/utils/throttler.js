export function createThrottler(fps = 30) {
  let rafId = null;
  let lastTime = 0;
  const interval = 1000 / fps;

  function schedule(fn) {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(now => {
      rafId = null;
      if (now - lastTime >= interval) {
        lastTime = now;
        fn(now);
      } else {
        schedule(fn);
      }
    });
  }

  function cancel() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return { schedule, cancel };
}

export function debounce(fn, delay = 200) {
  let timer = null;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  }
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  return debounced;
}
