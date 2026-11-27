/* درس‌نامه — app shell, router and boot */
(function () {
  const App = window.App;
  const u = App.util;
  const { icon } = App.icons;

  const NAV = [
    { id: 'home', label: 'خانه', icon: 'home' },
    { id: 'schedule', label: 'برنامه هفتگی', icon: 'calendar' },
    { id: 'homework', label: 'تکالیف', icon: 'tasks' },
    { id: 'exams', label: 'امتحانات', icon: 'exam' },
    { id: 'summary', label: 'برنامه', icon: 'table' },
    { id: 'grades', label: 'نمرات', icon: 'award' },
    { id: 'study', label: 'مطالعه عصرانه', icon: 'timer' },
    { id: 'ai', label: 'مشاور هوشمند', icon: 'sparkles' }
  ];

  App.view = { page: 'home', lastPage: null };
  App.info = null;

  function resolveTheme(state) {
    if (state.settings.theme === 'system') {
      return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return state.settings.theme === 'light' ? 'light' : 'dark';
  }

  function applyTheme(state) {
    const root = document.documentElement;
    root.dataset.theme = resolveTheme(state);
    root.dataset.accent = state.settings.accent || 'violet';
  }

  function buildShell() {
    const state = App.store.state;
    const app = document.getElementById('app');
    const name = state.profile.name || 'دانش‌آموز';
    const initial = name.trim().charAt(0) || 'د';
    app.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand">
            ${App.icons.logo(42)}
            <div class="brand-text"><strong>درس‌نامه</strong><span>برنامه‌ریز درسی</span></div>
          </div>

          <nav class="nav" aria-label="ناوبری اصلی">
            <span class="nav-label">فضای مطالعه</span>
            ${NAV.map((item) => `
              <a class="nav-item" data-page="${item.id}" href="#/${item.id}">
                ${icon(item.icon, 19)}
                <span class="nav-text">${item.label}</span>
                ${item.id === 'homework' ? '<span class="nav-badge hidden" data-badge="homework"></span>' : ''}
                ${item.id === 'exams' ? '<span class="nav-badge warn hidden" data-badge="exams"></span>' : ''}
              </a>
            `).join('')}
            <span class="nav-label" style="margin-top:8px">مدیریت</span>
            <a class="nav-item" data-page="settings" href="#/settings">
              ${icon('settings', 19)}
              <span class="nav-text">تنظیمات</span>
            </a>
          </nav>

          <div class="sidebar-foot">
            <div class="side-profile">
              <span class="avatar" id="side-avatar">${u.escapeHtml(initial)}</span>
              <div class="side-profile-info">
                <strong id="side-name">${u.escapeHtml(name)}</strong>
                <span id="side-grade">${u.escapeHtml(u.gradeLabel(state.profile.grade))}</span>
              </div>
              <div class="side-actions">
                <button class="icon-btn" id="user-switch" title="تغییر کاربر" aria-label="تغییر کاربر">${icon('users', 17)}</button>
                <button class="icon-btn" id="theme-toggle" title="تغییر حالت نمایش" aria-label="تغییر حالت نمایش">${icon(resolveTheme(state) === 'dark' ? 'sun' : 'moon', 17)}</button>
              </div>
            </div>
            <div class="row" style="justify-content:space-between;padding:0 4px">
              <span class="tiny muted">نسخه ${u.toFa(App.info?.version || '1.0.0')}</span>
              <span class="tiny muted">${icon('heart', 11)} برای درس خواندن</span>
            </div>
          </div>
        </aside>
        <main class="main" id="main-scroll">
          <div class="page" id="page-root"></div>
        </main>
      </div>
    `;

    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    document.getElementById('user-switch')?.addEventListener('click', () => App.usersUI?.open?.());
    updateShell();
  }

  function toggleTheme() {
    const state = App.store.state;
    const next = resolveTheme(state) === 'dark' ? 'light' : 'dark';
    App.store.update((draft) => { draft.settings.theme = next; });
    uiThemeToast(next);
  }

  function uiThemeToast(theme) {
    App.ui.toast(theme === 'light' ? 'حالت روشن فعال شد.' : 'حالت تیره فعال شد.', 'info', 1600);
  }

  function updateShell() {
    const state = App.store.state;
    if (!state) return;
    applyTheme(state);
    const name = state.profile.name || 'دانش‌آموز';
    const initial = name.trim().charAt(0) || 'د';
    const sideName = document.getElementById('side-name');
    if (sideName) sideName.textContent = name;
    const sideGrade = document.getElementById('side-grade');
    if (sideGrade) {
      const count = App.store.users.length;
      sideGrade.textContent = `${u.gradeLabel(state.profile.grade)}${count > 1 ? ` • ${u.toFa(count)} کاربر` : ''}`;
    }
    const avatar = document.getElementById('side-avatar');
    if (avatar) avatar.textContent = initial;
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.innerHTML = icon(resolveTheme(state) === 'dark' ? 'sun' : 'moon', 17);

    document.querySelectorAll('.nav-item[data-page]').forEach((link) => {
      link.classList.toggle('active', link.dataset.page === App.view.page);
    });

    const pending = state.homework.filter((hw) => {
      if (hw.done) return false;
      const status = u.homeworkStatus(state, hw);
      return status === 'overdue' || status === 'today';
    }).length;
    const examSoon = state.exams.filter((e) => {
      if (!u.isPendingExam(e)) return false;
      const diff = u.daysBetween(u.todayISO(), e.date);
      return diff >= 0 && diff <= 7;
    }).length;

    const hwBadge = document.querySelector('[data-badge="homework"]');
    if (hwBadge) {
      hwBadge.textContent = u.toFa(pending);
      hwBadge.classList.toggle('hidden', pending === 0);
      hwBadge.classList.toggle('danger', pending > 0);
    }
    const examBadge = document.querySelector('[data-badge="exams"]');
    if (examBadge) {
      examBadge.textContent = u.toFa(examSoon);
      examBadge.classList.toggle('hidden', examSoon === 0);
    }
  }

  function ensureShell() {
    if (!document.querySelector('.app-shell')) buildShell();
  }

  function renderOnboarding() {
    const app = document.getElementById('app');
    document.title = 'درس‌نامه — خوش آمدی';
    App.onboarding.render(app);
  }

  function parsePage() {
    const raw = (location.hash || '#/home').replace(/^#\/?/, '').split('?')[0];
    const page = raw || 'home';
    return App.pages[page] ? page : 'home';
  }

  function renderPage(resetScroll = false) {
    const state = App.store.state;
    if (!state?.profile.setupComplete) return;
    ensureShell();
    const pageRoot = document.getElementById('page-root');
    if (!pageRoot) return;
    const page = App.pages[App.view.page] ? App.view.page : 'home';

    if (App.view.lastPage && App.view.lastPage !== page) {
      try { App.pages[App.view.lastPage]?.unmount?.(); } catch (error) { console.warn(error); }
    }

    pageRoot.innerHTML = '';
    pageRoot.className = 'page';
    try {
      App.pages[page].render(pageRoot);
    } catch (error) {
      console.error('page render failed', page, error);
      pageRoot.innerHTML = `<div class="card">${App.ui.emptyState('alert', 'خطایی رخ داد', 'صفحه دوباره بارگذاری می‌شود. اگر مشکل ادامه داشت برنامه را باز و بسته کن.')}</div>`;
    }
    App.view.lastPage = page;
    updateShell();

    if (resetScroll) {
      const main = document.getElementById('main-scroll');
      if (main) main.scrollTop = 0;
    }
  }

  function onStoreChange(reason = 'update') {
    const state = App.store.state;
    if (!state) return;
    applyTheme(state);
    if (reason === 'user' || reason === 'replace') {
      try { App.pages[App.view.page]?.unmount?.(); } catch (error) { console.warn(error); }
      try { App.pages.study?.resetState?.(); } catch (error) { console.warn(error); }
      App.view.lastPage = null;
    }
    if (!state.profile.setupComplete) {
      renderOnboarding();
      return;
    }
    if (!document.querySelector('.app-shell')) {
      buildShell();
      renderPage(true);
      return;
    }
    updateShell();
    renderPage(false);
  }

  function onRoute() {
    if (!App.store.ready) return;
    if (!App.store.state.profile.setupComplete) return;
    const page = parsePage();
    const changed = page !== App.view.page;
    App.view.page = page;
    ensureShell();
    renderPage(true);
    updateShell();
    if (changed) {
      const main = document.getElementById('main-scroll');
      if (main) main.scrollTop = 0;
    }
  }

  function navigate(page) {
    if (!App.pages[page]) return;
    if (location.hash === `#/${page}`) {
      App.view.page = page;
      renderPage(true);
      return;
    }
    location.hash = `#/${page}`;
  }

  App.renderCurrent = function renderCurrent() {
    const state = App.store.state;
    if (!state) return;
    applyTheme(state);
    if (!state.profile.setupComplete) {
      renderOnboarding();
      return;
    }
    ensureShell();
    renderPage(false);
    updateShell();
  };
  App.navigate = navigate;

  function handleShortcuts(event) {
    const target = event.target;
    const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
    if (document.querySelector('.modal-backdrop')) return;

    if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
      const map = { '1': 'home', '2': 'schedule', '3': 'homework', '4': 'exams', '5': 'summary', '6': 'grades', '7': 'study', '8': 'ai', '9': 'settings' };
      if (map[event.key]) {
        event.preventDefault();
        navigate(map[event.key]);
        return;
      }
      if (event.key === ',' || event.key === '،') {
        event.preventDefault();
        navigate('settings');
        return;
      }
    }

    if (event.code === 'Space' && !typing && App.view.page === 'study') {
      const btn = document.querySelector('[data-pomo-start]');
      if (btn) {
        event.preventDefault();
        btn.click();
      }
    }
  }

  function bindWindowControls() {
    const bar = document.getElementById('app-titlebar');
    if (!bar) return;
    bar.querySelectorAll('[data-window-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.windowAction;
        if (action === 'minimize') window.api?.windowMinimize?.();
        else if (action === 'maximize') window.api?.windowToggleMaximize?.();
        else if (action === 'close') window.api?.windowClose?.();
      });
    });
    bar.addEventListener('dblclick', (event) => {
      if (event.target.closest('.titlebar-controls')) return;
      window.api?.windowToggleMaximize?.();
    });
  }

  async function boot() {
    bindWindowControls();
    try {
      await App.store.init();
    } catch (error) {
      console.error('boot failed', error);
      document.getElementById('app').innerHTML = `<div class="boot-screen"><strong>خطا در بارگذاری داده‌ها</strong><span class="boot-sub">لطفاً برنامه را دوباره باز کن.</span></div>`;
      return;
    }

    try {
      App.info = await window.api?.appInfo?.() || null;
    } catch (error) {
      App.info = null;
    }

    applyTheme(App.store.state);

    App.store.subscribe((_state, reason) => onStoreChange(reason));
    window.addEventListener('hashchange', onRoute);
    window.addEventListener('keydown', handleShortcuts);

    window.matchMedia?.('(prefers-color-scheme: light)')?.addEventListener?.('change', () => {
      if (App.store.state.settings.theme === 'system') applyTheme(App.store.state);
    });

    document.addEventListener('click', (event) => {
      const go = event.target.closest('[data-go]');
      if (go) {
        event.preventDefault();
        navigate(go.dataset.go);
      }
    });

    if (!location.hash) {
      history.replaceState(null, '', '#/home');
    }

    if (!App.store.state.profile.setupComplete) {
      renderOnboarding();
      return;
    }

    App.view.page = parsePage();
    ensureShell();
    renderPage(true);
    updateShell();
  }

  boot();
})();
