/* درس‌نامه — exams page */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  function countdown(iso) {
    const diff = u.daysBetween(u.todayISO(), iso);
    if (diff < 0) return { text: 'گذشته', cls: 'past' };
    if (diff === 0) return { text: 'امروز', cls: 'today' };
    if (diff === 1) return { text: 'فردا', cls: 'soon' };
    return { text: `${u.toFa(diff)} روز دیگر`, cls: '' };
  }

  function periodLabelForExam(state, exam) {
    if (!exam.periodId) return '';
    const dayKey = u.weekdayKey(exam.date);
    const periods = state.schedule[dayKey] || [];
    const index = periods.findIndex((p) => p.id === exam.periodId);
    if (index < 0) return '';
    const subjectId = u.resolveSubject(state, periods[index], exam.date);
    const subject = u.subjectById(state, subjectId);
    return `زنگ ${u.toFa(index + 1)}${subject ? ` • ${subject.name}` : ''}`;
  }

  function renderSchedulePicker(state) {
    return `
      <section class="exam-schedule">
        ${ui.sectionHead(
          'ثبت امتحان از روی برنامه',
          'روی هر زنگ بزن تا امتحان همان درس را ثبت کنی؛ تاریخ را می‌توانی هر روزی، حتی چند هفته بعد، انتخاب کنی.',
          `<button class="btn btn-ghost btn-sm" data-go="schedule">${icon('calendar', 14)} ویرایش برنامه</button>`
        )}
        <div class="exam-days">
          ${state.settings.weekDays.map((dayKey) => {
            const periods = state.schedule[dayKey] || [];
            const day = u.DAY_BY_KEY[dayKey];
            return `
              <div class="exam-day">
                <div class="exam-day-head">${day.label}<span>${u.faDateShort(App.forms.nextDateForDay(dayKey))}</span></div>
                ${periods.length ? periods.map((p, i) => {
                  const subjectId = u.resolveSubject(state, p, App.forms.nextDateForDay(dayKey));
                  const subject = u.subjectById(state, subjectId);
                  return `
                    <button class="exam-slot ${subject ? '' : 'empty'}" data-exam-day="${dayKey}" data-exam-period="${p.id}" data-exam-subject="${subjectId || ''}" title="${subject ? `ثبت امتحان ${subject.name}` : 'ثبت امتحان'}">
                      <span class="slot-name">${subject ? `<i style="--c:${subject.color}"></i>${u.escapeHtml(subject.name)}` : `زنگ ${u.toFa(i + 1)}`}</span>
                      <span class="slot-plus">${icon('plus', 12)}</span>
                    </button>
                  `;
                }).join('') : `<div class="exam-slot empty" style="cursor:default">بدون زنگ</div>`}
              </div>
            `;
          }).join('')}
        </div>
        <p class="exam-hint">${icon('info', 12)} تاریخ پیشنهادی، نزدیک‌ترین روز همان هفته است؛ در فرم ثبت می‌توانی تغییرش بدهی.</p>
      </section>
    `;
  }

  function renderExamRow(state, exam, past = false) {
    const subject = u.subjectById(state, exam.subjectId);
    const cd = countdown(exam.date);
    const periodLabel = periodLabelForExam(state, exam);
    const hasScore = exam.score !== null && exam.score !== undefined && exam.score !== '';
    const completed = Boolean(exam.taken || hasScore);
    return `
      <div class="exam-row ${past ? 'past' : ''} ${completed ? 'is-done' : ''}">
        <div class="exam-date-box">
          <strong>${u.faDay(exam.date)}</strong>
          <span>${u.faDate(exam.date, { month: 'short' })}</span>
        </div>
        <div class="exam-row-main">
          <div class="exam-row-title">
            <span class="exam-title-text">${u.escapeHtml(exam.title)}</span>
            ${completed ? '<span class="badge badge-success">انجام شد</span>' : ''}
            ${hasScore ? `<span class="badge badge-accent">${u.faNumber(exam.score)} از ${u.toFa(state.settings.maxGrade)}</span>` : ''}
          </div>
          <div class="exam-row-meta">
            ${subject ? `<span class="subject-chip" style="--c:${subject.color}"><i></i>${u.escapeHtml(subject.name)}</span>` : ''}
            <span>${icon('calendar', 12)} ${u.faDate(exam.date, { weekday: 'long' })}</span>
            ${periodLabel ? `<span>${icon('clock', 12)} ${periodLabel}</span>` : ''}
            ${!past ? `<span class="countdown ${cd.cls === 'past' ? '' : cd.cls}">${cd.text}</span>` : ''}
          </div>
          ${exam.description ? `<div class="exam-desc">${u.escapeHtml(exam.description)}</div>` : ''}
        </div>
        <div class="exam-row-actions">
          <button class="icon-btn sm" data-exam-edit="${exam.id}" aria-label="ویرایش">${icon('edit', 14)}</button>
          <button class="icon-btn sm danger" data-exam-del="${exam.id}" aria-label="حذف">${icon('trash', 14)}</button>
        </div>
      </div>
    `;
  }

  function render(root) {
    const state = App.store.state;
    const today = u.todayISO();
    const isCompleted = (exam) => Boolean(exam.taken || (exam.score !== null && exam.score !== undefined && exam.score !== '') || exam.date < today);
    const upcoming = state.exams
      .filter((e) => !isCompleted(e))
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    const done = state.exams
      .filter(isCompleted)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const weekExams = upcoming.filter((e) => u.daysBetween(today, e.date) <= 7);
    const scored = state.exams.filter((e) => e.score !== null && e.score !== undefined && e.score !== '');

    root.innerHTML = `
      ${ui.pageHeader(
        'امتحانات',
        'امتحان‌ها را روی برنامه هفتگی بزن و مهلتشان را مشخص کن.',
        `<button class="btn btn-primary" data-add-exam>${icon('plus', 16)} ثبت امتحان</button>`
      )}

      <div class="home-stats" style="margin-bottom:16px">
        ${ui.statCard({ iconName: 'exam', label: 'امتحانات پیش‌رو', value: u.toFa(upcoming.length), sub: 'زمان‌بندی‌شده', tone: 'amber' })}
        ${ui.statCard({ iconName: 'zap', label: 'تا یک هفته آینده', value: u.toFa(weekExams.length), sub: weekExams.length ? 'برنامه مرور را جدی بگیر' : 'هفته آرامی است', tone: 'rose' })}
        ${ui.statCard({ iconName: 'award', label: 'نمره ثبت‌شده', value: u.toFa(scored.length), sub: `از ${u.toFa(state.exams.length)} امتحان`, tone: 'green' })}
        ${ui.statCard({ iconName: 'check', label: 'انجام‌شده‌ها', value: u.toFa(done.length), sub: 'شرکت‌کرده یا گذشته', tone: 'blue' })}
      </div>

      ${renderSchedulePicker(state)}

      <section class="card" style="margin-bottom:14px">
        ${ui.sectionHead('امتحانات پیش‌رو', upcoming.length ? `${u.toFa(upcoming.length)} امتحان برنامه‌ریزی شده` : 'هنوز امتحانی ثبت نشده', `<button class="btn btn-ghost btn-sm" data-add-exam>${icon('plus', 14)} جدید</button>`)}
        ${upcoming.length
          ? `<div class="exams-list">${upcoming.map((exam) => renderExamRow(state, exam)).join('')}</div>`
          : ui.emptyState('exam', 'امتحان نزدیکی نداری', 'با کلیک روی یکی از زنگ‌های بالا یا دکمه ثبت امتحان، اولین امتحانت را اضافه کن.', '<button class="btn btn-primary btn-sm" data-add-exam>ثبت امتحان</button>')}
      </section>

      ${done.length ? `
        <section class="card">
          ${ui.sectionHead('انجام‌شده‌ها', 'امتحان‌هایی که نمره‌شان ثبت شده یا تاریخشان گذشته است', `<button class="btn btn-ghost btn-sm" data-go="grades">${icon('award', 14)} ثبت نمره</button>`)}
          <div class="exams-list">${done.map((exam) => renderExamRow(state, exam, true)).join('')}</div>
        </section>
      ` : ''}
    `;

    root.querySelectorAll('[data-add-exam]').forEach((btn) => {
      btn.addEventListener('click', () => App.forms.openExam());
    });

    root.querySelectorAll('[data-exam-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        App.forms.openExam({
          defaults: {
            dayKey: btn.dataset.examDay,
            periodId: btn.dataset.examPeriod,
            subjectId: btn.dataset.examSubject || ''
          }
        });
      });
    });

    root.querySelectorAll('[data-exam-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const exam = state.exams.find((e) => e.id === btn.dataset.examEdit);
        if (exam) App.forms.openExam({ exam });
      });
    });

    root.querySelectorAll('[data-exam-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const exam = state.exams.find((e) => e.id === btn.dataset.examDel);
        if (!exam) return;
        const ok = await ui.confirm({
          title: 'حذف امتحان',
          message: `«${exam.title}» حذف شود؟${exam.score !== null ? ' نمره ثبت‌شده این امتحان هم از معدل حذف می‌شود.' : ''}`,
          danger: true,
          confirmText: 'حذف کن'
        });
        if (!ok) return;
        App.store.update((draft) => {
          draft.exams = draft.exams.filter((e) => e.id !== exam.id);
        });
        ui.toast('امتحان حذف شد.', 'info');
      });
    });
  }

  App.pages = App.pages || {};
  App.pages.exams = { render };
})();
