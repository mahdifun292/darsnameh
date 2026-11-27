/* درس‌نامه — settings */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  const ACCENT_KEYS = ['violet', 'teal', 'blue', 'rose', 'amber'];
  const ACCENT_COLORS = { violet: '#8b5cf6', teal: '#14b8a6', blue: '#3b82f6', rose: '#f43f5e', amber: '#f59e0b' };

  function render(root) {
    const state = App.store.state;
    const s = state.settings;
    const p = s.pomodoro;
    const used = u.usedSubjectIds(state);
    const info = App.info || {};
    const subjectsWithStrength = state.subjects.filter((x) => used.has(x.id));
    const ai = s.ai;
    const aiReady = App.ai.isReady(state);
    const aiConfigured = App.ai.isConfigured(state);
    let aiHost = ai.baseUrl || '';
    try { aiHost = new URL(ai.baseUrl).host; } catch { /* keep raw value */ }
    const activeUser = App.store.activeUser();

    root.innerHTML = `
      ${ui.pageHeader('تنظیمات', 'همه‌چیز را اینجا می‌توانی تغییر بدهی؛ تغییرات خودکار ذخیره می‌شوند.', '')}

      <div class="settings-grid">
        <section class="card settings-section">
          <h2>${icon('users', 17)} پروفایل</h2>
          <p>نام و پایه تحصیلی در خوش‌آمدگویی و محاسبات استفاده می‌شود.</p>
          <div class="field">
            <label for="set-name">نام</label>
            <input class="input" id="set-name" value="${u.escapeAttr(state.profile.name || '')}" placeholder="مثلاً سارا">
          </div>
          <div class="field">
            <label for="set-school">نام مدرسه (اختیاری)</label>
            <input class="input" id="set-school" value="${u.escapeAttr(state.profile.school || '')}" placeholder="مثلاً دبیرستان فرزانگان">
          </div>
          <div class="field">
            <label for="set-grade">پایه تحصیلی</label>
            <select class="select" id="set-grade">
              ${Array.from({ length: 12 }, (_, i) => i + 1).map((g) =>
                `<option value="${g}" ${state.profile.grade === g ? 'selected' : ''}>${u.gradeLabel(g)}</option>`
              ).join('')}
            </select>
          </div>
          <button class="btn btn-primary btn-sm" id="save-profile">${icon('check', 14)} ذخیره پروفایل</button>
        </section>

        <section class="card settings-section wide">
          <h2>${icon('users', 17)} کاربران</h2>
          <p>هر کاربر یک فضای کاملاً مستقل دارد؛ برنامه، تکالیف، نمرات و گفتگوی مشاور هر حساب جدا ذخیره می‌شود.</p>
          <div class="settings-row">
            <div class="settings-row-info">
              <strong>${u.toFa(App.store.users.length)} حساب کاربری</strong>
              <span>کاربر فعال: ${u.escapeHtml(activeUser?.name || state.profile.name || 'کاربر')}</span>
            </div>
            <div class="settings-actions">
              <button class="btn btn-soft btn-sm" data-users-open>${icon('users', 14)} مدیریت کاربران</button>
              <button class="btn btn-primary btn-sm" data-user-new>${icon('plus', 14)} کاربر جدید</button>
            </div>
          </div>
          <p class="hint">${icon('info', 13)} نام حساب با نام پروفایل هم‌زمان به‌روز می‌شود. برای ساخت حساب دوم، از دکمه «کاربر جدید» استفاده کن.</p>
        </section>

        <section class="card settings-section">
          <h2>${icon('sun', 17)} ظاهر</h2>
          <p>حالت نمایش و رنگ اصلی برنامه را انتخاب کن.</p>
          <div class="theme-options">
            <button class="theme-card ${s.theme === 'dark' ? 'active' : ''}" data-theme-set="dark">
              <span class="theme-preview dark"><span></span></span>تیره
            </button>
            <button class="theme-card ${s.theme === 'light' ? 'active' : ''}" data-theme-set="light">
              <span class="theme-preview light"><span></span></span>روشن
            </button>
            <button class="theme-card ${s.theme === 'system' ? 'active' : ''}" data-theme-set="system">
              <span class="theme-preview system"><span></span></span>سیستم
            </button>
          </div>
          <div class="field" style="margin-top:6px">
            <label>رنگ اصلی</label>
            <div class="accent-row">
              ${ACCENT_KEYS.map((key) => `
                <label class="accent-swatch" title="${u.ACCENTS[key].name}">
                  <input type="radio" name="accent" value="${key}" ${s.accent === key ? 'checked' : ''} data-accent-set>
                  <span style="--c:${ACCENT_COLORS[key]}"></span>
                </label>
              `).join('')}
            </div>
          </div>
        </section>

        <section class="card settings-section">
          <h2>${icon('calendar', 17)} هفته و زنگ‌ها</h2>
          <p>روزهایی که مدرسه می‌روی را انتخاب کن. برنامه هفتگی بر همین اساس نمایش داده می‌شود.</p>
          <div class="day-toggles">
            ${u.DAYS.map((d) => `
              <label class="toggle-chip">
                <input type="checkbox" data-weekday="${d.key}" ${s.weekDays.includes(d.key) ? 'checked' : ''}>
                <span>${d.label}</span>
              </label>
            `).join('')}
          </div>
          <div class="settings-row" style="margin-top:6px">
            <div class="settings-row-info">
              <strong>هفته چرخشی</strong>
              <span>هفته جاری: ${u.faDate(u.weekStart(), { month: 'long' })} تا ${u.faDate(u.weekEnd(), { month: 'long' })}</span>
            </div>
            <div class="settings-actions">
              <button class="btn btn-soft btn-sm" data-rotation>${icon('refresh', 14)} تنظیم این هفته</button>
              <button class="btn btn-ghost btn-sm" data-rotation-reset>ریست</button>
            </div>
          </div>
          <p class="hint">${icon('info', 13)} اگر درس‌های چرخشی داری، بعد از هر تغییر، هفته جاری را یک بار تنظیم کن.</p>
          <button class="btn btn-ghost btn-sm" data-go="schedule">${icon('calendar', 14)} رفتن به برنامه هفتگی</button>
        </section>

        <section class="card settings-section">
          <h2>${icon('timer', 17)} زمان‌سنج مطالعه و اعلان‌ها</h2>
          <p>زمان جلسه‌های مطالعه و استراحت را متناسب با خودت تنظیم کن.</p>
          <div class="form-row">
            <div class="field"><label for="pomo-focus">تمرکز (دقیقه)</label><input class="input" id="pomo-focus" type="number" min="1" max="180" value="${p.focus}"></div>
            <div class="field"><label for="pomo-short">استراحت کوتاه</label><input class="input" id="pomo-short" type="number" min="1" max="60" value="${p.short}"></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="pomo-long">استراحت بلند</label><input class="input" id="pomo-long" type="number" min="1" max="120" value="${p.long}"></div>
            <div class="field"><label for="pomo-every">استراحت بلند بعد از</label><input class="input" id="pomo-every" type="number" min="1" max="12" value="${p.longEvery}"></div>
          </div>
          <label class="row" style="font-size:11px;color:var(--muted);cursor:pointer">
            <input type="checkbox" id="pomo-auto" ${p.autoStart ? 'checked' : ''}> شروع خودکار مرحله بعد
          </label>
          <label class="row" style="font-size:11px;color:var(--muted);cursor:pointer">
            <input type="checkbox" id="pomo-sound" ${p.sound ? 'checked' : ''}> صدای پایان زمان
          </label>
          <label class="row" style="font-size:11px;color:var(--muted);cursor:pointer">
            <input type="checkbox" id="set-notify" ${s.notifications ? 'checked' : ''}> اعلان سیستمی پایان جلسه مطالعه
          </label>
          <button class="btn btn-primary btn-sm" id="save-pomodoro">${icon('check', 14)} ذخیره تنظیمات مطالعه</button>
        </section>

        <section class="card settings-section">
          <h2>${icon('sparkles', 17)} مشاور هوشمند</h2>
          <p>یک مشاور درسی فارسی‌زبان که برنامه‌ات را می‌شناسد و می‌تواند تکلیف، امتحان، نمره و برنامهٔ مطالعه بسازد.</p>
          <div class="settings-row">
            <div class="settings-row-info">
              <strong>${aiReady ? 'فعال' : ai.enabled ? 'نیازمند تنظیم' : 'غیرفعال'}</strong>
              <span>${aiConfigured ? `${u.escapeHtml(ai.model)} • ${u.escapeHtml(aiHost)}` : 'هنوز آدرس، کلید و مدل تنظیم نشده است.'}</span>
            </div>
            <div class="settings-actions">
              <button class="btn btn-soft btn-sm" data-ai-settings>${icon('settings', 14)} تنظیم</button>
              <button class="btn btn-ghost btn-sm" data-go="ai">${icon('sparkles', 14)} رفتن به مشاور</button>
            </div>
          </div>
          <p class="hint">${icon('lock', 13)} کلید API فقط در فایل دادهٔ همین دستگاه ذخیره می‌شود و در خروجی پشتیبان هم قرار می‌گیرد؛ فایل پشتیبان را محرمانه نگه دار.</p>
        </section>

        <section class="card settings-section wide">
          <h2>${icon('book', 17)} دروس</h2>
          <p>درس‌های پیش‌فرض و دلخواه. نام، رنگ و سطح هر درس از همین‌جا قابل تغییر است.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <button class="btn btn-primary btn-sm" data-add-subject>${icon('plus', 14)} افزودن درس دلخواه</button>
            <span class="badge badge-muted">${u.toFa(state.subjects.length)} درس</span>
          </div>
          <div class="subject-manage-list">
            ${state.subjects.slice().sort((a, b) => u.comparePersian(a.name, b.name)).map((subject) => {
              const meta = u.strengthMeta(subject.strength);
              return `
                <div class="subject-manage-row">
                  <span class="dot" style="--c:${subject.color}"></span>
                  <span class="name">${u.escapeHtml(subject.name)}${used.has(subject.id) ? '' : ' <small style="color:var(--muted-2);font-weight:400">(بدون استفاده)</small>'}</span>
                  ${meta ? `<span class="strength-tag" style="--tone:${meta.color}">${meta.label}</span>` : '<span class="strength-tag" style="--tone:var(--muted-2)">بدون سطح</span>'}
                  <button class="icon-btn sm" data-edit-subject="${subject.id}" aria-label="ویرایش">${icon('edit', 13)}</button>
                  <button class="icon-btn sm danger" data-del-subject="${subject.id}" aria-label="حذف">${icon('trash', 13)}</button>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <section class="card settings-section wide">
          <h2>${icon('target', 17)} سطح دروس</h2>
          <p>هر درس را نسبت به توانایی خودت ارزیابی کن. این سطح در جمع‌بندی و پیشنهادهای برنامه استفاده می‌شود.</p>
          ${subjectsWithStrength.length ? `<div class="grid grid-2" style="gap:8px 18px">
            ${subjectsWithStrength.map((subject) => `
              <div class="settings-row" style="padding:6px 0">
                <div class="subject-grade-name" style="--c:${subject.color}"><i></i>${u.escapeHtml(subject.name)}</div>
                <select class="select" data-strength="${subject.id}" style="width:auto;min-width:130px;padding:5px 26px 5px 8px;font-size:10.5px">
                  <option value="">تعیین نشده</option>
                  ${u.STRENGTHS.map((x) => `<option value="${x.level}" ${subject.strength === x.level ? 'selected' : ''}>${x.label}</option>`).join('')}
                </select>
              </div>
            `).join('')}
          </div>` : ui.emptyState('target', 'هنوز درسی در برنامه نیست', 'اول برنامه هفتگی را بساز تا سطح دروس اینجا فعال شود.', '<button class="btn btn-soft btn-sm" data-go="schedule">ساخت برنامه</button>')}
        </section>

        <section class="card settings-section">
          <h2>${icon('award', 17)} نمره‌ها</h2>
          <p>سقف نمره در صفحه نمرات، معدل و فرم‌ها استفاده می‌شود.</p>
          <div class="settings-row">
            <div class="settings-row-info"><strong>سقف نمره</strong><span>پیش‌فرض ۲۰ است.</span></div>
            <div class="row">
              <input class="input" id="set-max-grade" type="number" min="1" max="100" value="${s.maxGrade}" style="width:80px">
              <button class="btn btn-soft btn-sm" id="save-max-grade">ذخیره</button>
            </div>
          </div>
          <p class="hint">${icon('info', 13)} با تغییر سقف نمره، نمره‌های قبلی حذف نمی‌شوند؛ فقط مبنای نمایش و معدل عوض می‌شود.</p>
        </section>

        <section class="card settings-section">
          <h2>${icon('database', 17)} داده‌ها</h2>
          <p>از برنامه نسخه پشتیبان بگیر یا اطلاعات را به دستگاه دیگر منتقل کن.</p>
          <div class="data-actions">
            <button class="btn btn-soft btn-sm" data-export>${icon('download', 14)} خروجی همه حساب‌ها</button>
            <button class="btn btn-soft btn-sm" data-import>${icon('upload', 14)} بازیابی</button>
            <button class="btn btn-ghost btn-sm" data-open-folder>${icon('database', 14)} پوشه داده</button>
          </div>
          <div class="data-path">${u.escapeHtml(info.dataPath || 'محل ذخیره: پوشه داده برنامه')}</div>
          <div class="danger-zone" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
            <button class="btn btn-danger btn-sm" data-reset-user>${icon('trash', 14)} پاک کردن داده‌های این کاربر</button>
            <p class="hint" style="margin-top:6px">${icon('alert', 13)} فقط برنامه، تکالیف، نمرات و گفتگوی مشاور همین کاربر پاک می‌شود. حساب‌های دیگر دست‌نخورده می‌مانند.</p>
          </div>
        </section>

        <section class="card settings-section wide">
          <h2>${icon('info', 17)} درباره و میان‌برها</h2>
          <div class="about-box">
            ${App.icons.logo(48)}
            <div>
              <strong>درس‌نامه نسخه ${u.toFa(info.version || '1.0.0')}</strong>
              <span>${info.electron ? `Electron ${u.toFa(info.electron)}` : 'برنامه‌ریز درسی مبتنی بر Electron'} • ${info.platform === 'win32' ? 'ویندوز' : info.platform === 'linux' ? 'لینوکس' : (info.platform || 'دسکتاپ')}</span>
            </div>
          </div>
          <div class="shortcuts" style="margin-top:14px">
            <div class="shortcut"><span>خانه</span><kbd>Ctrl + 1</kbd></div>
            <div class="shortcut"><span>برنامه هفتگی</span><kbd>Ctrl + 2</kbd></div>
            <div class="shortcut"><span>تکالیف</span><kbd>Ctrl + 3</kbd></div>
            <div class="shortcut"><span>امتحانات</span><kbd>Ctrl + 4</kbd></div>
            <div class="shortcut"><span>جمع‌بندی</span><kbd>Ctrl + 5</kbd></div>
            <div class="shortcut"><span>نمرات</span><kbd>Ctrl + 6</kbd></div>
            <div class="shortcut"><span>مطالعه عصرانه</span><kbd>Ctrl + 7</kbd></div>
            <div class="shortcut"><span>مشاور هوشمند</span><kbd>Ctrl + 8</kbd></div>
            <div class="shortcut"><span>تنظیمات</span><kbd>Ctrl + 9</kbd></div>
            <div class="shortcut"><span>شروع / توقف زمان‌سنج</span><kbd>Space</kbd></div>
            <div class="shortcut"><span>بستن پنجره‌ها</span><kbd>Esc</kbd></div>
          </div>
        </section>
      </div>
    `;

    bind(root, state);
  }

  function bind(root, state) {
    root.querySelector('#save-profile')?.addEventListener('click', () => {
      const name = root.querySelector('#set-name').value.trim();
      const school = root.querySelector('#set-school').value.trim();
      const grade = Number(root.querySelector('#set-grade').value) || 7;
      App.store.update((draft) => {
        draft.profile.name = name;
        draft.profile.school = school;
        draft.profile.grade = grade;
      });
      ui.toast('پروفایل ذخیره شد.', 'success');
    });

    root.querySelector('[data-users-open]')?.addEventListener('click', () => App.usersUI?.open?.());
    root.querySelector('[data-user-new]')?.addEventListener('click', () => App.usersUI?.openCreate?.());
    root.querySelector('[data-ai-settings]')?.addEventListener('click', () => App.pages.ai?.openConfig?.());

    root.querySelectorAll('[data-theme-set]').forEach((btn) => {
      btn.addEventListener('click', () => {
        App.store.update((draft) => { draft.settings.theme = btn.dataset.themeSet; });
        ui.toast('حالت نمایش تغییر کرد.', 'success', 1600);
      });
    });

    root.querySelectorAll('[data-accent-set]').forEach((input) => {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        App.store.update((draft) => { draft.settings.accent = input.value; });
        ui.toast('رنگ اصلی تغییر کرد.', 'success', 1600);
      });
    });

    root.querySelectorAll('[data-weekday]').forEach((input) => {
      input.addEventListener('change', () => {
        const checked = [...root.querySelectorAll('[data-weekday]:checked')].map((x) => x.dataset.weekday);
        if (!checked.length) {
          input.checked = true;
          ui.toast('حداقل یک روز باید انتخاب شود.', 'error');
          return;
        }
        App.store.update((draft) => {
          draft.settings.weekDays = u.DAYS.map((d) => d.key).filter((key) => checked.includes(key));
        });
        ui.toast('روزهای هفته به‌روز شد.', 'success', 1600);
      });
    });

    root.querySelector('[data-rotation]')?.addEventListener('click', () => App.forms.openRotationSetup());
    root.querySelector('[data-rotation-reset]')?.addEventListener('click', () => {
      App.store.update((draft) => {
        draft.settings.rotating.anchor = u.weekStart();
        draft.settings.rotating.indices = {};
      });
      ui.toast('چرخش از این هفته ریست شد؛ از برنامه هفتگی این هفته را انتخاب کن.', 'info', 4200);
    });

    root.querySelector('[data-add-subject]')?.addEventListener('click', () => App.forms.openSubject());
    root.querySelectorAll('[data-edit-subject]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const subject = state.subjects.find((x) => x.id === btn.dataset.editSubject);
        if (subject) App.forms.openSubject({ subject });
      });
    });

    root.querySelectorAll('[data-del-subject]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const subject = state.subjects.find((x) => x.id === btn.dataset.delSubject);
        if (!subject) return;
        const used = u.usedSubjectIds(state).has(subject.id);
        const ok = await ui.confirm({
          title: 'حذف درس',
          message: used
            ? `«${subject.name}» در برنامه یا تکالیف استفاده شده است. با حذف آن، ارجاع‌ها خالی می‌شوند اما عنوان تکالیف و امتحانات باقی می‌ماند. ادامه می‌دهی؟`
            : `«${subject.name}» حذف شود؟`,
          danger: true,
          confirmText: 'حذف کن'
        });
        if (!ok) return;
        App.store.update((draft) => {
          draft.subjects = draft.subjects.filter((x) => x.id !== subject.id);
          Object.keys(draft.schedule).forEach((dayKey) => {
            (draft.schedule[dayKey] || []).forEach((period) => {
              let touched = false;
              if (period.subjectId === subject.id) { period.subjectId = null; touched = true; }
              if (Array.isArray(period.variants)) {
                period.variants = period.variants.map((v) => {
                  if (v === subject.id) { touched = true; return ''; }
                  return v;
                });
              }
              if (touched && draft.settings.rotating.indices) delete draft.settings.rotating.indices[period.id];
            });
          });
          draft.homework.forEach((h) => { if (h.subjectId === subject.id) h.subjectId = null; });
          draft.exams.forEach((e) => { if (e.subjectId === subject.id) e.subjectId = null; });
          draft.manualGrades.forEach((g) => { if (g.subjectId === subject.id) g.subjectId = null; });
        });
        ui.toast('درس حذف شد.', 'info');
      });
    });

    root.querySelectorAll('[data-strength]').forEach((select) => {
      select.addEventListener('change', () => {
        App.store.update((draft) => {
          const subject = draft.subjects.find((x) => x.id === select.dataset.strength);
          if (subject) subject.strength = select.value ? Number(select.value) : null;
        });
        ui.toast('سطح درس ذخیره شد.', 'success', 1600);
      });
    });

    root.querySelector('#save-max-grade')?.addEventListener('click', () => {
      const value = Number(root.querySelector('#set-max-grade').value);
      if (!value || value < 1 || value > 100) {
        ui.toast('سقف نمره باید بین ۱ تا ۱۰۰ باشد.', 'error');
        return;
      }
      App.store.update((draft) => { draft.settings.maxGrade = value; });
      ui.toast('سقف نمره ذخیره شد.', 'success');
    });

    root.querySelector('#save-pomodoro')?.addEventListener('click', () => {
      const focus = Number(root.querySelector('#pomo-focus').value);
      const short = Number(root.querySelector('#pomo-short').value);
      const long = Number(root.querySelector('#pomo-long').value);
      const longEvery = Number(root.querySelector('#pomo-every').value);
      if (!focus || !short || !long || !longEvery || focus > 180 || short > 60 || long > 120) {
        ui.toast('زمان‌ها را در محدوده معتبر وارد کن.', 'error');
        return;
      }
      App.store.update((draft) => {
        draft.settings.pomodoro = {
          ...draft.settings.pomodoro,
          focus,
          short,
          long,
          longEvery,
          autoStart: root.querySelector('#pomo-auto').checked,
          sound: root.querySelector('#pomo-sound').checked
        };
      });
      ui.toast('تنظیمات مطالعه ذخیره شد.', 'success');
    });

    root.querySelector('#set-notify')?.addEventListener('change', (event) => {
      App.store.update((draft) => { draft.settings.notifications = event.target.checked; });
      ui.toast(event.target.checked ? 'اعلان‌ها فعال شد.' : 'اعلان‌ها غیرفعال شد.', 'info', 1800);
    });

    root.querySelector('[data-export]')?.addEventListener('click', async () => {
      const json = JSON.stringify(App.store.exportSnapshot(), null, 2);
      if (window.api?.exportData) {
        const result = await window.api.exportData(json);
        if (result.ok) ui.toast('نسخه پشتیبان همه حساب‌ها ذخیره شد.', 'success');
        else if (result.error) ui.toast('ذخیره نسخه پشتیبان ناموفق بود.', 'error');
      } else {
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `darsnameh-backup-${u.todayISO()}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    });

    root.querySelector('[data-import]')?.addEventListener('click', async () => {
      if (!window.api?.importData) {
        ui.toast('بازیابی فقط در نسخه دسکتاپ در دسترس است.', 'info');
        return;
      }
      const result = await window.api.importData();
      if (!result.ok) return;
      let parsed;
      try { parsed = JSON.parse(result.data); } catch { parsed = null; }
      const isEnvelope = Boolean(parsed && parsed.schema === 2 && Array.isArray(parsed.users) && parsed.users.length);
      const isLegacy = Boolean(parsed && typeof parsed === 'object' && parsed.profile && parsed.settings);
      if (!isEnvelope && !isLegacy) {
        ui.toast('فایل انتخاب‌شده معتبر نیست.', 'error');
        return;
      }
      const ok = await ui.confirm({
        title: 'بازیابی نسخه پشتیبان',
        message: isEnvelope
          ? 'همهٔ حساب‌های فعلی با حساب‌های داخل این فایل جایگزین می‌شوند. ادامه می‌دهی؟'
          : 'داده‌های کاربر فعال با محتوای این فایل جایگزین می‌شود؛ حساب‌های دیگر دست‌نخورده می‌مانند. ادامه می‌دهی؟',
        confirmText: 'بازیابی کن'
      });
      if (!ok) return;
      if (isEnvelope) App.store.importSnapshot(parsed);
      else App.store.replace(parsed);
      location.hash = '#/home';
      ui.toast('نسخه پشتیبان بازیابی شد.', 'success');
    });

    root.querySelector('[data-open-folder]')?.addEventListener('click', () => {
      window.api?.openDataFolder?.();
    });

    root.querySelector('[data-reset-user]')?.addEventListener('click', async () => {
      const ok = await ui.confirm({
        title: 'پاک کردن داده‌های این کاربر',
        message: 'همهٔ برنامه هفتگی، تکالیف، امتحانات، نمرات، آمار مطالعه و گفتگوی مشاور این کاربر پاک می‌شود. حساب‌های دیگر دست‌نخورده می‌مانند. مطمئنی؟',
        danger: true,
        confirmText: 'بله، پاک کن'
      });
      if (!ok) return;
      const fresh = u.makeDefaultState();
      fresh.profile.name = state.profile.name || '';
      App.store.replace(fresh);
      try { App.pages.study?.resetState?.(); } catch { /* noop */ }
      location.hash = '#/home';
      ui.toast('داده‌های این کاربر پاک شد. دوباره شروع کنیم!', 'info');
    });
  }

  App.pages = App.pages || {};
  App.pages.settings = { render };
})();