/* درس‌نامه — tiny observable store backed by a JSON file (via Electron IPC) */
(function () {
  const App = window.App;
  const { normalizeState, deepClone } = App.util;

  const store = {
    state: null,
    ready: false,
    listeners: [],
    _saveTimer: null,

    async init() {
      let raw = null;
      try {
        if (window.api?.loadData) {
          raw = await window.api.loadData();
        } else {
          const saved = localStorage.getItem('darsnameh-data');
          raw = saved ? JSON.parse(saved) : null;
        }
      } catch (error) {
        console.error('failed to load data', error);
      }
      this.state = normalizeState(raw);
      this.ready = true;
      this.persist(true);
      return this.state;
    },

    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter((fn) => fn !== listener);
      };
    },

    emit(reason = 'update') {
      this.listeners.forEach((listener) => {
        try {
          listener(this.state, reason);
        } catch (error) {
          console.error('store listener failed', error);
        }
      });
    },

    update(mutator) {
      mutator(this.state);
      this.persist();
      this.emit();
    },

    replace(nextState) {
      this.state = normalizeState(deepClone(nextState));
      this.persist(true);
      this.emit('replace');
    },

    persist(immediate = false) {
      const write = () => {
        const snapshot = deepClone(this.state);
        if (window.api?.saveData) {
          window.api.saveData(snapshot).catch((error) => console.error('save failed', error));
        } else {
          localStorage.setItem('darsnameh-data', JSON.stringify(snapshot));
        }
      };

      clearTimeout(this._saveTimer);
      if (immediate) write();
      else this._saveTimer = setTimeout(write, 250);
    }
  };

  App.store = store;
})();
