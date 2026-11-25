/* درس‌نامه — first-run onboarding wizard */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  const wizard = {
    step: 0,
    grade: 7,
    days: ['sat', 'sun', 'mon', 'tue', 'wed'],
    initialized: false,
    createdAt: null
  };

  const SAMPLE_SUBJECTS = ['s-farsi', 's-riazi', 's-motaleat', 's-zaban', 's-varzesh', 's-honar'];

  const TITLES = [
    {
      title: 'به درس‌نامه خوش آمدی',
      sub: 'چند قدم کوتاه تا یک برنامه درسی منظم، زیبا و کاملاً شخصی. اسمت را بنویس و پایه‌ات را انتخاب کن.'
    },
    {
      title: 'برنامه هفتگی‌ات را بچین',
      sub: 'برای هر روز زنگ اضافه کن و درس هر زنگ را انتخاب کن. زنگ‌های چرخشی هم اینجا ساخته می‌شوند.'
    },
    {
      title: 'سطح دروس را مشخص کن',
      sub: 'هر درس را نسبت به توانایی خودت ارزیابی کن تا درس‌نامه بتواند نقاط قوت و ضعف تو را نشان بدهد.'
    }
  ];

  function ensurePeriods(draft, days) {
    days.forEach((dayKey) => {
      const periods = draft.schedule[dayKey] || (draft.schedule[dayKey] = []);
      if (periods.length) return;
      let previous = null;
      for (let i = 0; i < 4; i += 1) {
        const p = u.makePeriod(draft, dayKey, i, previous);
        periods.push(p);
        previous = p;
      }
    });
  }

  function aside(step, state) {
    const tips = [
      ['sparkles', 'چرا درس‌نامه؟'],
      ['refresh', 'زنگ چرخشی چطور کار می‌کند؟'],
      ['target', 'چرا سطح دروس مهم است؟']
    ];
    const used = u.usedSubjectIds(state);
    const totalPeriods = state.settings.weekDays.reduce((sum, k) => sum + (state.schedule[k] || []).filter((p) => p.subjectId || p.rotating).length, 0);
    const rotatingCount = Object.values(state.schedule).flat().filter((p) => p.rotating).length;

    return `
      <aside class="wizard-aside">
        <div class="wizard-brand">
          ${App.icons.logo(42)}
          <div><strong>درس‌نامه</strong><span>برنامه‌ریز درسی هوشمند</span></div>
        </div>

        <div class="aside-card">
          <h4>${icon(tips[step][0], 15)} ${tips[step][1]}</h4>
          ${step === 0 ? `
            <ul class="aside-list">
              <li>${icon('check', 13)} برنامه هفتگی شخصی</li>
              <li>${icon('check', 13)} مهلت خودکار تکالیف</li>
              <li>${icon('check', 13)} امتحانات و نمرات</li>
              <li>${icon('check', 13)} مطالعهٔ عصرانه و پومودورو</li>
              <li>${icon('check', 13)} ذخیره خودکار و خروجی JSON</li>
            </ul>
          ` : step === 1 ? `
            <p class="tiny muted" style="line-height:2">برای هر زنگ که دو درس به‌صورت یک‌هفته‌درمیان دارد، دکمه چرخشی را بزن. دو درس را انتخاب کن و مشخص کن <b>این هفته</b> کدام است؛ بقیه هفته‌ها خودکار جابه‌جا می‌شوند.</p>
            <div class="mini-progress" style="margin-top:10px"><span style="width:${Math.min(100, totalPeriods * 5)}%"></span></div>
            <p class="tiny muted" style="margin-top:5px">${u.toFa(totalPeriods)} زنگ در برنامه</p>
          ` : `
            <p class="tiny muted" style="line-height:2">سطح دروس در صفحه جمع‌بندی، پیشنهاد مطالعه و نمایش نقاط قوت و ضعف استفاده می‌شود. بعداً می‌توانی از تنظیمات تغییرش بدهی.</p>
            <ul class="aside-list" style="margin-top:10px">
              <li>${icon('check', 13)} ${u.toFa(used.size)} درس در برنامه</li>
              <li>${icon('check', 13)} ${u.toFa(rotatingCount)} زنگ چرخشی</li>
              <li>${icon('check', 13)} ${u.toFa(state.settings.weekDays.length)} روز مدرسه</li>
            </ul>
          `}
        </div>

        <div class="aside-card">
          <h4>${icon('info', 15)} نکته</h4>
          <p class="tiny muted" style="line-height:2">${step === 0 ? 'نام و پایه را بعداً هم می‌توانی از تنظیمات تغییر بدهی.' : step === 1 ? 'اگر عجله داری، دکمه «پر کردن نمونه» را بزن و بعداً درس‌ها را عوض کن.' : 'اگر سطح درسی را نمی‌دانی، «تعیین نشده» بگذار و بعداً مشخص کن.'}</p>
        </div>

        <p class="aside-note">${icon('heart', 12)} همه‌چیز در تنظیمات قابل تغییر است.</p>
      </aside>
    `;
  }

  function step0Body(state) {
    return `
      <div class="form" style="gap:18px">
        <div class="form-row">
          <div class="field">
            <label for="wiz-name">اسمت چیه؟</label>
            <input class="input" id="wiz-name" maxlength="40" placeholder="مثلاً سارا" value="${u.escapeAttr(state.profile.name || '')}" autofocus>
          </div>
          <div class="field">
            <label for="wiz-school">مدرسه (اختیاری)</label>
            <input class="input" id="wiz-school" maxlength="60" placeholder="نام مدرسه‌ات" value="${u.escapeAttr(state.profile.school || '')}">
          </div>
        </div>

        <div class="field">
          <label>پایه تحصیلی</label>
          <div class="grade-grid">
            ${Array.from({ length: 12 }, (_, i) => i + 1).map((g) => `
              <button type="button" class="grade-btn ${wizard.grade === g ? 'selected' : ''}" data-grade="${g}">
                ${u.toFa(g)}<small>${g <= 6 ? 'ابتدایی' : g <= 9 ? 'متوسطه اول' : 'متوسطه دوم'}</small>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="field">
          <label>روزهای مدرسه</label>
          <div class="day-toggles">
            ${u.DAYS.map((d) => `
              <label class="toggle-chip">
                <input type="checkbox" data-wiz-day="${d.key}" ${wizard.days.includes(d.key) ? 'checked' : ''}>
                <span>${d.label}</span>
              </label>
            `).join('')}
          </div>
          <p class="hint">${icon('info', 13)} معمولاً شنبه تا چهارشنبه. هر روز را بعداً در تنظیمات هم می‌توانی عوض کنی.</p>
        </div>
      </div>
    `;
  }

  function step1Body(state) {
    return `
      <div class="row" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:12px">
        <div class="row" style="gap:6px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" data-add-subject>${icon('plus', 14)} درس دلخواه</button>
          <button class="btn btn-ghost btn-sm" data-fill-sample>${icon('sparkles', 14)} پر کردن نمونه</button>
        </div>
        <span class="badge badge-muted">${u.toFa(state.settings.weekDays.length)} روز • ذخیره خودکار</span>
      </div>
      <div id="wiz-schedule"></div>
      <p class="hint" style="margin-top:14px">${icon('refresh', 13)} برای زنگ چرخشی، دکمه ${icon('refresh', 11)} کنار زنگ را بزن، دو درس را انتخاب کن و بگو این هفته کدام است.</p>
    `;
  }

  function step2Body(state) {
    const used = [...u.usedSubjectIds(state)];
    const subjects = state.subjects.filter((s) => used.includes(s.id));
    const unresolved = Object.values(state.schedule).flat().filter((p) =>
      p.rotating && (p.variants || []).filter(Boolean).length >= 2 &&
      !Object.prototype.hasOwnProperty.call(state.settings.rotating.indices || {}, p.id)
    );
    if (!subjects.length) {
      return `${ui.emptyState('book', 'هنوز درسی در برنامه نیست', 'می‌توانی از این مرحله رد شوی و بعداً برنامه هفتگی را از تنظیمات بسازی.', '<button class="btn btn-soft btn-sm" data-back-to-schedule>بازگشت به برنامه</button>')}
        <div style="margin-top:12px">${ui.emptyState('target', 'سطح دروس بعداً', 'بعد از اضافه کردن درس‌ها، از تنظیمات سطح هر درس را مشخص کن.')}</div>`;
    }
    return `
      ${unresolved.length ? `<div class="week-banner" style="border-color:rgba(251,191,36,.3);background:rgba(251,191,36,.07);margin-bottom:12px">
        <div class="week-banner-info">${icon('alert', 16)} <strong>${u.toFa(unresolved.length)} زنگ چرخشی بدون انتخاب این هفته</strong><span>در پایان، گزینه اول برای این هفته در نظر گرفته می‌شود.</span></div>
        <button class="btn btn-soft btn-sm" data-back-to-schedule>تنظیم</button>
      </div>` : ''}
      <div class="grid" style="gap:8px">
        ${subjects.map((subject) => `
          <div class="strength-card">
            <div class="strength-card-name" style="--c:${subject.color}"><i></i>${u.escapeHtml(subject.name)}</div>
            ${ui.strengthPicker(`wiz-strength-${subject.id}`, subject.strength)}
          </div>
        `).join('')}
      </div>
      <p class="hint" style="margin-top:12px">${icon('info', 13)} سطح‌ها فقط برای نمایش و پیشنهاد هستند؛ هر زمان از تنظیمات قابل تغییرند.</p>
    `;
  }

  function render(root) {
    const state = App.store.state;
    if (!wizard.initialized || wizard.createdAt !== state.createdAt) {
      wizard.grade = state.profile.grade || 7;
      wizard.days = state.settings.weekDays.length ? [...state.settings.weekDays] : ['sat', 'sun', 'mon', 'tue', 'wed'];
      wizard.createdAt = state.createdAt;
      wizard.initialized = true;
    }
    if (wizard.step > 2) wizard.step = 2;

    const meta = TITLES[wizard.step];
    const stepActions = wizard.step === 0
      ? `<span class="spacer"></span><button class="btn btn-primary btn-lg" data-next>${icon('arrowLeft', 17)} شروع چیدمان</button>`
      : wizard.step === 1
        ? `<button class="btn btn-ghost" data-back>${icon('arrowRight', 15)} بازگشت</button><span class="spacer"></span><button class="btn btn-primary" data-next>ادامه: سطح دروس ${icon('arrowLeft', 16)}</button>`
        : `<button class="btn btn-ghost" data-back>${icon('arrowRight', 15)} بازگشت</button><span class="spacer"></span><button class="btn btn-primary btn-lg" data-finish>${icon('sparkles', 17)} ورود به درس‌نامه</button>`;

    root.innerHTML = `
      <div class="onboarding">
        <div class="wizard">
          <div class="wizard-main">
            <div class="wizard-step-label">قدم ${u.toFa(wizard.step + 1)} از ${u.toFa(3)}</div>
            <div class="wizard-progress">
              ${[0, 1, 2].map((i) => `<span class="step-dot ${i < wizard.step ? 'done' : i === wizard.step ? 'active' : ''}"></span>`).join('')}
            </div>
            <h1 class="wizard-title">${meta.title}</h1>
            <p class="wizard-sub">${meta.sub}</p>
            <div class="wizard-body">
              ${wizard.step === 0 ? step0Body(state) : wizard.step === 1 ? step1Body(state) : step2Body(state)}
            </div>
            <div class="wizard-actions">${stepActions}</div>
          </div>
          ${aside(wizard.step, state)}
        </div>
      </div>
    `;

    bind(root, state);

    if (wizard.step === 1) {
      const holder = root.querySelector('#wiz-schedule');
      if (holder) App.pages.schedule.renderEditor(holder);
    }
  }

  function bind(root, state) {
    root.querySelectorAll('[data-grade]').forEach((btn) => {
      btn.addEventListener('click', () => {
        wizard.grade = Number(btn.dataset.grade);
        root.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('selected', x === btn));
      });
    });

    root.querySelectorAll('[data-wiz-day]').forEach((input) => {
      input.addEventListener('change', () => {
        const checked = [...root.querySelectorAll('[data-wiz-day]:checked')].map((x) => x.dataset.wizDay);
        if (!checked.length) {
          input.checked = true;
          ui.toast('حداقل یک روز مدرسه را انتخاب کن.', 'error');
          return;
        }
        wizard.days = checked;
      });
    });

    root.querySelector('[data-next]')?.addEventListener('click', async () => {
      if (wizard.step === 0) {
        const days = [...root.querySelectorAll('[data-wiz-day]:checked')].map((x) => x.dataset.wizDay);
        if (!days.length) {
          ui.toast('حداقل یک روز مدرسه انتخاب کن.', 'error');
          return;
        }
        const name = root.querySelector('#wiz-name')?.value.trim() || '';
        const school = root.querySelector('#wiz-school')?.value.trim() || '';
        wizard.days = days;
        wizard.step = 1;
        App.store.update((draft) => {
          draft.profile.name = name;
          draft.profile.school = school;
          draft.profile.grade = wizard.grade;
          draft.settings.weekDays = u.DAYS.map((d) => d.key).filter((key) => days.includes(key));
          ensurePeriods(draft, days);
        });
        ui.toast('حالا درس‌های هر زنگ را انتخاب کن.', 'info', 2600);
        return;
      }

      if (wizard.step === 1) {
        const assigned = Object.values(state.schedule).flat().filter((p) => p.subjectId || p.rotating).length;
        if (!assigned) {
          const ok = await ui.confirm({
            title: 'برنامه خالی است',
            message: 'هنوز هیچ درسی برای زنگ‌ها انتخاب نکرده‌ای. با برنامه خالی ادامه بدهی؟',
            confirmText: 'ادامه می‌دهم',
            iconName: 'alert'
          });
          if (!ok) return;
        }
        wizard.step = 2;
        App.renderCurrent();
      }
    });

    root.querySelectorAll('[data-back]').forEach((btn) => {
      btn.addEventListener('click', () => {
        wizard.step = Math.max(0, wizard.step - 1);
        App.renderCurrent();
      });
    });

    root.querySelectorAll('[data-back-to-schedule]').forEach((btn) => {
      btn.addEventListener('click', () => {
        wizard.step = 1;
        App.renderCurrent();
      });
    });

    root.querySelector('[data-add-subject]')?.addEventListener('click', () => {
      App.forms.openSubject();
    });

    root.querySelector('[data-fill-sample]')?.addEventListener('click', () => {
      App.store.update((draft) => {
        ensurePeriods(draft, draft.settings.weekDays);
        draft.settings.weekDays.forEach((dayKey) => {
          (draft.schedule[dayKey] || []).forEach((period, index) => {
            if (period.subjectId || period.rotating) return;
            const candidate = SAMPLE_SUBJECTS[index % SAMPLE_SUBJECTS.length];
            if (draft.subjects.some((s) => s.id === candidate)) period.subjectId = candidate;
          });
        });
      });
      ui.toast('چند درس نمونه در برنامه قرار گرفت؛ هر کدام را خواستی عوض کن.', 'success', 3500);
    });

    root.querySelectorAll('.wizard-body .strength-picker input[type="radio"]').forEach((input) => {
      input.addEventListener('change', () => {
        const picker = input.closest('.strength-picker');
        const name = picker?.dataset.strengthPicker || '';
        const subjectId = name.replace(/^wiz-strength-/, '');
        if (!subjectId) return;
        picker.querySelectorAll('.strength-option').forEach((el) => el.classList.remove('selected'));
        input.closest('.strength-option')?.classList.add('selected');
        App.store.update((draft) => {
          const subject = draft.subjects.find((s) => s.id === subjectId);
          if (subject) subject.strength = Number(input.value);
        });
      });
    });

    root.querySelector('[data-finish]')?.addEventListener('click', async () => {
      const assigned = Object.values(state.schedule).flat().filter((p) => p.subjectId || p.rotating).length;
      if (!assigned) {
        const ok = await ui.confirm({
          title: 'ورود بدون برنامه',
          message: 'هنوز درسی در برنامه نیست. می‌توانی وارد شوی و بعداً از تنظیمات برنامه را بسازی. ادامه می‌دهی؟',
          confirmText: 'وارد شو',
          iconName: 'alert'
        });
        if (!ok) return;
      }

      let unresolved = 0;
      App.store.update((draft) => {
        draft.settings.rotating.indices = draft.settings.rotating.indices || {};
        const anchor = draft.settings.rotating.anchor || u.weekStart();
        const weeks = u.weeksBetween(anchor, u.todayISO());
        Object.values(draft.schedule).flat().forEach((period) => {
          const variants = (period.variants || []).filter(Boolean);
          if (!period.rotating || variants.length < 2) return;
          if (Object.prototype.hasOwnProperty.call(draft.settings.rotating.indices, period.id)) return;
          unresolved += 1;
          draft.settings.rotating.indices[period.id] = ((-weeks) % variants.length + variants.length) % variants.length;
        });
        draft.profile.setupComplete = true;
      });

      wizard.step = 0;
      location.hash = '#/home';
      if (unresolved) {
        ui.toast(`برای ${u.toFa(unresolved)} زنگ چرخشی، گزینه اول این هفته در نظر گرفته شد. از صفحه برنامه هفتگی قابل تغییر است.`, 'info', 5200);
      }
      const name = App.store.state.profile.name;
      setTimeout(() => ui.toast(`${name ? name + ' جان، ' : ''}به درس‌نامه خوش آمدی!`, 'success', 4200), unresolved ? 600 : 0);
    });
  }

  App.onboarding = { render };
})();