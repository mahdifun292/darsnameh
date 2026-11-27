/* درس‌نامه — tiny observable store backed by a JSON file (via Electron IPC)
   Data is stored as a multi-user envelope:
   { schema: 2, activeUserId, users: [{ id, name, createdAt, data }] }
   Legacy single-state files are migrated into one account automatically. */
(function () {
  const App = window.App;
  const { normalizeState, deepClone, makeDefaultState, uid } = App.util;

  const SCHEMA = 2;

  function cleanName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  }

  function makeUser(data, name, createdAt) {
    return {
      id: uid('user'),
      name: cleanName(name) || 'کاربر',
      createdAt: createdAt || new Date().toISOString(),
      data
    };
  }

  function normalizeEnvelope(raw) {
    if (raw && raw.schema === SCHEMA && Array.isArray(raw.users) && raw.users.length) {
      const users = raw.users
        .filter((user) => user && typeof user === 'object')
        .map((user, index) => {
          const data = normalizeState(user.data);
          return {
            id: user.id || uid('user'),
            name: cleanName(user.name) || cleanName(data.profile?.name) || `کاربر ${index + 1}`,
            createdAt: user.createdAt || data.createdAt || new Date().toISOString(),
            data
          };
        });
      if (users.length) {
        const activeUserId = users.some((user) => user.id === raw.activeUserId)
          ? raw.activeUserId
          : users[0].id;
        return { schema: SCHEMA, activeUserId, users };
      }
    }

    // Legacy single-state backup or a brand-new/empty data file.
    const hasState = raw && typeof raw === 'object' && (
      raw.profile || raw.settings || raw.subjects || raw.schedule ||
      raw.homework || raw.exams || raw.manualGrades || raw.pomodoroSessions
    );
    const data = normalizeState(hasState ? raw : null);
    const user = makeUser(data, data.profile?.name || 'کاربر اصلی', data.createdAt);
    return { schema: SCHEMA, activeUserId: user.id, users: [user] };
  }

  const store = {
    state: null,
    ready: false,
    listeners: [],
    users: [],
    activeUserId: null,
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

      const envelope = normalizeEnvelope(raw);
      this.users = envelope.users;
      this.activeUserId = envelope.activeUserId;
      this.state = this.users.find((user) => user.id === this.activeUserId).data;
      this.ready = true;
      this.persist(true);
      return this.state;
    },

    activeUser() {
      return this.users.find((user) => user.id === this.activeUserId) || null;
    },

    switchUser(id) {
      if (!id || id === this.activeUserId) return false;
      const user = this.users.find((item) => item.id === id);
      if (!user) return false;
      this.activeUserId = user.id;
      this.state = user.data;
      this.persist(true);
      this.emit('user');
      return true;
    },

    createUser(name) {
      const displayName = cleanName(name);
      const data = makeDefaultState();
      data.profile.name = displayName;
      const user = makeUser(data, displayName || 'کاربر جدید', data.createdAt);
      this.users.push(user);
      this.activeUserId = user.id;
      this.state = user.data;
      this.persist(true);
      this.emit('user');
      return user;
    },

    renameUser(id, name) {
      const user = this.users.find((item) => item.id === id);
      const nextName = cleanName(name);
      if (!user || !nextName) return false;
      user.name = nextName;
      user.data.profile.name = nextName;
      if (user.id === this.activeUserId) this.state.profile.name = nextName;
      this.persist(true);
      this.emit(user.id === this.activeUserId ? 'update' : 'users');
      return true;
    },

    deleteUser(id) {
      if (this.users.length <= 1) {
        return { ok: false, error: 'حداقل یک کاربر باید باقی بماند.' };
      }
      const user = this.users.find((item) => item.id === id);
      if (!user) return { ok: false, error: 'کاربر پیدا نشد.' };
      const wasActive = id === this.activeUserId;
      this.users = this.users.filter((item) => item.id !== id);
      if (wasActive) {
        this.activeUserId = this.users[0].id;
        this.state = this.users[0].data;
      }
      this.persist(true);
      this.emit(wasActive ? 'user' : 'users');
      return { ok: true, active: this.state };
    },

    exportSnapshot() {
      return deepClone(this._envelope());
    },

    importSnapshot(raw) {
      const envelope = normalizeEnvelope(raw);
      this.users = envelope.users;
      this.activeUserId = envelope.activeUserId;
      this.state = this.users.find((user) => user.id === this.activeUserId).data;
      this.persist(true);
      this.emit('replace');
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
      const active = this.activeUser();
      if (active) active.data = this.state;
      this.persist(true);
      this.emit('replace');
    },

    _syncActiveName() {
      const active = this.activeUser();
      const profileName = cleanName(this.state?.profile?.name);
      if (active && profileName) active.name = profileName;
    },

    _envelope() {
      this._syncActiveName();
      return {
        schema: SCHEMA,
        activeUserId: this.activeUserId,
        users: this.users.map((user) => ({
          id: user.id,
          name: user.name,
          createdAt: user.createdAt,
          data: user.id === this.activeUserId ? this.state : user.data
        }))
      };
    },

    persist(immediate = false) {
      this._syncActiveName();
      const write = () => {
        const snapshot = deepClone(this._envelope());
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
