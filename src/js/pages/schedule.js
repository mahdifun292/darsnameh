/* درس‌نامه — weekly schedule editor */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  function rotatingSlots(state) {
    const slots = [];
    state.settings.weekDays.forEach((dayKey) => {
      (state.schedule[dayKey] || []).forEach((period, index) => {
        if (period.rotating) slots.push({ dayKey, period, index });
      });
    });
    return slots;
  }

  function renderCell(state, dayKey, period, index, studyTotals = new Map()) {
    const currentId = period.rotating ? u.rotatingCurrentSubject(state, period) : period.subjectId;
    const subject = u.subjectById(state, currentId);
    const color = subject?.color || 'var(--muted-2)';
    const studyMinutes = studyTotals.get(currentId) || 0;
    return `
      <button type="button" class="tt-cell ${subject ? 'filled' : 'empty'} ${period.rotating ? 'rotating' : ''}"
        data-edit-period="${u.escapeAttr(period.id)}" data-day="${dayKey}" style="--c:${color}"
        title="${subject ? u.escapeAttr(subject.name) : 'این زنگ درس ندارد'} — برای ویرایش کلیک کن">
        <span class="tt-cell-head">
          <span class="tt-cell-number">${u.toFa(index + 1)}</span>
          ${period.rotating ? `<span class="tt-cell-flag">${icon('refresh', 10)} چرخشی</span>` : ''}
        </span>
        <span class="tt-cell-subject">${subject ? u.escapeHtml(subject.name) : 'بدون درس'}</span>
        ${subject && studyMinutes ? `<span class="tt-cell-study">${icon('timer', 9)} ${u.toFa(studyMinutes)} دقیقه</span>` : ''}
        <span class="tt-cell-time">${u.formatTime(period.start || '—')} — ${u.formatTime(period.end || '—')}</span>
        <span class="tt-cell-edit">${icon('edit', 11)} ویرایش</span>
      </button>
    `;
  }

  function renderTable(state, studyTotals = new Map()) {
    const days = state.settings.weekDays;
    const maxPeriods = Math.max(0, ...days.map((dayKey) => (state.schedule[dayKey] || []).length));
    const rows = Array.from({ length: maxPeriods }, (_, index) => index);

    return `
      <div class="timetable-scroll">
        <table class="timetable">
          <thead>
            <tr>
              <th class="tt-corner">${icon('clock', 14)}<span>زنگ</span></th>
              ${days.map((dayKey) => {
                const day = u.DAY_BY_KEY[dayKey];
                const count = (state.schedule[dayKey] || []).length;
                return `
                  <th class="tt-day-head">
                    <span class="tt-day-icon">${day.short}</span>
                    <strong>${day.label}</strong>
                    <small>${count ? `${u.toFa(count)} زنگ` : 'بدون زنگ'}</small>
                  </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((index) => `
              <tr>
                <th class="tt-index-head"><span>${u.toFa(index + 1)}</span></th>
                ${days.map((dayKey) => {
                  const periods = state.schedule[dayKey] || [];
                  const period = periods[index];
                  if (!period) {
                    return `
                      <td class="tt-empty-slot">
                        <button type="button" class="tt-add-cell" data-add-period="${dayKey}" aria-label="افزودن زنگ به ${u.DAY_BY_KEY[dayKey].label}">
                          ${icon('plus', 18)}
                        </button>
                      </td>
                    `;
                  }
                  return `<td>${renderCell(state, dayKey, period, index, studyTotals)}</td>`;
                }).join('')}
              </tr>
            `).join('')}
            <tr class="tt-add-row">
              <th class="tt-corner-empty"></th>
              ${days.map((dayKey) => `
                <td>
                  <button type="button" class="tt-add-day" data-add-period="${dayKey}">
                    ${icon('plus', 13)} افزودن زنگ
                  </button>
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function renderStudySummary(state) {
    const from = u.weekStart();
    const to = u.weekEnd();
    const rows = u.studyBySubject(state, { from, to });
    const total = rows.reduce((sum, row) => sum + row.minutes, 0);
    const todayMinutes = u.studyMinutes(state, { from: u.todayISO(), to: u.todayISO() });
    const max = Math.max(...rows.map((row) => row.minutes), 1);

    return `
      <section class="card schedule-study">
        ${ui.sectionHead(
          'زمان مطالعهٔ هر درس',
          `این هفته (${u.faDate(from, { month: 'long' })} تا ${u.faDate(to, { month: 'long' })}) • ${u.toFa(total)} دقیقه`,
          `<span class="badge badge-muted">${icon('sun', 11)} امروز ${u.toFa(todayMinutes)} دقیقه</span>
           <button class="btn btn-primary btn-sm" data-go="study">${icon('play', 12)} مطالعه عصرانه</button>`
        )}
        ${rows.length ? `
          <div class="schedule-study-grid">
            ${rows.map(({ subject, minutes }) => `
              <div class="schedule-study-row">
                <span class="schedule-study-name"><i style="--c:${subject.color}"></i>${u.escapeHtml(subject.name)}</span>
                <span class="schedule-study-track"><span style="width:${minutes ? Math.max(5, Math.round((minutes / max) * 100)) : 0}%;--c:${subject.color}"></span></span>
                <strong>${u.toFa(minutes)}<small>دقیقه</small></strong>
              </div>
            `).join('')}
          </div>
        ` : ui.emptyState('timer', 'هنوز مطالعه‌ای ثبت نشده', 'از صفحه مطالعه عصرانه اولین جلسه را شروع کن تا زمان هر درس اینجا دیده شود.')}
      </section>
    `;
  }

  function studyTotalsMap(state) {
    return new Map(
      u.studyBySubject(state, { from: u.weekStart(), to: u.weekEnd() })
        .map((row) => [row.subject.id, row.minutes])
    );
  }

  function render(root) {
    const state = App.store.state;
    const studyTotals = studyTotalsMap(state);
    const weekStudyMinutes = [...studyTotals.values()].reduce((sum, value) => sum + value, 0);
    const slots = rotatingSlots(state);
    const unresolved = slots.filter(({ period }) =>
      (period.variants || []).filter(Boolean).length >= 2 &&
      !Object.prototype.hasOwnProperty.call(state.settings.rotating.indices || {}, period.id)
    );
    const activeSlots = slots.map(({ dayKey, period, index }) => {
      const current = u.rotatingCurrentSubject(state, period);
      return { dayKey, period, index, subject: u.subjectById(state, current) };
    });

    root.innerHTML = `
      ${ui.pageHeader(
        'برنامه هفتگی',
        'زنگ‌های هر روز را مثل یک جدول بچین؛ روی هر زنگ بزن تا درس، ساعت و چرخشش را عوض کنی.',
        `<button class="btn btn-soft" data-manage-subjects>${icon('book', 15)} افزودن درس</button>
         <button class="btn btn-primary" data-rotation>${icon('refresh', 15)} تنظیم هفته چرخشی</button>`
      )}

      <div class="schedule-toolbar">
        <div class="grade-select-wrap">
          <label for="grade-select">${icon('grad', 16)} پایه تحصیلی</label>
          <select class="select" id="grade-select">
            ${Array.from({ length: 12 }, (_, i) => i + 1).map((g) =>
              `<option value="${g}" ${state.profile.grade === g ? 'selected' : ''}>${u.gradeLabel(g)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="row" style="gap:6px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" data-go="settings">${icon('calendar', 14)} روزهای هفته: ${u.toFa(state.settings.weekDays.length)}</button>
          <span class="badge badge-muted">${icon('timer', 11)} مطالعه این هفته: ${u.toFa(weekStudyMinutes)} دقیقه</span>
          <span class="badge badge-muted">${icon('info', 11)} ذخیره خودکار</span>
        </div>
      </div>

      ${unresolved.length ? `
        <div class="week-banner" style="border-color:rgba(251,191,36,.32);background:linear-gradient(100deg,rgba(251,191,36,.1),transparent)">
          <div class="week-banner-info">${icon('alert', 18)} <strong>${u.toFa(unresolved.length)} زنگ چرخشی منتظر انتخاب توست</strong><span>مشخص کن این هفته کدام درس برگزار می‌شود.</span></div>
          <button class="btn btn-soft btn-sm" data-rotation>انتخاب این هفته</button>
        </div>
      ` : `
        <div class="week-banner">
          <div class="week-banner-info">
            ${icon('refresh', 18)}
            <strong>هفته ${u.faDate(u.weekStart(), { month: 'long' })} تا ${u.faDate(u.weekEnd(), { month: 'long' })}</strong>
            ${slots.length ? '<span>چرخش خودکار فعال است</span>' : '<span>هنوز زنگ چرخشی نداری</span>'}
          </div>
          <div class="rotating-active">
            ${activeSlots.filter((s) => s.subject).map((s) => `
              <span class="subject-chip" style="--c:${s.subject.color}" title="${u.DAY_BY_KEY[s.dayKey].label} • زنگ ${u.toFa(s.index + 1)}">
                <i></i>${u.escapeHtml(s.subject.name)}
              </span>
            `).join('') || '<span class="tiny muted">در زنگ چرخشی، دو درس را انتخاب کن تا هر هفته جابه‌جا شوند.</span>'}
          </div>
          <button class="btn btn-ghost btn-sm" data-rotation>${icon('settings', 13)} تنظیم</button>
        </div>
      `}

      ${renderTable(state, studyTotals)}

      ${renderStudySummary(state)}

      <div class="schedule-footer">
        <span class="hint">${icon('sparkles', 14)} روی هر مربع بزن تا درس و ساعتش را عوض کنی؛ برای زنگ چرخشی دو درس را انتخاب کن و بگو این هفته کدام فعال است.</span>
        <button class="btn btn-soft" data-manage-subjects>${icon('plus', 15)} درس دلخواه</button>
      </div>
    `;

    bind(root, state);
  }

  function bind(root, state) {
    root.querySelector('#grade-select')?.addEventListener('change', (event) => {
      const grade = Number(event.target.value);
      App.store.update((draft) => { draft.profile.grade = grade; });
      ui.toast('پایه تحصیلی به‌روز شد.', 'success');
    });

    root.querySelectorAll('[data-manage-subjects]').forEach((btn) => {
      btn.addEventListener('click', () => App.forms.openSubject());
    });

    root.querySelectorAll('[data-rotation]').forEach((btn) => {
      btn.addEventListener('click', () => App.forms.openRotationSetup());
    });

    root.querySelectorAll('[data-add-period]').forEach((btn) => {
      btn.addEventListener('click', () => {
        App.forms.openPeriod({ dayKey: btn.dataset.addPeriod });
      });
    });

    root.querySelectorAll('[data-edit-period]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dayKey = btn.dataset.day;
        const period = (state.schedule[dayKey] || []).find((p) => p.id === btn.dataset.editPeriod);
        if (!period) return;
        App.forms.openPeriod({
          dayKey,
          period,
          index: (state.schedule[dayKey] || []).indexOf(period)
        });
      });
    });
  }

  function renderEditor(container) {
    const state = App.store.state;
    container.innerHTML = renderTable(state, studyTotalsMap(state));
    bind(container, state);
  }

  App.pages = App.pages || {};
  App.pages.schedule = { render, renderEditor, renderTable };
})();
