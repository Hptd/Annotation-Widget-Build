export function createEventBus() {
  const listeners = {};

  return {
    on(event, fn) {
      (listeners[event] || (listeners[event] = [])).push(fn);
    },

    off(event, fn) {
      const arr = listeners[event];
      if (!arr) return;
      const idx = arr.indexOf(fn);
      if (idx > -1) arr.splice(idx, 1);
    },

    emit(event, payload) {
      const arr = listeners[event];
      if (!arr) return;
      for (let i = 0; i < arr.length; i++) {
        arr[i](payload);
      }
    }
  };
}
