/* درس‌نامه — multi-user account switching and management */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  function initialOf(name) {
    return (String(name || 'د').trim().charAt(0) || 'د');
  }

  function summaryOf(user) {
    const data = user.data;
    if (!data?.profile?.setupComplete) return 'در حال راه‌اندازی حساب';
    const pending = data.homework.filter((hw) => !hw.done).length;
    const upcoming = u.upcomingExams(data, 99).length;
    return `${u.gradeLabel(data.profile.grade)} • ${u.toFa(pending)} تکلیف باقی‌مانده • ${u.toFa(upcoming)} امتحان پیش‌رو`;
  }

  function afterClose(close, fn) {
    close();
    setTimeout(fn, 175);
  }

  function openList() {
    const users = App.store.users;
    const activeId = App.store.activeUserId;

    const body = `
      <div class="users-list">
        ${users.map((user) => {
          const active = user.id === activeId;
          return `
            <div class="user-row ${active ? 'active' : ''}">
              <span class="user-avatar">${u.escapeHtml(initialOf(user.name || user.data.profile.name))}</span>
              <div class="user-info">
                <strong>${u.escapeHtml(user.name || user.data.profile.name || 'کاربر')}${active ? ' <span class="user-active-dot" title="کاربر فعال"></span>' : ''}</strong>
                <span>${u.escapeHtml(summaryOf(user))}</span>
              </div>
              <div class="user-actions">
                ${active
                  ? '<span class="badge badge-success">فعال</span>'
                  : `<button class="btn btn-soft btn-sm" data-user-switch="${u.escapeAttr(user.id)}">${icon('logout', 13)} ورود</button>`}
                <button class="icon-btn sm" data-user-rename="${u.escapeAttr(user.id)}" title="تغییر نام" aria-label="تغییر نام">${icon('edit', 13)}</button>
                ${users.length > 1 ? `<button class="icon-btn sm danger" data-user-delete="${u.escapeAttr(user.id)}" title="حذف حساب" aria-label="حذف حساب">${icon('trash', 13)}</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <p class="hint" style="margin-top:12px">${icon('info', 13)} هر کاربر برنامه، تکالیف، نمرات و گفتگوی مشاور مستقل خودش را دارد.</p>
    `;

    ui.openModal({
      title: 'کاربران درس‌نامه',
      subtitle: 'بین حساب‌ها جابه‌جا شو یا یک فضای تازه بساز.',
      iconName: 'users',
      size: 'md',
      body,
      footer: `
        <button type="button" class="btn btn-ghost" data-cancel>بستن</button>
        <button type="button" class="btn btn-primary" data-user-new>${icon('plus', 15)} کاربر جدید</button>
      `,
      onMount: (root, close) => {
        root.querySelectorAll('[data-user-switch]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const user = App.store.users.find((item) => item.id === btn.dataset.userSwitch);
            if (!user) return;
            afterClose(close, () => {
              App.store.switchUser(user.id);
              ui.toast(`به حساب ${user.name || 'کاربر'} خوش آمدی.`, 'success');
            });
          });
        });

        root.querySelectorAll('[data-user-rename]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const user = App.store.users.find((item) => item.id === btn.dataset.userRename);
            if (!user) return;
            afterClose(close, () => openRename(user));
          });
        });

        root.querySelectorAll('[data-user-delete]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const user = App.store.users.find((item) => item.id === btn.dataset.userDelete);
            if (!user) return;
            if (App.store.users.length <= 1) {
              ui.toast('حداقل یک کاربر باید باقی بماند.', 'error');
              return;
            }
            const active = user.id === App.store.activeUserId;
            const ok = await ui.confirm({
              title: 'حذف حساب کاربری',
              message: `حساب «${user.name || 'کاربر'}» با همهٔ برنامه، تکالیف، نمرات و گفتگوی مشاورش حذف شود؟${active ? ' بعد از حذف، حساب دیگری فعال می‌شود.' : ''}`,
              danger: true,
              confirmText: 'حذف کن'
            });
            if (!ok) return;
            afterClose(close, () => {
              const result = App.store.deleteUser(user.id);
              if (result.ok) ui.toast('حساب حذف شد.', 'info');
              else ui.toast(result.error || 'حذف حساب ناموفق بود.', 'error');
            });
          });
        });

        root.querySelector('[data-user-new]')?.addEventListener('click', () => {
          afterClose(close, openCreate);
        });

        root.querySelector('[data-cancel]')?.addEventListener('click', () => close());
      }
    });
  }

  function openCreate() {
    const body = `
      <form id="user-create-form" class="form" autocomplete="off">
        <div class="field">
          <label for="new-user-name">نام کاربر</label>
          <input class="input" id="new-user-name" maxlength="40" placeholder="مثلاً سارا" autofocus>
        </div>
        <p class="hint">${icon('info', 13)} یک فضای کاملاً مستقل ساخته می‌شود؛ برنامه، تکالیف، نمرات و گفتگوی مشاور این حساب از بقیه جدا خواهد بود.</p>
      </form>
    `;

    ui.openModal({
      title: 'کاربر جدید',
      subtitle: 'برای هر نفر یک حساب مستقل بساز.',
      iconName: 'users',
      size: 'sm',
      body,
      footer: `
        <button type="button" class="btn btn-ghost" data-cancel>انصراف</button>
        <button type="submit" form="user-create-form" class="btn btn-primary">${icon('plus', 15)} ساخت حساب</button>
      `,
      onMount: (root, close) => {
        const form = root.querySelector('#user-create-form');
        const input = root.querySelector('#new-user-name');
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const name = u.normalizeText(input.value);
          if (!name) {
            ui.toast('نام کاربر را بنویس.', 'error');
            input.focus();
            return;
          }
          afterClose(close, () => {
            App.store.createUser(name);
            location.hash = '#/home';
            ui.toast(`حساب ${name} ساخته شد. حالا برنامه‌اش را بچین.`, 'success', 3800);
          });
        });
        root.querySelector('[data-cancel]')?.addEventListener('click', () => close());
      }
    });
  }

  function openRename(user) {
    if (!user) return;
    const body = `
      <form id="user-rename-form" class="form" autocomplete="off">
        <div class="field">
          <label for="rename-user-name">نام جدید</label>
          <input class="input" id="rename-user-name" maxlength="40" value="${u.escapeAttr(user.name || '')}" autofocus>
        </div>
        <p class="hint">${icon('info', 13)} نام حساب و نام پروفایل این کاربر با هم تغییر می‌کند.</p>
      </form>
    `;

    ui.openModal({
      title: 'تغییر نام کاربر',
      iconName: 'edit',
      size: 'sm',
      body,
      footer: `
        <button type="button" class="btn btn-ghost" data-cancel>انصراف</button>
        <button type="submit" form="user-rename-form" class="btn btn-primary">${icon('check', 15)} ذخیره</button>
      `,
      onMount: (root, close) => {
        const form = root.querySelector('#user-rename-form');
        const input = root.querySelector('#rename-user-name');
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const name = u.normalizeText(input.value);
          if (!name) {
            ui.toast('نام جدید را بنویس.', 'error');
            input.focus();
            return;
          }
          const ok = App.store.renameUser(user.id, name);
          if (!ok) {
            ui.toast('تغییر نام ناموفق بود.', 'error');
            return;
          }
          close();
          ui.toast('نام کاربر تغییر کرد.', 'success');
        });
        root.querySelector('[data-cancel]')?.addEventListener('click', () => close());
      }
    });
  }

  App.usersUI = {
    open: openList,
    openSwitch: openList,
    openCreate,
    openRename
  };
})();
