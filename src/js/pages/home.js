/* درس‌نامه — home dashboard */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'شب بخیر';
    if (h < 12) return 'صبح بخیر';
    if (h < 17) return 'ظهر بخیر';
    if (h < 20) return 'عصر بخیر';
    return 'شب بخیر';
  }

  function nextSchoolDate(state) {
    for (let i = 0; i < 8; i += 1) {
      const iso = u.addDays(u.todayISO(), i);
      if (state.settings.weekDays.includes(u.weekdayKey(iso))) return iso;
    }
    return u.todayISO();
  }

  function todayMin() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function resolvedPeriods(state, iso) {
    const dayKey = u.weekdayKey(iso);
    return (state.schedule[dayKey] || []).map((p, index) => ({
      period: p,
      index,
      subjectId: u.resolveSubject(state, p, iso)
    }));
  }

  function nextClass(state, fromDate = u.todayISO(), fromMin = todayMin()) {
    for (let d = 0; d < 8; d += 1) {
      const iso = u.addDays(fromDate, d);
      if (!state.settings.weekDays.includes(u.weekdayKey(iso))) continue;
      const list = resolvedPeriods(state, iso);
      for (const item of list) {
        if (!item.subjectId) continue;
        const end = u.timeToMinutes(item.period.end || '23:59');
        const start = u.timeToMinutes(item.period.start || '00:00');
        if (d > 0 || end > fromMin) {
          return { ...item, date: iso, current: d === 0 && start <= fromMin && fromMin < end };
        }
      }
    }
    return null;
  }

  function countdown(iso) {
    const diff = u.daysBetween(u.todayISO(), iso);
    if (diff === 0) return { text: 'امروز', cls: 'today' };
    if (diff === 1) return { text: 'فردا', cls: 'soon' };
    return { text: `${u.toFa(diff)} روز دیگر`, cls: '' };
  }

  function renderTodayClasses(state, date) {
    const list = resolvedPeriods(state, date).filter((x) => x.subjectId);
    if (!list.length) {
      return ui.emptyState('calendar', 'برای این روز زنگی ثبت نشده', 'از صفحه برنامه هفتگی می‌توانی زنگ‌ها و دروس را اضافه کنی.', '<button class="btn btn-soft btn-sm" data-go="schedule">رفتن به برنامه هفتگی</button>');
    }
    const currentMin = todayMin();
    return `<div class="today-classes">${list.map(({ period, index, subjectId }) => {
      const subject = u.subjectById(state, subjectId);
      const start = u.timeToMinutes(period.start || '00:00');
      const end = u.timeToMinutes(period.end || '23:59');
      const isCurrent = date === u.todayISO() && start <= currentMin && currentMin < end;
      return `
        <div class="class-row ${isCurrent ? 'current' : ''}">
          <div class="class-time-box">
            <strong>${u.formatTime(period.start || '—')}</strong>
            <span>${u.formatTime(period.end || '—')}</span>
          </div>
          <div class="class-main">
            <div class="class-subject" style="--c:${subject?.color || 'var(--accent)'}">
              <i></i>${u.escapeHtml(subject?.name || 'بدون درس')}
              ${isCurrent ? '<span class="class-now-badge">در حال برگزاری</span>' : ''}
            </div>
            <div class="class-meta">
              <span>زنگ ${u.toFa(index + 1)}</span>
              ${period.rotating ? '<span class="badge badge-accent" style="font-size:8.5px;padding:0 5px">چرخشی</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('')}</div>`;
  }

  function renderHomework(state, items) {
    if (!items.length) {
      return ui.emptyState('tasks', 'تکلیفی برای امروز و روزهای بعد نیست', 'می‌توانی همین حالا یک تکلیف جدید اضافه کنی.', '<button class="btn btn-primary btn-sm" data-add-hw>افزودن تکلیف</button>');
    }
    return `<div class="task-list">${items.map((hw) => {
      const subject = u.subjectById(state, hw.subjectId);
      const status = u.homeworkStatus(state, hw);
      const due = u.dueForHomework(state, hw);
      const overdue = status === 'overdue';
      return `
        <div class="task-item ${hw.done ? 'done' : ''} ${overdue ? 'overdue' : ''}" data-hw="${hw.id}">
          <button class="task-check" data-hw-toggle="${hw.id}" aria-label="${hw.done ? 'برگرداندن' : 'انجام شد'}">${icon('check', 13)}</button>
          <div class="task-main">
            <div class="task-title">${u.escapeHtml(hw.title)}</div>
            <div class="task-meta-row">
              ${subject ? `<span class="subject-chip" style="--c:${subject.color}"><i></i>${u.escapeHtml(subject.name)}</span>` : ''}
              <span>${icon('clock', 12)} ${u.escapeHtml(u.dueLabel(state, hw))}</span>
              ${overdue ? '<span class="badge badge-danger">معوق</span>' : ''}
              ${due?.auto ? '<span class="badge badge-muted">مهلت خودکار</span>' : ''}
            </div>
            ${hw.description ? `<div class="task-desc">${u.escapeHtml(hw.description)}</div>` : ''}
          </div>
          <div class="task-actions">
            <button class="icon-btn sm" data-hw-edit="${hw.id}" aria-label="ویرایش">${icon('edit', 14)}</button>
            <button class="icon-btn sm danger" data-hw-del="${hw.id}" aria-label="حذف">${icon('trash', 14)}</button>
          </div>
        </div>
      `;
    }).join('')}</div>`;
  }

  function renderExams(state, exams) {
    if (!exams.length) {
      return ui.emptyState('exam', 'امتحان نزدیکی ثبت نشده', 'از صفحه امتحانات می‌توانی امتحان‌های آینده را ثبت کنی.', '<button class="btn btn-soft btn-sm" data-go="exams">ثبت امتحان</button>');
    }
    return `<div class="exam-list">${exams.map((exam) => {
      const subject = u.subjectById(state, exam.subjectId);
      const cd = countdown(exam.date);
      return `
        <div class="exam-item">
          <div class="exam-date-box">
            <strong>${u.faDay(exam.date)}</strong>
            <span>${u.faDate(exam.date, { month: 'short' })}</span>
          </div>
          <div class="exam-info">
            <strong>${u.escapeHtml(exam.title)}</strong>
            <span>
              ${subject ? `<span class="subject-chip" style="--c:${subject.color}"><i></i>${u.escapeHtml(subject.name)}</span>` : ''}
              ${u.faDate(exam.date, { weekday: 'long' })}
            </span>
          </div>
          <span class="countdown ${cd.cls}">${cd.text}</span>
        </div>
      `;
    }).join('')}</div>`;
  }

  function renderStrengths(state) {
    const used = u.usedSubjectIds(state);
    const rows = state.subjects
      .filter((s) => used.has(s.id) && s.strength)
      .sort((a, b) => a.strength - b.strength)
      .slice(0, 4);
    if (!rows.length) {
      return ui.emptyState('target', 'سطح دروس را مشخص کن', 'با تعیین سطح هر درس، برنامه بهتری برای مطالعه‌ات پیشنهاد می‌شود.', '<button class="btn btn-soft btn-sm" data-go="settings">تنظیم سطح دروس</button>');
    }
    return `
      <div class="strength-bars" style="grid-template-columns:1fr">
        ${rows.map((s) => {
          const meta = u.strengthMeta(s.strength);
          return `
            <div class="strength-bar-row">
              <div class="strength-bar-top">
                <strong style="--c:${s.color}"><i></i>${u.escapeHtml(s.name)}</strong>
                <span class="badge badge-strength" style="--tone:${meta.color}">${meta.label}</span>
              </div>
              <div class="strength-track"><span style="width:${s.strength * 20}%;--tone:${meta.color}"></span></div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="row" style="margin-top:12px;justify-content:space-between">
        <span class="tiny muted">ضعیف‌ترین درس‌ها اول نمایش داده می‌شوند</span>
        <button class="btn btn-ghost btn-sm" data-go="summary">نمای کلی</button>
      </div>
    `;
  }

  function renderStudyCard(state) {
    const rec = u.studyRecommendations(state);
    const review = rec.review[0] || null;
    const pre = rec.pre[0] || null;
    const sessions = u.studySessions(state);
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const iso = u.addDays(u.todayISO(), -i);
      const minutes = sessions
        .filter((s) => s.date === iso)
        .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
      days.push({ iso, minutes });
    }
    const todayMinutes = days[days.length - 1].minutes;
    const weekMinutes = days.reduce((sum, d) => sum + d.minutes, 0);
    const max = Math.max(...days.map((d) => d.minutes), 1);
    const todayBySubject = u.studyBySubject(state, { from: u.todayISO(), to: u.todayISO() })
      .filter((row) => row.minutes > 0)
      .slice(0, 4);

    const reco = (kind, row, emptyText) => {
      const subject = row?.subject;
      const label = kind === 'review' ? 'دوره مباحث' : 'پیش‌مطالعه';
      const dayLabel = kind === 'review' ? 'امروز' : 'فردا';
      return `
        <button class="home-reco ${kind}" data-study-start="${kind}" ${subject ? `data-study-subject="${u.escapeAttr(subject.id)}"` : 'disabled'}>
          <span class="home-reco-top">${icon(kind === 'review' ? 'refresh' : 'book', 13)} ${label} • ${dayLabel}</span>
          <strong style="--c:${subject?.color || 'var(--muted-2)'}">${subject ? `<i></i>${u.escapeHtml(subject.name)}` : emptyText}</strong>
          <span>${subject
            ? `${u.toFa(row.slots.length)} زنگ • ${row.doneMinutes ? `${u.toFa(row.doneMinutes)} دقیقه مطالعه امروز` : 'هنوز مطالعه نشده'}`
            : 'برای این بخش درسی پیدا نشد'}</span>
        </button>
      `;
    };

    return `
      <div class="section-head" style="margin-bottom:10px">
        <div>
          <h2>${icon('sparkles', 17)} پیشنهاد مطالعه</h2>
          <p>بر اساس برنامهٔ امروز و فردا — درس‌های ضعیف‌تر اول پیشنهاد می‌شوند</p>
        </div>
        <button class="btn btn-primary btn-sm" data-go="study">${icon('play', 12)} مطالعه عصرانه</button>
      </div>
      <div class="home-reco-grid">
        ${reco('review', review, 'کلاسی برای دوره نیست')}
        ${reco('pre', pre, 'فردا کلاسی نداری')}
      </div>

      <div class="home-study-subjects">
        <span class="home-study-label">زمان مطالعهٔ امروز:</span>
        ${todayBySubject.length
          ? todayBySubject.map(({ subject, minutes }) => `
              <span class="home-study-chip" style="--c:${subject.color}">
                <i></i>${u.escapeHtml(subject.name)} <strong>${u.toFa(minutes)}</strong> دقیقه
              </span>
            `).join('')
          : '<span class="tiny muted">هنوز مطالعه‌ای ثبت نشده</span>'}
      </div>

      <div class="home-study-week">
        <div>
          <strong>${icon('flame', 14)} ${u.toFa(weekMinutes)} دقیقه</strong>
          <span>مطالعه در ۷ روز گذشته</span>
        </div>
        <button class="btn btn-ghost btn-sm" data-go="study">${icon('timer', 13)} شروع</button>
      </div>
      <div class="week-bars">
        ${days.map((d) => {
          const isToday = d.iso === u.todayISO();
          const height = d.minutes ? Math.max(10, Math.round((d.minutes / max) * 100)) : 0;
          return `
            <div class="week-bar ${isToday ? 'today' : ''}" title="${u.toFa(d.minutes)} دقیقه">
              <div class="bar ${d.minutes ? '' : 'bar-empty'}" style="height:${height}%"></div>
              <span>${u.DAY_BY_KEY[u.weekdayKey(d.iso)]?.short || ''}</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="row" style="margin-top:6px;justify-content:space-between">
        <span class="tiny muted">امروز: ${u.toFa(todayMinutes)} دقیقه</span>
        <span class="tiny muted">${u.toFa(sessions.filter((s) => s.date === u.todayISO()).length)} جلسه</span>
      </div>
    `;
  }

  function render(root) {
    const state = App.store.state;
    const now = new Date();
    const todayKey = u.weekdayKey(u.todayISO());
    const isSchoolDay = state.settings.weekDays.includes(todayKey);
    const scheduleDate = isSchoolDay ? u.todayISO() : nextSchoolDate(state);
    const dateLabel = u.faDate(scheduleDate, { weekday: 'long', year: 'numeric' });
    const displayName = state.profile.name ? u.escapeHtml(state.profile.name) : 'دانش‌آموز';

    const pending = state.homework.filter((h) => !h.done);
    const activeNow = pending
      .slice()
      .sort((a, b) => u.dueDateForSort(state, a).localeCompare(u.dueDateForSort(state, b)));

    const exams = u.upcomingExams(state, 4);
    const upcomingCount = state.exams.filter((e) => {
      if (e.taken || (e.score !== null && e.score !== undefined && e.score !== '')) return false;
      const diff = u.daysBetween(u.todayISO(), e.date);
      return diff >= 0 && diff <= 14;
    }).length;
    const next = nextClass(state);
    const todaySessions = u.studySessions(state).filter((s) => s.date === u.todayISO());
    const focusMinutes = todaySessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
    const todayClasses = resolvedPeriods(state, scheduleDate).filter((x) => x.subjectId).length;

    const nextSubject = next ? u.subjectById(state, next.subjectId) : null;
    const nextCard = next && nextSubject ? `
      <div class="hero-next">
        <div class="hero-next-label">${icon(next.current ? 'zap' : 'clock', 14)} ${next.current ? 'همین حالا در کلاس' : 'زنگ بعدی'}</div>
        <div class="hero-next-subject" style="--c:${nextSubject.color}"><i></i>${u.escapeHtml(nextSubject.name)}</div>
        <div class="hero-next-time">${icon('calendar', 13)} ${u.faDate(next.date, { weekday: 'long' })} • زنگ ${u.toFa(next.index + 1)}</div>
        <div class="hero-next-time">${icon('clock', 13)} ${u.formatTime(next.period.start)} تا ${u.formatTime(next.period.end)}</div>
        <div class="mini-progress"><span style="width:${Math.min(100, ((next.index + 1) / Math.max(1, resolvedPeriods(state, next.date).length)) * 100)}%"></span></div>
      </div>
    ` : `
      <div class="hero-next">
        <div class="hero-next-label">${icon('sparkles', 14)} وقت آزاد</div>
        <div class="hero-next-subject" style="--c:var(--accent-2)"><i></i>برنامه‌ای ثبت نشده</div>
        <div class="hero-next-time">از برنامه هفتگی زنگ‌هایت را کامل کن.</div>
        <button class="btn btn-soft btn-sm" data-go="schedule" style="margin-top:4px">${icon('plus', 13)} تکمیل برنامه</button>
      </div>
    `;

    const subline = activeNow.length
      ? `${u.toFa(activeNow.length)} کار برای امروز و روزهای پیش‌رو داری${upcomingCount ? ` و ${u.toFa(upcomingCount)} امتحان نزدیک در پیش است` : ''}. یکی‌یکی جلو برو، همه‌اش شدنی است.`
      : (upcomingCount
        ? `تکلیف بازی نداری، اما ${u.toFa(upcomingCount)} امتحان نزدیک در پیش است. یک مرور کوتاه شروع کن.`
        : 'تکلیف بازی نداری؛ فرصت خوبی برای یک جلسه مطالعهٔ عصرانه یا مرور درس‌هاست.');

    const dateContext = isSchoolDay
      ? u.faDateLong(u.todayISO())
      : `امروز تعطیل است • برنامه ${u.DAY_BY_KEY[u.weekdayKey(scheduleDate)]?.label || 'روز بعد'}`;

    root.innerHTML = `
      <section class="hero">
        <div class="hero-copy">
          <div class="hero-eyebrow"><span class="dot"></span>${dateContext} • ${u.escapeHtml(u.gradeLabel(state.profile.grade))}</div>
          <h1>${greeting()}، <span class="name">${displayName}</span> ${icon('sparkles', 24)}</h1>
          <p class="hero-sub">${subline}</p>
          <div class="hero-actions">
            <button class="btn btn-primary" data-add-hw>${icon('plus', 16)} افزودن تکلیف</button>
            <button class="btn btn-soft" data-go="study">${icon('timer', 16)} مطالعه عصرانه</button>
            <button class="btn btn-ghost" data-go="schedule">${icon('calendar', 16)} برنامه هفتگی</button>
          </div>
          <div class="hero-metrics">
            <div class="hero-metric"><strong>${u.toFa(pending.length)}</strong><span>تکلیف باقی‌مانده</span></div>
            <div class="hero-metric"><strong>${u.toFa(todayClasses)}</strong><span>زنگ ${isSchoolDay ? 'امروز' : 'روز بعد'}</span></div>
            <div class="hero-metric"><strong>${u.toFa(focusMinutes)}</strong><span>دقیقه مطالعه امروز</span></div>
          </div>
        </div>
        <div class="hero-side">${nextCard}</div>
      </section>

      <div class="home-stats">
        ${ui.statCard({ iconName: 'tasks', label: 'تکالیف باقی‌مانده', value: `${u.toFa(pending.length)} <small style="font-size:10px;color:var(--muted)">مورد</small>`, sub: activeNow.length ? `${u.toFa(activeNow.length)} مورد امروز و روزهای آینده` : 'همه‌چیز مرتب است', tone: 'violet' })}
        ${ui.statCard({ iconName: 'exam', label: 'امتحانات نزدیک', value: `${u.toFa(upcomingCount)} <small style="font-size:10px;color:var(--muted)">مورد</small>`, sub: 'تا دو هفته آینده', tone: 'amber' })}
        ${ui.statCard({ iconName: 'award', label: 'معدل فعلی', value: (() => { const overall = u.gradeStats(state).overall; return overall === null ? '—' : `${u.faNumber(overall, 2)} <small style="font-size:10px;color:var(--muted)">از ${u.toFa(state.settings.maxGrade)}</small>`; })(), sub: 'بر اساس نمرات ثبت‌شده', tone: 'green' })}
        ${ui.statCard({ iconName: 'timer', label: 'مطالعه امروز', value: `${u.toFa(focusMinutes)} <small style="font-size:10px;color:var(--muted)">دقیقه</small>`, sub: `${u.toFa(todaySessions.length)} جلسه ثبت‌شده`, tone: 'teal' })}
      </div>

      <div class="home-grid">
        <div class="home-stack">
          <section class="card">
            ${ui.sectionHead(
              isSchoolDay ? 'برنامه امروز' : 'برنامه روز بعد',
              `${dateLabel} • ${u.toFa(todayClasses)} زنگ`,
              `<button class="btn btn-ghost btn-sm" data-go="schedule">${icon('calendar', 14)} برنامه کامل</button>`
            )}
            ${renderTodayClasses(state, scheduleDate)}
          </section>

          <section class="card">
            ${ui.sectionHead(
              'تکالیف امروز و پیش‌رو',
              activeNow.length ? `${u.toFa(activeNow.length)} کار منتظر توست` : 'کاری برای امروز و روزهای آینده نیست',
              `<button class="btn btn-primary btn-sm" data-add-hw>${icon('plus', 14)} تکلیف جدید</button>`
            )}
            ${renderHomework(state, activeNow.slice(0, 6))}
            ${activeNow.length > 6 ? `<div style="text-align:center;margin-top:10px"><button class="btn btn-ghost btn-sm" data-go="homework">دیدن همه (${u.toFa(activeNow.length)})</button></div>` : ''}
          </section>
        </div>

        <div class="home-stack">
          <section class="card">${renderStudyCard(state)}</section>

          <section class="card">
            ${ui.sectionHead('امتحانات نزدیک', 'فقط برای مشاهده — ویرایش در صفحه امتحانات', `<button class="btn btn-ghost btn-sm" data-go="exams">${icon('arrowLeft', 14)} همه</button>`)}
            ${renderExams(state, exams)}
          </section>

          <section class="card">
            ${ui.sectionHead('سطح دروس', 'نقاط قوت و ضعف تو', `<button class="btn btn-ghost btn-sm" data-go="summary">${icon('table', 14)} جمع‌بندی</button>`)}
            ${renderStrengths(state)}
          </section>
        </div>
      </div>
    `;

    root.querySelectorAll('[data-add-hw]').forEach((btn) => {
      btn.addEventListener('click', () => App.forms.openHomework());
    });

    root.querySelectorAll('[data-study-start]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const params = new URLSearchParams({ kind: btn.dataset.studyStart });
        if (btn.dataset.studySubject) params.set('subject', btn.dataset.studySubject);
        location.hash = `#/study?${params.toString()}`;
      });
    });

    root.querySelectorAll('[data-hw-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hw = state.homework.find((h) => h.id === btn.dataset.hwToggle);
        if (!hw) return;
        App.store.update((draft) => {
          const target = draft.homework.find((h) => h.id === hw.id);
          target.done = !target.done;
          target.doneAt = target.done ? new Date().toISOString() : null;
        });
        ui.toast(hw.done ? 'تکلیف به حالت انجام‌نشده برگشت.' : 'آفرین! یک کار دیگر تمام شد.', hw.done ? 'info' : 'success');
      });
    });

    root.querySelectorAll('[data-hw-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hw = state.homework.find((h) => h.id === btn.dataset.hwEdit);
        if (hw) App.forms.openHomework({ homework: hw });
      });
    });

    root.querySelectorAll('[data-hw-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const hw = state.homework.find((h) => h.id === btn.dataset.hwDel);
        if (!hw) return;
        const ok = await ui.confirm({
          title: 'حذف تکلیف',
          message: `«${hw.title}» حذف شود؟ این کار قابل بازگشت نیست.`,
          danger: true,
          confirmText: 'حذف کن'
        });
        if (!ok) return;
        App.store.update((draft) => {
          draft.homework = draft.homework.filter((h) => h.id !== hw.id);
        });
        ui.toast('تکلیف حذف شد.', 'info');
      });
    });
  }

  App.pages = App.pages || {};
  App.pages.home = { render, nextSchoolDate, resolvedPeriods };
})();
