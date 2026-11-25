/* درس‌نامه — afternoon study planner + pomodoro timer */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  const study = {
    kind: 'free',           // pre | review | free
    mode: 'focus',          // focus | short | long
    phase: 'idle',          // idle | running | paused
    endAt: null,
    remaining: null,
    total: null,
    focusMinutes: 25,
    customized: false,
    subjectId: '',
    goal: '',
    focusCount: 0,
    ticker: null,
    mounted: false,
    root: null,
    intentSeen: null
  };

  function settings() {
    return App.store.state.settings.pomodoro;
  }

  function durationMs(mode = study.mode) {
    const s = settings();
    if (mode === 'focus') return study.focusMinutes * 60 * 1000;
    if (mode === 'short') return s.short * 60 * 1000;
    return s.long * 60 * 1000;
  }

  function currentRemaining() {
    if (study.phase === 'running' && study.endAt) return Math.max(0, study.endAt - Date.now());
    if (study.phase === 'paused') return Math.max(0, study.remaining || 0);
    return durationMs();
  }

  function modeLabel(mode = study.mode) {
    if (mode === 'focus') return u.studyKindMeta(study.kind).label;
    if (mode === 'short') return 'استراحت کوتاه';
    return 'استراحت بلند';
  }

  function fmt(ms) {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${u.toFa(String(m).padStart(2, '0'))}:${u.toFa(String(s).padStart(2, '0'))}`;
  }

  function ringProgress() {
    const total = study.phase === 'idle' ? durationMs() : (study.total || durationMs());
    if (!total) return 0;
    return u.clamp(currentRemaining() / total, 0, 1);
  }

  function ensureTicker() {
    if (study.ticker) return;
    study.ticker = setInterval(() => {
      if (study.phase !== 'running') return;
      const rem = currentRemaining();
      if (rem <= 0) {
        finishPhase();
        return;
      }
      updateTimerUI(rem);
    }, 500);
  }

  function updateTimerUI(rem = currentRemaining()) {
    if (!study.mounted || !study.root) return;
    const timeEl = study.root.querySelector('#pomo-time');
    if (timeEl) timeEl.textContent = fmt(rem);
    const circle = study.root.querySelector('#pomo-ring-progress');
    if (circle) {
      const r = Number(circle.getAttribute('r'));
      const circ = 2 * Math.PI * r;
      circle.setAttribute('stroke-dasharray', String(circ));
      circle.setAttribute('stroke-dashoffset', String(circ * (1 - ringProgress())));
    }
    const logBtn = study.root.querySelector('[data-pomo-log]');
    if (logBtn) {
      const elapsed = elapsedMinutes();
      logBtn.classList.toggle('hidden', study.mode !== 'focus' || elapsed < 1);
      const label = logBtn.querySelector('span');
      if (label && elapsed >= 1) label.textContent = `ثبت ${u.toFa(elapsed)} دقیقه`;
    }
    document.title = study.phase === 'running' ? `${fmt(rem)} — درس‌نامه` : 'درس‌نامه — برنامه‌ریز درسی';
  }

  function elapsedMinutes() {
    if (study.mode !== 'focus') return 0;
    if (study.phase === 'running') return Math.floor((durationMs() - currentRemaining()) / 60000);
    if (study.phase === 'paused') return Math.floor(((study.total || durationMs()) - (study.remaining || 0)) / 60000);
    return 0;
  }

  function start() {
    if (study.phase === 'running') return;
    if (study.phase === 'idle' || !study.total) study.total = durationMs();
    const rem = study.phase === 'paused' ? study.remaining || durationMs() : durationMs();
    if (study.phase === 'idle') study.total = durationMs();
    study.phase = 'running';
    study.endAt = Date.now() + rem;
    ensureTicker();
    refresh();
    ui.toast(study.mode === 'focus' ? `${modeLabel()} شروع شد. گوشی را کنار بگذار.` : 'وقت استراحت است.', 'info', 2200);
  }

  function pause() {
    if (study.phase !== 'running') return;
    study.remaining = currentRemaining();
    study.phase = 'paused';
    study.endAt = null;
    refresh();
  }

  function reset() {
    study.phase = 'idle';
    study.endAt = null;
    study.remaining = null;
    study.total = null;
    refresh();
  }

  function skip() {
    if (study.phase === 'idle') return;
    const wasMode = study.mode;
    study.phase = 'idle';
    study.endAt = null;
    study.remaining = null;
    if (wasMode === 'focus') {
      setMode(study.focusCount > 0 && study.focusCount % settings().longEvery === 0 ? 'long' : 'short');
      ui.toast('این جلسه رد شد؛ وقت استراحت.', 'info');
    } else {
      setMode('focus');
      ui.toast('استراحت رد شد؛ آماده تمرکز بعدی هستی.', 'info');
    }
    refresh();
  }

  function setMode(mode) {
    study.mode = mode;
    study.phase = 'idle';
    study.endAt = null;
    study.remaining = null;
    study.total = null;
    updateTimerUI();
  }

  function beep() {
    if (!settings().sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      [0, 0.22, 0.44].forEach((offset, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = [660, 880, 1040][index];
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.32);
      });
      setTimeout(() => ctx.close?.(), 1500);
    } catch (error) {
      console.warn('beep failed', error);
    }
  }

  function appNotify(title, body) {
    if (!App.store.state.settings.notifications) return;
    try { window.api?.notify?.(title, body); } catch (error) { console.warn(error); }
  }

  function logSession(minutes, kind = study.kind) {
    const value = Math.max(1, Math.round(Number(minutes) || 0));
    App.store.update((draft) => {
      draft.pomodoroSessions.push({
        id: u.uid('pomo'),
        subjectId: study.subjectId || null,
        goal: study.goal || '',
        minutes: value,
        mode: 'focus',
        kind,
        completedAt: new Date().toISOString(),
        date: u.todayISO()
      });
    });
    return value;
  }

  function finishPhase() {
    const finishedMode = study.mode;
    const s = settings();
    study.endAt = null;
    study.remaining = null;
    study.phase = 'idle';
    let nextMode = 'focus';

    if (finishedMode === 'focus') {
      study.focusCount += 1;
      const minutes = logSession(study.focusMinutes);
      nextMode = study.focusCount % Math.max(1, s.longEvery) === 0 ? 'long' : 'short';
      const body = `${u.toFa(minutes)} دقیقه ${modeLabel()} ثبت شد. ${nextMode === 'long' ? 'وقت استراحت بلند است.' : 'یک استراحت کوتاه به خودت بده.'}`;
      ui.toast('جلسه مطالعه کامل شد! ' + body, 'success', 6000);
      appNotify('جلسه مطالعه کامل شد', body);
    } else {
      nextMode = 'focus';
      ui.toast('استراحت تمام شد. آماده تمرکز بعدی هستی؟', 'info', 5000);
      appNotify('استراحت تمام شد', 'وقت مطالعه بعدی است.');
    }

    beep();
    setMode(nextMode);
    study.total = durationMs(nextMode);

    if (s.autoStart) {
      setTimeout(() => { start(); }, 900);
    } else {
      refresh();
    }
  }

  function logElapsed(notify = true) {
    const minutes = elapsedMinutes();
    if (!minutes) return;
    const kind = study.kind;
    study.phase = 'idle';
    study.endAt = null;
    study.remaining = null;
    study.total = null;
    logSession(minutes, kind);
    if (notify) ui.toast(`${u.toFa(minutes)} دقیقه مطالعه ثبت شد.`, 'success');
    refresh();
  }

  function refresh() {
    if (study.mounted && study.root) {
      App.pages.study.render(study.root);
    }
  }

  function resetState() {
    study.phase = 'idle';
    study.endAt = null;
    study.remaining = null;
    study.total = null;
    study.mode = 'focus';
    study.focusCount = 0;
    study.subjectId = '';
    study.goal = '';
    study.intentSeen = null;
    if (study.mounted) refresh();
  }

  /* --------------------------------- helpers -------------------------------- */

  function weekBars(state) {
    const sessions = u.studySessions(state);
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const iso = u.addDays(u.todayISO(), -i);
      const minutes = sessions
        .filter((s) => s.date === iso)
        .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
      days.push({ iso, minutes });
    }
    const max = Math.max(...days.map((d) => d.minutes), 1);
    return `<div class="week-bars">${days.map((d) => `
      <div class="week-bar ${d.iso === u.todayISO() ? 'today' : ''}" title="${u.toFa(d.minutes)} دقیقه">
        <div class="bar ${d.minutes ? '' : 'bar-empty'}" style="height:${d.minutes ? Math.max(10, Math.round((d.minutes / max) * 100)) : 0}%"></div>
        <span>${u.DAY_BY_KEY[u.weekdayKey(d.iso)]?.short || ''}</span>
      </div>
    `).join('')}</div>`;
  }

  function planRow(state, row, kind) {
    const subject = row.subject;
    const meta = u.strengthMeta(subject.strength);
    const slots = row.slots.map((s) => `زنگ ${u.toFa(s.index + 1)}`).join('، ');
    return `
      <div class="study-plan-row">
        <span class="study-plan-dot" style="--c:${subject.color}"></span>
        <div class="study-plan-info">
          <strong>${u.escapeHtml(subject.name)}</strong>
          <span>
            ${slots}
            ${row.doneMinutes ? ` • امروز ${u.toFa(row.doneMinutes)} دقیقه مطالعه` : ''}
          </span>
        </div>
        ${meta ? `<span class="study-strength" style="--tone:${meta.color}">${meta.label}</span>` : ''}
        <button class="btn btn-soft btn-sm" data-plan-start="${kind}" data-plan-subject="${u.escapeAttr(subject.id)}">
          ${icon('play', 11)} شروع
        </button>
      </div>
    `;
  }

  function planColumn({ tone, title, subtitle, rows, kind, emptyText, state }) {
    return `
      <div class="study-plan-col">
        <div class="study-plan-head">
          <span class="study-plan-tag ${tone}">${title}</span>
          <div class="study-plan-head-text">
            <strong>${subtitle.main}</strong>
            <span>${subtitle.sub}</span>
          </div>
        </div>
        ${rows.length
          ? rows.slice(0, 4).map((row) => planRow(state, row, kind)).join('')
          : `<p class="study-plan-empty">${icon('info', 12)} ${emptyText}</p>`}
        ${rows.length > 4 ? `<span class="tiny muted" style="align-self:flex-start">و ${u.toFa(rows.length - 4)} درس دیگر</span>` : ''}
      </div>
    `;
  }

  function renderPlan(state) {
    const rec = u.studyRecommendations(state);
    const tomorrowSchool = state.settings.weekDays.includes(u.weekdayKey(rec.tomorrow));
    const todaySchool = state.settings.weekDays.includes(u.weekdayKey(rec.today));

    const reviewEmpty = !todaySchool
      ? 'امروز کلاس نداشتی؛ فرصت خوبی برای پیش‌مطالعهٔ فرداست.'
      : 'برای امروز درسی در برنامه ثبت نشده.';

    const preEmpty = !tomorrowSchool
      ? 'فردا تعطیل است؛ پیش‌مطالعه لازم نداری.'
      : 'برای فردا درسی در برنامه ثبت نشده.';

    return `
      <section class="card study-plan">
        ${ui.sectionHead(
          'برنامهٔ مطالعهٔ عصر',
          'درس‌نامه خودش می‌گوید امروز چه چیزی را دوره کنی و برای فردا چه چیزی را پیش‌مطالعه کنی.',
          `<button class="btn btn-ghost btn-sm" data-go="schedule">${icon('calendar', 14)} برنامه هفتگی</button>`
        )}
        <div class="study-plan-grid">
          ${planColumn({
            tone: 'review',
            title: 'دوره مباحث',
            subtitle: {
              main: `امروز • ${u.faDate(rec.today, { weekday: 'long' })}`,
              sub: 'درس‌هایی که امروز در برنامه‌ات بوده‌اند؛ بعد از مدرسه دوره کن.'
            },
            rows: rec.review,
            kind: 'review',
            emptyText: reviewEmpty,
            state
          })}
          ${planColumn({
            tone: 'pre',
            title: 'پیش‌مطالعه',
            subtitle: {
              main: `فردا • ${u.faDate(rec.tomorrow, { weekday: 'long' })}`,
              sub: 'یک روز قبل از کلاس، درس فردا را مرور کن.'
            },
            rows: rec.pre,
            kind: 'pre',
            emptyText: preEmpty,
            state
          })}
        </div>
      </section>
    `;
  }

  function renderTodayBySubject(state) {
    const rows = u.studyBySubject(state, { from: u.todayISO(), to: u.todayISO() })
      .filter((row) => row.minutes > 0);
    if (!rows.length) {
      return `<p class="study-mini-empty">${icon('info', 12)} هنوز امروز مطالعه‌ای ثبت نشده.</p>`;
    }
    const max = Math.max(...rows.map((row) => row.minutes), 1);
    return `<div class="study-subject-list">${rows.slice(0, 6).map(({ subject, minutes }) => `
      <div class="study-subject-row">
        <span class="study-subject-name"><i style="--c:${subject.color}"></i>${u.escapeHtml(subject.name)}</span>
        <span class="study-subject-track"><span style="width:${Math.max(6, Math.round((minutes / max) * 100))}%;--c:${subject.color}"></span></span>
        <strong>${u.toFa(minutes)}<small>دقیقه</small></strong>
      </div>
    `).join('')}</div>`;
  }

  function renderTimers(state) {
    const s = settings();
    if (!study.customized) study.focusMinutes = s.focus;
    const running = study.phase === 'running';
    const paused = study.phase === 'paused';
    const idle = study.phase === 'idle';
    const remaining = currentRemaining();
    const total = idle ? durationMs() : (study.total || durationMs());
    const progress = total ? u.clamp(remaining / total, 0, 1) : 1;
    const size = 240;
    const stroke = 9;
    const radius = (size - stroke) / 2;
    const circ = 2 * Math.PI * radius;
    const subject = u.subjectById(state, study.subjectId);
    const kind = u.studyKindMeta(study.kind);
    const breakMode = study.mode !== 'focus';

    return `
      <section class="pomo-stage ${running ? 'is-running' : ''}">
        <div class="pomo-modes study-kinds" role="tablist" aria-label="نوع مطالعه">
          ${u.STUDY_KINDS.map((item) => `
            <button class="pomo-mode ${study.kind === item.id ? 'active' : ''}" data-study-kind="${item.id}" ${!idle ? 'disabled' : ''} title="${item.hint}">
              ${item.label}
            </button>
          `).join('')}
        </div>

        <div class="pomo-picker">
          <label for="pomo-subject">درس این جلسه</label>
          <select class="select" id="pomo-subject" ${running ? 'disabled' : ''}>
            <option value="">بدون درس — مطالعه آزاد</option>
            ${state.subjects.slice().sort((a, b) => u.comparePersian(a.name, b.name)).map((x) =>
              `<option value="${u.escapeAttr(x.id)}" ${study.subjectId === x.id ? 'selected' : ''}>${u.escapeHtml(x.name)}</option>`
            ).join('')}
          </select>
          <input class="input" id="pomo-goal" maxlength="90" placeholder="هدف این جلسه (اختیاری): مثلاً تمرین‌های فصل ۳" value="${u.escapeAttr(study.goal)}" ${running ? 'disabled' : ''}>
        </div>

        <div class="pomo-ring-wrap">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="rgba(148,163,184,.14)" stroke-width="${stroke}"/>
            <circle id="pomo-ring-progress" cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="var(--accent)" stroke-width="${stroke}"
              stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - progress)}"
              transform="rotate(-90 ${size / 2} ${size / 2})"/>
          </svg>
          <div class="pomo-time">
            <span class="pomo-phase">${running ? (breakMode ? 'در حال استراحت' : `در حال ${kind.label}`) : paused ? 'متوقف شده' : breakMode ? 'آماده استراحت' : 'آماده شروع'}</span>
            <strong id="pomo-time">${fmt(remaining)}</strong>
            <span>${breakMode ? modeLabel() : kind.label} • ${u.toFa(Math.round(total / 60000))} دقیقه</span>
          </div>
        </div>

        <div class="pomo-subject-line">
          ${subject ? `<span class="subject-chip" style="--c:${subject.color};font-size:11px"><i></i>${u.escapeHtml(subject.name)}</span>` : `<span class="badge badge-muted">بدون درس</span>`}
          <span class="study-kind-badge ${study.kind}">${kind.label}</span>
          ${study.goal ? `<span class="pomo-goal-text">${u.escapeHtml(study.goal)}</span>` : ''}
        </div>

        ${!breakMode && idle ? `
          <div class="pomo-presets">
            <span>مدت این جلسه:</span>
            ${[15, 20, 25, 45, 50].map((m) => `<button class="chip ${study.focusMinutes === m ? 'active' : ''}" data-preset="${m}">${u.toFa(m)} دقیقه</button>`).join('')}
            <input type="number" class="pomo-custom" id="pomo-custom" min="1" max="120" value="${study.focusMinutes}" aria-label="مدت دلخواه"> <span>دقیقه</span>
          </div>
        ` : ''}

        <div class="pomo-controls">
          <button class="btn btn-primary btn-lg pomo-start" data-pomo-start>${icon(running ? 'pause' : 'play', 18)} ${running ? 'توقف موقت' : paused ? 'ادامه' : !breakMode ? (study.kind === 'pre' ? 'شروع پیش‌مطالعه' : study.kind === 'review' ? 'شروع دوره مباحث' : 'شروع مطالعه') : 'شروع استراحت'}</button>
          <button class="btn btn-soft btn-sm ${elapsedMinutes() >= 1 && !breakMode ? '' : 'hidden'}" data-pomo-log title="زمان سپری‌شده را ثبت کن و زمان‌سنج را صفر کن">
            ${icon('check', 14)} <span>ثبت ${u.toFa(elapsedMinutes() || 1)} دقیقه</span>
          </button>
          <button class="icon-btn" data-pomo-reset title="ریست" aria-label="ریست">${icon('reset', 18)}</button>
          ${!idle ? `<button class="icon-btn" data-pomo-skip title="رد کردن این مرحله" aria-label="رد کردن">${icon('skip', 17)}</button>` : ''}
        </div>

        <p class="pomo-tip">${icon('info', 12)} ${running || paused ? 'اگر زودتر تمام کردی، با «ثبت زمان» همان مقدار مطالعه‌شده ذخیره می‌شود. زمان کامل هم خودکار در آمار ثبت می‌شود.' : 'پیشنهاد: ۲۵ دقیقه پیش‌مطالعه یا دوره، سپس ۵ دقیقه استراحت. بعد از هر ۴ دور، یک استراحت بلندتر.'}</p>
        <span class="tiny muted">${icon('timer', 11)} ${u.toFa(s.focus)} / ${u.toFa(s.short)} / ${u.toFa(s.long)} دقیقه — قابل تغییر در تنظیمات</span>
      </section>
    `;
  }

  function render(root) {
    const state = App.store.state;
    applyIntent(state);

    const todaySessions = u.studySessions(state).filter((x) => x.date === u.todayISO());
    const todayMinutes = todaySessions.reduce((sum, x) => sum + (Number(x.minutes) || 0), 0);
    const weekMinutes = u.studyMinutes(state, { from: u.weekStart(), to: u.weekEnd() });
    const recent = u.studySessions(state)
      .slice()
      .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
      .slice(0, 6);

    root.innerHTML = `
      ${ui.pageHeader(
        'مطالعه عصرانه',
        'بعد از مدرسه، درس‌های امروز را دوره کن و درس‌های فردا را پیش‌مطالعه کن. زمان‌سنج، پومودورو و آمار هر درس همراهت است.',
        `<button class="btn btn-ghost" data-go="settings">${icon('settings', 15)} تنظیم زمان‌ها</button>
         <span class="badge badge-muted">${icon('flame', 12)} این هفته ${u.toFa(weekMinutes)} دقیقه</span>`
      )}

      ${renderPlan(state)}

      <div class="pomodoro-grid">
        ${renderTimers(state)}

        <aside class="pomo-side">
          <section class="card">
            ${ui.sectionHead('مطالعهٔ امروز', 'جلسه‌های ثبت‌شده', '')}
            <div class="pomo-stats">
              <div class="pomo-stat"><strong>${u.toFa(todaySessions.length)}</strong><span>جلسه امروز</span></div>
              <div class="pomo-stat"><strong>${u.toFa(todayMinutes)}</strong><span>دقیقه مطالعه</span></div>
              <div class="pomo-stat"><strong>${u.toFa(new Set(todaySessions.map((x) => x.subjectId).filter(Boolean)).size)}</strong><span>درس امروز</span></div>
            </div>
            ${weekBars(state)}
          </section>

          <section class="card">
            ${ui.sectionHead('زمان هر درس امروز', 'فقط مطالعه‌های ثبت‌شده', `<span class="badge badge-muted">${u.toFa(todayMinutes)} دقیقه</span>`)}
            ${renderTodayBySubject(state)}
          </section>

          <section class="card">
            ${ui.sectionHead('آخرین جلسه‌ها', 'پیش‌مطالعه، دوره و مطالعه آزاد', `<span class="badge badge-muted">${u.toFa(u.studySessions(state).length)} کل</span>`)}
            ${recent.length ? `<div class="session-list">${recent.map((x) => {
              const sub = u.subjectById(state, x.subjectId);
              const kind = u.studyKindMeta(x.kind);
              const d = new Date(x.completedAt);
              const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
              return `<div class="session-item">
                <span class="session-dot" style="--c:${sub?.color || 'var(--accent-2)'}"></span>
                <strong>${u.escapeHtml(sub?.name || x.goal || 'مطالعه آزاد')}</strong>
                <span class="study-kind-badge ${x.kind}">${kind.label}</span>
                <span>${u.toFa(x.minutes)} دقیقه • ${u.formatTime(time)}</span>
              </div>`;
            }).join('')}</div>` : ui.emptyState('timer', 'هنوز جلسه‌ای ثبت نشده', 'اولین جلسهٔ مطالعهٔ امروز را شروع کن.')}
          </section>
        </aside>
      </div>
    `;

    study.mounted = true;
    study.root = root;

    const subjectSelect = root.querySelector('#pomo-subject');
    subjectSelect?.addEventListener('change', () => { study.subjectId = subjectSelect.value; refresh(); });
    const goalInput = root.querySelector('#pomo-goal');
    goalInput?.addEventListener('input', () => { study.goal = goalInput.value; });

    root.querySelector('[data-pomo-start]')?.addEventListener('click', () => {
      if (study.phase === 'running') {
        pause();
      } else {
        study.subjectId = root.querySelector('#pomo-subject')?.value || '';
        study.goal = root.querySelector('#pomo-goal')?.value.trim() || '';
        start();
      }
    });

    root.querySelector('[data-pomo-reset]')?.addEventListener('click', () => {
      if (study.phase !== 'idle' && study.mode === 'focus' && elapsedMinutes() >= 1) {
        logElapsed();
        return;
      }
      const wasRunning = study.phase !== 'idle';
      reset();
      if (wasRunning) ui.toast('زمان‌سنج ریست شد.', 'info');
    });

    root.querySelector('[data-pomo-log]')?.addEventListener('click', () => logElapsed());
    root.querySelector('[data-pomo-skip]')?.addEventListener('click', () => skip());

    root.querySelectorAll('[data-study-kind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (study.phase !== 'idle') return;
        study.kind = btn.dataset.studyKind;
        refresh();
      });
    });

    root.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        study.focusMinutes = Number(btn.dataset.preset) || 25;
        study.customized = true;
        reset();
      });
    });

    root.querySelector('#pomo-custom')?.addEventListener('change', (event) => {
      const value = u.clamp(Number(event.target.value) || 25, 1, 120);
      study.focusMinutes = value;
      study.customized = true;
      reset();
    });

    root.querySelectorAll('[data-plan-start]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (study.phase !== 'idle') {
          ui.toast('اول جلسهٔ فعلی را تمام یا ریست کن، بعد جلسهٔ جدید بساز.', 'info');
          return;
        }
        study.kind = btn.dataset.planStart;
        study.subjectId = btn.dataset.planSubject;
        study.mode = 'focus';
        study.total = null;
        study.remaining = null;
        study.phase = 'idle';
        refresh();
        document.querySelector('.pomo-stage')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    updateTimerUI();
  }

  function applyIntent(state) {
    const raw = String(location.hash || '');
    const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
    const signature = query;
    if (signature === study.intentSeen) return;
    study.intentSeen = signature;
    if (!query) return;
    const params = new URLSearchParams(query);
    const kind = params.get('kind');
    const subject = params.get('subject');
    if (study.phase !== 'idle') return;
    if (u.STUDY_KINDS.some((k) => k.id === kind)) study.kind = kind;
    if (subject && state.subjects.some((s) => s.id === subject)) study.subjectId = subject;
    study.mode = 'focus';
  }

  function unmount() {
    study.mounted = false;
    study.root = null;
    document.title = 'درس‌نامه — برنامه‌ریز درسی';
  }

  App.pages = App.pages || {};
  App.pages.study = { render, unmount, study, resetState };
})();
