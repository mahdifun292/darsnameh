/* درس‌نامه — overall plan / summary */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  let typeFilter = 'all';
  let subjectFilter = 'all';

  function homeworkStatusMeta(state, hw) {
    const status = u.homeworkStatus(state, hw);
    if (status === 'done') return { label: 'انجام‌شده', cls: 'badge-success' };
    if (status === 'overdue') return { label: 'معوق', cls: 'badge-danger' };
    if (status === 'today') return { label: 'امروز', cls: 'badge-warn' };
    if (status === 'week') return { label: 'این هفته', cls: 'badge-info' };
    return { label: 'بعداً', cls: 'badge-muted' };
  }

  function examStatusMeta(state, exam) {
    if (exam.score !== null && exam.score !== undefined && exam.score !== '') {
      return { label: `نمره ${u.faNumber(exam.score)}`, cls: 'badge-success' };
    }
    if (exam.taken) return { label: 'شرکت کردم', cls: 'badge-info' };
    const diff = u.daysBetween(u.todayISO(), exam.date);
    if (diff < 0) return { label: 'گذشته', cls: 'badge-muted' };
    if (diff === 0) return { label: 'امروز', cls: 'badge-warn' };
    if (diff <= 3) return { label: 'نزدیک', cls: 'badge-danger' };
    return { label: 'پیش‌رو', cls: 'badge-info' };
  }

  function collectRows(state) {
    const rows = [];
    state.homework.forEach((hw) => {
      const due = u.dueForHomework(state, hw);
      rows.push({
        id: `hw-${hw.id}`,
        type: 'homework',
        title: hw.title,
        subjectId: hw.subjectId,
        date: due?.date || '',
        time: due?.time || null,
        status: homeworkStatusMeta(state, hw),
        description: hw.description,
        strength: u.subjectById(state, hw.subjectId)?.strength || null
      });
    });
    state.exams.forEach((exam) => {
      rows.push({
        id: `exam-${exam.id}`,
        type: 'exam',
        title: exam.title,
        subjectId: exam.subjectId,
        date: exam.date,
        time: null,
        status: examStatusMeta(state, exam),
        description: exam.description,
        strength: u.subjectById(state, exam.subjectId)?.strength || null
      });
    });
    return rows;
  }

  function renderTable(rows) {
    if (!rows.length) {
      return `<div class="card">${ui.emptyState('table', 'چیزی برای نمایش نیست', 'بعد از افزودن تکلیف یا امتحان، جمع‌بندی اینجا نمایش داده می‌شود.')}</div>`;
    }
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>نوع</th>
              <th>عنوان</th>
              <th>درس</th>
              <th>مهلت / تاریخ</th>
              <th>وضعیت</th>
              <th>سطح درس</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => {
              const subject = u.subjectById(stateRef, row.subjectId);
              return `
                <tr>
                  <td><span class="type-pill ${row.type === 'homework' ? 'type-homework' : 'type-exam'}">${row.type === 'homework' ? icon('tasks', 11) + ' تکلیف' : icon('exam', 11) + ' امتحان'}</span></td>
                  <td class="cell-title" title="${u.escapeAttr(row.title)}${row.description ? ` — ${u.escapeAttr(row.description)}` : ''}">${u.escapeHtml(row.title)}</td>
                  <td>${subject ? `<span class="subject-chip" style="--c:${subject.color}"><i></i>${u.escapeHtml(subject.name)}</span>` : '<span class="cell-muted">—</span>'}</td>
                  <td class="cell-muted">${row.date ? `${u.faDate(row.date, { weekday: 'long' })}${row.time ? ` • ${u.formatTime(row.time)}` : ''}` : '—'}</td>
                  <td><span class="badge ${row.status.cls}">${row.status.label}</span></td>
                  <td>${ui.strengthBadge(row.strength)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Kept at module scope so the table renderer can use the current state without prop drilling.
  let stateRef = null;

  function renderStrengths(state) {
    const used = u.usedSubjectIds(state);
    const subjects = state.subjects
      .filter((s) => used.has(s.id))
      .sort((a, b) => {
        if (!a.strength && !b.strength) return u.comparePersian(a.name, b.name);
        if (!a.strength) return 1;
        if (!b.strength) return -1;
        return a.strength - b.strength;
      });
    if (!subjects.length) return ui.emptyState('target', 'درسی در برنامه‌ات نیست', 'اول برنامه هفتگی را کامل کن تا سطح دروس اینجا نمایش داده شود.');
    return `
      <div class="strength-bars">
        ${subjects.map((s) => {
          const meta = u.strengthMeta(s.strength);
          return `
            <div class="strength-bar-row">
              <div class="strength-bar-top">
                <strong style="--c:${s.color}"><i></i>${u.escapeHtml(s.name)}</strong>
                ${meta ? `<span class="badge badge-strength" style="--tone:${meta.color}">${meta.label}</span>` : '<span class="strength-empty">تعیین نشده</span>'}
              </div>
              <div class="strength-track">
                <span style="width:${s.strength ? s.strength * 20 : 0}%;--tone:${meta?.color || 'var(--muted-2)'}"></span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function render(root) {
    const state = App.store.state;
    stateRef = state;
    const rows = collectRows(state);
    const usedSubjectIds = [...new Set(rows.map((r) => r.subjectId).filter(Boolean))];
    const subjects = state.subjects.filter((s) => usedSubjectIds.includes(s.id));
    let visible = rows.filter((r) =>
      (typeFilter === 'all' || r.type === typeFilter) &&
      (subjectFilter === 'all' || r.subjectId === subjectFilter)
    );
    visible = visible.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const hwCount = rows.filter((r) => r.type === 'homework').length;
    const examCount = rows.filter((r) => r.type === 'exam').length;
    const weakness = state.subjects.filter((s) => s.strength && s.strength <= 2 && u.usedSubjectIds(state).has(s.id));
    const strengthCount = state.subjects.filter((s) => s.strength && u.usedSubjectIds(state).has(s.id)).length;
    const doneCount = state.homework.filter((h) => h.done).length;
    const overall = u.gradeStats(state).overall;

    root.innerHTML = `
      ${ui.pageHeader(
        'برنامه و جمع‌بندی',
        'یک نمای کامل از تکالیف، امتحانات و سطح دروس — همه در یک نگاه.',
        `<button class="btn btn-ghost" data-go="settings">${icon('target', 15)} تنظیم سطح دروس</button>
         <button class="btn btn-soft" data-print>${icon('download', 15)} چاپ / PDF</button>`
      )}

      <div class="summary-stats">
        ${ui.statCard({ iconName: 'tasks', label: 'تکالیف', value: u.toFa(hwCount), sub: `${u.toFa(doneCount)} انجام‌شده`, tone: 'violet' })}
        ${ui.statCard({ iconName: 'exam', label: 'امتحانات', value: u.toFa(examCount), sub: 'ثبت‌شده در برنامه', tone: 'amber' })}
        ${ui.statCard({ iconName: 'target', label: 'درس با سطح مشخص', value: `${u.toFa(strengthCount)} <small style="font-size:10px;color:var(--muted)">درس</small>`, sub: weakness.length ? `${u.toFa(weakness.length)} درس نیازمند توجه` : 'تعادل خوبی داری', tone: 'rose' })}
        ${ui.statCard({ iconName: 'award', label: 'معدل کلی', value: overall === null ? '—' : `${u.faNumber(overall, 2)} <small style="font-size:10px;color:var(--muted)">از ${u.toFa(state.settings.maxGrade)}</small>`, sub: 'بر اساس نمرات ثبت‌شده', tone: 'green' })}
      </div>

      <div class="summary-toolbar">
        <div class="filter-chips">
          <button class="chip ${typeFilter === 'all' ? 'active' : ''}" data-type="all">همه <span class="count">${u.toFa(rows.length)}</span></button>
          <button class="chip ${typeFilter === 'homework' ? 'active' : ''}" data-type="homework">تکالیف <span class="count">${u.toFa(hwCount)}</span></button>
          <button class="chip ${typeFilter === 'exam' ? 'active' : ''}" data-type="exam">امتحانات <span class="count">${u.toFa(examCount)}</span></button>
        </div>
        <select class="select" id="summary-subject-filter" style="width:auto;min-width:160px;padding:7px 28px 7px 10px;font-size:11px">
          <option value="all">همه درس‌ها</option>
          ${subjects.map((s) => `<option value="${u.escapeAttr(s.id)}" ${subjectFilter === s.id ? 'selected' : ''}>${u.escapeHtml(s.name)}</option>`).join('')}
        </select>
      </div>

      ${renderTable(visible)}

      <div class="grid grid-2" style="margin-top:16px">
        <section class="card">
          ${ui.sectionHead('سطح دروس', 'نقاط قوت و ضعف بر اساس ارزیابی تو', `<span class="badge badge-muted">${u.toFa(subjects.length)} درس</span>`)}
          ${renderStrengths(state)}
        </section>
        <section class="card">
          ${ui.sectionHead('نکات مهم', 'پیشنهاد کوتاه برای این هفته', '')}
          <div class="row" style="align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px dashed var(--border)">
            <span style="color:var(--danger);display:flex">${icon('alert', 17)}</span>
            <div>
              <strong style="font-size:11.5px;display:block">دروس نیازمند توجه</strong>
              <span class="tiny muted">${weakness.length ? weakness.map((s) => s.name).join('، ') : 'همه دروس سطح متوسط به بالا دارند یا سطحشان تعیین شده است.'}</span>
            </div>
          </div>
          <div class="row" style="align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px dashed var(--border)">
            <span style="color:var(--warn);display:flex">${icon('clock', 17)}</span>
            <div>
              <strong style="font-size:11.5px;display:block">تکالیف انجام‌نشده</strong>
              <span class="tiny muted">${u.toFa(state.homework.filter((h) => !h.done).length)} تکلیف باقی مانده است. اولویت را به موارد معوق بده.</span>
            </div>
          </div>
          <div class="row" style="align-items:flex-start;gap:10px;padding:9px 0">
            <span style="color:var(--accent);display:flex">${icon('sparkles', 17)}</span>
            <div>
              <strong style="font-size:11.5px;display:block">قدم بعدی</strong>
              <span class="tiny muted">یک جلسه مطالعهٔ ۲۵ دقیقه‌ای برای ضعیف‌ترین درس شروع کن؛ همین امروز.</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" data-go="study" style="margin-top:8px">${icon('timer', 14)} مطالعه عصرانه</button>
        </section>
      </div>
    `;

    root.querySelectorAll('[data-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        typeFilter = btn.dataset.type;
        render(root);
      });
    });

    root.querySelector('#summary-subject-filter')?.addEventListener('change', (event) => {
      subjectFilter = event.target.value;
      render(root);
    });

    root.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  }

  App.pages = App.pages || {};
  App.pages.summary = { render };
})();
