/* درس‌نامه — grades and averages */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  function scoreClass(score, max) {
    const pct = max ? score / max : 0;
    if (pct >= 0.75) return 'score-good';
    if (pct >= 0.5) return 'score-mid';
    return 'score-low';
  }

  function renderExamRows(state, exams) {
    if (!exams.length) {
      return ui.emptyState('exam', 'امتحانی ثبت نشده', 'از صفحه امتحانات، امتحان‌هایت را اضافه کن تا اینجا نمره‌شان را وارد کنی.', '<button class="btn btn-soft btn-sm" data-go="exams">رفتن به امتحانات</button>');
    }
    return `<div class="exam-score-list">${exams.map((exam) => {
      const subject = u.subjectById(state, exam.subjectId);
      const hasScore = exam.score !== null && exam.score !== undefined && exam.score !== '';
      return `
        <div class="exam-score-row ${exam.taken || hasScore ? 'done' : ''}">
          <button class="taken-check ${exam.taken ? 'checked' : ''}" data-exam-taken="${exam.id}" aria-label="شرکت کردم">${icon('check', 13)}</button>
          <div class="exam-score-main">
            <strong>${u.escapeHtml(exam.title)}</strong>
            <span>
              ${subject ? `<span class="subject-chip" style="--c:${subject.color}"><i></i>${u.escapeHtml(subject.name)}</span>` : ''}
              ${u.faDate(exam.date, { weekday: 'long' })}
            </span>
          </div>
          <div class="score-input-wrap">
            <input class="score-input" type="number" min="0" max="${state.settings.maxGrade}" step="0.25"
              placeholder="نمره" value="${hasScore ? exam.score : ''}" data-exam-score="${exam.id}" aria-label="نمره">
            <span>از ${u.toFa(state.settings.maxGrade)}</span>
          </div>
          <span class="badge ${hasScore ? 'badge-success' : exam.taken ? 'badge-info' : 'badge-muted'}">${hasScore ? `${u.faNumber(exam.score)} ثبت شد` : exam.taken ? 'شرکت کردم' : 'ثبت نشده'}</span>
        </div>
      `;
    }).join('')}</div>`;
  }

  function renderSubjectGrades(state, stats) {
    if (!stats.bySubject.length) {
      return ui.emptyState('chart', 'میانگینی برای نمایش نیست', 'با ثبت اولین نمره، میانگین هر درس و معدل کلی محاسبه می‌شود.');
    }
    return `<div class="subject-grades">${stats.bySubject.map(({ subject, average, count, scores }) => {
      const pct = (average / state.settings.maxGrade) * 100;
      const entries = stats.entries
        .filter((e) => e.subjectId === subject.id)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      return `
        <div class="subject-grade-card">
          <div class="subject-grade-head">
            <div class="subject-grade-name" style="--c:${subject.color}"><i></i>${u.escapeHtml(subject.name)}</div>
            <div class="subject-grade-score ${scoreClass(average, state.settings.maxGrade)}">
              ${u.faNumber(average, 2)} <small>از ${u.toFa(state.settings.maxGrade)}</small>
            </div>
          </div>
          <div class="mini-progress" style="margin-top:8px"><span style="width:${u.clamp(pct, 0, 100)}%"></span></div>
          <div class="tiny muted" style="margin-top:5px">${u.toFa(count)} نمره ثبت‌شده</div>
          <div class="grade-entries">
            ${entries.slice(0, 5).map((entry) => `
              <div class="grade-entry">
                <div class="grade-entry-title">
                  ${entry.source === 'exam' ? icon('exam', 11) : icon('edit', 11)}
                  <span>${u.escapeHtml(entry.title)}</span>
                </div>
                <span class="grade-entry-score ${scoreClass(entry.score, state.settings.maxGrade)}">${u.faNumber(entry.score)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('')}</div>`;
  }

  function renderManualGrades(state) {
    const list = state.manualGrades.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (!list.length) {
      return ui.emptyState('edit', 'نمره دستی نداری', 'برای پرسش کلاسی، فعالیت یا هر نمره‌ای که امتحان رسمی نیست، از دکمه بالا استفاده کن.', '<button class="btn btn-soft btn-sm" data-add-grade>افزودن نمره دستی</button>');
    }
    return `<div class="exam-score-list">${list.map((grade) => {
      const subject = u.subjectById(state, grade.subjectId);
      return `
        <div class="exam-score-row done" style="grid-template-columns:minmax(0,1fr) 90px 62px">
          <div class="exam-score-main">
            <strong>${u.escapeHtml(grade.title)}</strong>
            <span>
              ${subject ? `<span class="subject-chip" style="--c:${subject.color}"><i></i>${u.escapeHtml(subject.name)}</span>` : ''}
              ${u.faDate(grade.date, { weekday: 'long' })}
            </span>
          </div>
          <span class="score-badge ${scoreClass(grade.score, state.settings.maxGrade)}" style="font-size:15px">${u.faNumber(grade.score)} <small>از ${u.toFa(state.settings.maxGrade)}</small></span>
          <div class="row" style="justify-content:flex-end;gap:0">
            <button class="icon-btn sm" data-grade-edit="${grade.id}" aria-label="ویرایش">${icon('edit', 14)}</button>
            <button class="icon-btn sm danger" data-grade-del="${grade.id}" aria-label="حذف">${icon('trash', 14)}</button>
          </div>
        </div>
      `;
    }).join('')}</div>`;
  }

  function render(root) {
    const state = App.store.state;
    const stats = u.gradeStats(state);
    const max = state.settings.maxGrade;
    const exams = state.exams.slice().sort((a, b) => {
      const aHas = a.score !== null && a.score !== undefined && a.score !== '';
      const bHas = b.score !== null && b.score !== undefined && b.score !== '';
      if (aHas !== bHas) return aHas ? 1 : -1;
      return String(b.date).localeCompare(String(a.date));
    });
    const scoredExams = exams.filter((e) => e.score !== null && e.score !== undefined && e.score !== '');
    const best = stats.bySubject.slice().sort((a, b) => b.average - a.average)[0];
    const worst = stats.bySubject.slice().sort((a, b) => a.average - b.average)[0];

    root.innerHTML = `
      ${ui.pageHeader(
        'نمرات',
        `میانگین هر درس و معدل کلی از ${u.toFa(max)} — نمره‌های امتحان و دستی.`,
        `<button class="btn btn-soft" data-add-grade>${icon('plus', 16)} نمره دستی</button>
         <button class="btn btn-ghost" data-go="exams">${icon('exam', 15)} امتحانات</button>`
      )}

      <div class="home-stats" style="margin-bottom:16px">
        ${ui.statCard({ iconName: 'award', label: 'معدل کلی', value: stats.overall === null ? '—' : `${u.faNumber(stats.overall, 2)} <small style="font-size:10px;color:var(--muted)">از ${u.toFa(max)}</small>`, sub: stats.entries.length ? `${u.toFa(stats.entries.length)} نمره ثبت‌شده` : 'هنوز نمره‌ای نداری', tone: 'violet' })}
        ${ui.statCard({ iconName: 'exam', label: 'نمره امتحان', value: u.toFa(scoredExams.length), sub: `از ${u.toFa(exams.length)} امتحان`, tone: 'amber' })}
        ${ui.statCard({ iconName: 'trending', label: 'قوی‌ترین درس', value: best ? u.escapeHtml(best.subject.name) : '—', sub: best ? `میانگین ${u.faNumber(best.average, 2)}` : 'بعد از ثبت نمره', tone: 'green' })}
        ${ui.statCard({ iconName: 'target', label: 'درس نیازمند توجه', value: worst ? u.escapeHtml(worst.subject.name) : '—', sub: worst ? `میانگین ${u.faNumber(worst.average, 2)}` : 'بعد از ثبت نمره', tone: 'rose' })}
      </div>

      <div class="grades-top">
        <div class="overall-card">
          <div class="overall-copy">
            <span>معدل کلی</span>
            <strong>${stats.overall === null ? '—' : u.faNumber(stats.overall, 2)} <small>از ${u.toFa(max)}</small></strong>
            <p>${stats.entries.length ? `میانگین ${u.toFa(stats.entries.length)} نمره از ${u.toFa(stats.bySubject.length)} درس` : 'اولین نمره‌ات را ثبت کن تا معدلت محاسبه شود.'}</p>
          </div>
          ${ui.progressRing({
            value: stats.overall || 0,
            max,
            size: 112,
            stroke: 9,
            color: stats.overall === null ? 'rgba(148,163,184,.3)' : 'var(--accent)',
            label: stats.overall === null ? '—' : u.faNumber(stats.overall, 2),
            sub: `از ${u.toFa(max)}`
          })}
        </div>
        <div class="card" style="display:flex;flex-direction:column;justify-content:center">
          <div class="grades-stats">
            <div class="stat-copy" style="padding:4px 8px"><span>تعداد کل نمرات</span><strong>${u.toFa(stats.entries.length)}</strong><small>امتحان و دستی</small></div>
            <div class="stat-copy" style="padding:4px 8px"><span>نمره‌های دستی</span><strong>${u.toFa(state.manualGrades.length)}</strong><small>قابل ویرایش</small></div>
            <div class="stat-copy" style="padding:4px 8px"><span>درس‌های دارای نمره</span><strong>${u.toFa(stats.bySubject.length)}</strong><small>از ${u.toFa(u.usedSubjectIds(state).size)} درس</small></div>
            <div class="stat-copy" style="padding:4px 8px"><span>سقف نمره</span><strong>${u.toFa(max)}</strong><small><button class="chip" style="padding:0 6px;font-size:9px" data-go="settings">تغییر</button></small></div>
          </div>
        </div>
      </div>

      <section class="card" style="margin-bottom:16px">
        ${ui.sectionHead('نمره امتحان‌ها', 'تیک بزن که در امتحان شرکت کردی و نمره‌ات را وارد کن؛ نمره بدون تیک هم قابل ثبت است.', `<span class="badge badge-muted">${u.toFa(exams.length)} امتحان</span>`)}
        ${renderExamRows(state, exams)}
        <div class="manual-grade-note">${icon('info', 14)} نمره را وارد کن و Enter بزن یا از فیلد خارج شو تا ذخیره شود. نمرات دستی هم در معدل حساب می‌شوند.</div>
      </section>

      <div class="grid grid-2" style="align-items:start">
        <section class="card">
          ${ui.sectionHead('میانگین هر درس', 'بر اساس همه نمرات همان درس', '')}
          ${renderSubjectGrades(state, stats)}
        </section>
        <section class="card">
          ${ui.sectionHead('نمره‌های دستی', 'پرسش کلاسی، فعالیت، پروژه و…', `<button class="btn btn-primary btn-sm" data-add-grade>${icon('plus', 14)} نمره جدید</button>`)}
          ${renderManualGrades(state)}
        </section>
      </div>
    `;

    root.querySelectorAll('[data-add-grade]').forEach((btn) => {
      btn.addEventListener('click', () => App.forms.openManualGrade());
    });

    root.querySelectorAll('[data-exam-taken]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const exam = state.exams.find((e) => e.id === btn.dataset.examTaken);
        if (!exam) return;
        App.store.update((draft) => {
          const target = draft.exams.find((e) => e.id === exam.id);
          target.taken = !target.taken;
        });
        ui.toast(exam.taken ? 'علامت شرکت برداشته شد.' : 'امتحان به عنوان شرکت‌شده ثبت شد.', 'info');
      });
    });

    root.querySelectorAll('[data-exam-score]').forEach((input) => {
      input.addEventListener('change', () => {
        const exam = state.exams.find((e) => e.id === input.dataset.examScore);
        if (!exam) return;
        const raw = input.value.trim();
        if (!raw) {
          App.store.update((draft) => {
            const target = draft.exams.find((e) => e.id === exam.id);
            target.score = null;
          });
          ui.toast('نمره پاک شد.', 'info');
          return;
        }
        const score = Number(raw);
        if (Number.isNaN(score) || score < 0 || score > max) {
          ui.toast(`نمره باید بین ۰ و ${u.toFa(max)} باشد.`, 'error');
          input.value = exam.score ?? '';
          return;
        }
        App.store.update((draft) => {
          const target = draft.exams.find((e) => e.id === exam.id);
          target.score = score;
          target.taken = true;
        });
        ui.toast('نمره ذخیره شد.', 'success');
      });
    });

    root.querySelectorAll('[data-grade-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const grade = state.manualGrades.find((g) => g.id === btn.dataset.gradeEdit);
        if (grade) App.forms.openManualGrade({ grade });
      });
    });

    root.querySelectorAll('[data-grade-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const grade = state.manualGrades.find((g) => g.id === btn.dataset.gradeDel);
        if (!grade) return;
        const ok = await ui.confirm({
          title: 'حذف نمره دستی',
          message: `نمره «${grade.title}» از میانگین حذف شود؟`,
          danger: true,
          confirmText: 'حذف کن'
        });
        if (!ok) return;
        App.store.update((draft) => {
          draft.manualGrades = draft.manualGrades.filter((g) => g.id !== grade.id);
        });
        ui.toast('نمره حذف شد.', 'info');
      });
    });
  }

  App.pages = App.pages || {};
  App.pages.grades = { render };
})();
