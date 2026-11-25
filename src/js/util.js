/* درس‌نامه — shared helpers, data defaults and schedule logic */
(function () {
  const App = (window.App = window.App || {});

  const DAYS = [
    { key: 'sat', label: 'شنبه', short: 'ش', jsDay: 6 },
    { key: 'sun', label: 'یکشنبه', short: 'ی', jsDay: 0 },
    { key: 'mon', label: 'دوشنبه', short: 'د', jsDay: 1 },
    { key: 'tue', label: 'سه‌شنبه', short: 'س', jsDay: 2 },
    { key: 'wed', label: 'چهارشنبه', short: 'چ', jsDay: 3 },
    { key: 'thu', label: 'پنجشنبه', short: 'پ', jsDay: 4 },
    { key: 'fri', label: 'جمعه', short: 'ج', jsDay: 5 }
  ];

  const DAY_BY_KEY = Object.fromEntries(DAYS.map((d) => [d.key, d]));
  const DAY_BY_JS = Object.fromEntries(DAYS.map((d) => [d.jsDay, d]));

  const SUBJECT_COLORS = [
    '#8b5cf6', '#2dd4bf', '#f472b6', '#f59e0b', '#60a5fa', '#a3e635',
    '#fb7185', '#22d3ee', '#c084fc', '#fbbf24', '#34d399', '#818cf8',
    '#f87171', '#4ade80', '#e879f9', '#38bdf8', '#facc15', '#fb923c'
  ];

  const DEFAULT_SUBJECTS = [
    ['s-message', 'پیام‌های آسمانی'],
    ['s-farsi', 'فارسی'],
    ['s-tafakor', 'تفکر'],
    ['s-motaleat', 'مطالعات'],
    ['s-varzesh', 'ورزش'],
    ['s-zist', 'زیست'],
    ['s-shimi', 'شیمی'],
    ['s-zaban', 'زبان'],
    ['s-komp', 'کامپیوتر'],
    ['s-kar', 'کار و فناوری'],
    ['s-roshana', 'روشنا'],
    ['s-riazi', 'ریاضی'],
    ['s-honar', 'هنر'],
    ['s-fizik', 'فیزیک'],
    ['s-arabi', 'عربی'],
    ['s-quran', 'قرآن']
  ];

  const STRENGTHS = [
    { level: 1, label: 'خیلی ضعیف', color: '#f87171' },
    { level: 2, label: 'ضعیف', color: '#fb923c' },
    { level: 3, label: 'متوسط', color: '#facc15' },
    { level: 4, label: 'خوب', color: '#4ade80' },
    { level: 5, label: 'قوی', color: '#2dd4bf' }
  ];

  const STUDY_KINDS = [
    { id: 'pre', label: 'پیش‌مطالعه', hint: 'یک روز قبل از کلاس' },
    { id: 'review', label: 'دوره مباحث', hint: 'مرور درس‌های امروز' },
    { id: 'free', label: 'مطالعه آزاد', hint: 'تمرکز روی هر درسی' }
  ];

  const ACCENTS = {
    violet: { main: '#8b5cf6', soft: 'rgba(139,92,246,.16)', name: 'بنفش' },
    teal: { main: '#14b8a6', soft: 'rgba(20,184,166,.16)', name: 'فیروزه‌ای' },
    blue: { main: '#3b82f6', soft: 'rgba(59,130,246,.16)', name: 'آبی' },
    rose: { main: '#f43f5e', soft: 'rgba(244,63,94,.16)', name: 'سرخ' },
    amber: { main: '#f59e0b', soft: 'rgba(245,158,11,.16)', name: 'کهربایی' }
  };

  const uid = (prefix = 'id') =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const pad = (n) => String(n).padStart(2, '0');

  function isoOf(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function todayISO() {
    return isoOf(new Date());
  }

  function parseISO(iso) {
    if (!iso) return new Date();
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  }

  function isISODate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y] = value.split('-').map(Number);
    if (y < 1900 || y > 2200) return false;
    return isoOf(parseISO(value)) === value;
  }

  function addDays(iso, days) {
    const d = parseISO(iso);
    d.setDate(d.getDate() + days);
    return isoOf(d);
  }

  function weekdayKey(iso) {
    const d = typeof iso === 'string' ? parseISO(iso) : iso;
    return (DAY_BY_JS[d.getDay()] || DAYS[0]).key;
  }

  function weekStart(iso = todayISO()) {
    const d = parseISO(iso);
    const diff = (d.getDay() + 1) % 7; // Saturday = 0
    d.setDate(d.getDate() - diff);
    return isoOf(d);
  }

  function weekEnd(iso = todayISO()) {
    return addDays(weekStart(iso), 6);
  }

  function weeksBetween(anchorISO, iso) {
    const a = parseISO(weekStart(anchorISO)).getTime();
    const b = parseISO(weekStart(iso)).getTime();
    return Math.round((b - a) / (7 * 24 * 3600 * 1000));
  }

  function daysBetween(fromISO, toISO) {
    return Math.round((parseISO(toISO) - parseISO(fromISO)) / (24 * 3600 * 1000));
  }

  function toFa(value) {
    return String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  }

  function faNumber(value, maxDigits = 2) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    const n = Number(value);
    const rounded = Math.round(n * 10 ** maxDigits) / 10 ** maxDigits;
    return toFa(String(rounded).replace('.', '٫'));
  }

  function faDate(iso, opts = {}) {
    if (!iso) return '—';
    try {
      const date = typeof iso === 'string' ? parseISO(iso) : iso;
      const locale = 'fa-IR-u-ca-persian';
      const weekday = opts.weekday
        ? new Intl.DateTimeFormat(locale, { weekday: opts.weekday }).format(date)
        : '';
      const day = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date);
      const month = new Intl.DateTimeFormat(locale, { month: opts.month || 'long' }).format(date);
      const year = opts.year
        ? new Intl.DateTimeFormat(locale, { year: opts.year }).format(date)
        : '';
      return [weekday, day, month, year].filter(Boolean).join(' ');
    } catch {
      return toFa(iso);
    }
  }

  function faDateShort(iso) {
    return faDate(iso, { month: 'short' });
  }

  function faDay(iso) {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric' }).format(parseISO(iso));
    } catch {
      return toFa(parseISO(iso).getDate());
    }
  }

  function faDateLong(iso) {
    return faDate(iso, { weekday: 'long', year: 'numeric' });
  }

  /* --------------------------- Jalali date math ---------------------------- */

  const JALALI_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const jDiv = (a, b) => ~~(a / b);
  const jMod = (a, b) => a - ~~(a / b) * b;

  function jalCal(jy, withoutLeap = false) {
    const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    const bl = breaks.length;
    const gy = jy + 621;
    let leapJ = -14;
    let jp = breaks[0];
    let jump = 0;
    if (jy < jp || jy >= breaks[bl - 1]) throw new Error(`Invalid Jalaali year ${jy}`);

    for (let i = 1; i < bl; i += 1) {
      const jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + jDiv(jump, 33) * 8 + jDiv(jMod(jump, 33), 4);
      jp = jm;
    }

    let n = jy - jp;
    leapJ = leapJ + jDiv(n, 33) * 8 + jDiv(jMod(n, 33) + 3, 4);
    if (jMod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

    const leapG = jDiv(gy, 4) - jDiv((jDiv(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;
    let leap = 0;

    if (!withoutLeap) {
      if (jump - n < 6) n = n - jump + jDiv(jump + 4, 33) * 33;
      leap = jMod(jMod(n + 1, 33) - 1, 4);
      if (leap === -1) leap = 4;
    }

    return { leap, gy, march };
  }

  function g2d(gy, gm, gd) {
    let d = jDiv((gy + jDiv(gm - 8, 6) + 100100) * 1461, 4)
      + jDiv(153 * jMod(gm + 9, 12) + 2, 5)
      + gd - 34840408;
    d = d - jDiv(jDiv(gy + 100100 + jDiv(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  function d2g(jdn) {
    let j = 4 * jdn + 139361631;
    j = j + jDiv(jDiv(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = jDiv(jMod(j, 1461), 4) * 5 + 308;
    const gd = jDiv(jMod(i, 153), 5) + 1;
    const gm = jMod(jDiv(i, 153), 12) + 1;
    const gy = jDiv(j, 1461) - 100100 + jDiv(8 - gm, 6);
    return { gy, gm, gd };
  }

  function j2d(jy, jm, jd) {
    const r = jalCal(jy, true);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - jDiv(jm, 7) * (jm - 7) + jd - 1;
  }

  function d2j(jdn) {
    const gy = d2g(jdn).gy;
    let jy = gy - 621;
    const r = jalCal(jy, false);
    const jdn1f = g2d(gy, 3, r.march);
    let k = jdn - jdn1f;
    let jm;
    let jd;

    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + jDiv(k, 31);
        jd = jMod(k, 31) + 1;
        return { jy, jm, jd };
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }

    jm = 7 + jDiv(k, 30);
    jd = jMod(k, 30) + 1;
    return { jy, jm, jd };
  }

  function isoToJalaali(iso) {
    const date = typeof iso === 'string' ? parseISO(iso) : (iso || new Date());
    return d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()));
  }

  function jalaaliToISO(jy, jm, jd) {
    const g = d2g(j2d(Number(jy), Number(jm), Number(jd)));
    return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
  }

  function isLeapJalaaliYear(jy) {
    return jalCal(Number(jy)).leap === 0;
  }

  function jalaaliMonthLength(jy, jm) {
    const month = Number(jm);
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    return isLeapJalaaliYear(jy) ? 30 : 29;
  }

  function jalaliMonthName(jm) {
    return JALALI_MONTHS[(Number(jm) || 1) - 1] || '';
  }

  function jalaliToday() {
    return isoToJalaali(todayISO());
  }


  function relativeDate(iso) {
    if (!iso) return '—';
    const diff = daysBetween(todayISO(), iso);
    if (diff === 0) return 'امروز';
    if (diff === 1) return 'فردا';
    if (diff === 2) return 'پس‌فردا';
    if (diff === -1) return 'دیروز';
    if (diff < -1) return `${toFa(Math.abs(diff))} روز پیش`;
    if (diff <= 6) return DAY_BY_KEY[weekdayKey(iso)]?.label || faDateShort(iso);
    return faDateShort(iso);
  }

  function timeToMinutes(time) {
    if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  function minutesToTime(total) {
    const t = ((total % 1440) + 1440) % 1440;
    return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
  }

  function formatTime(time) {
    if (!time) return '—';
    return toFa(time);
  }

  function formatDateTime(date) {
    const iso = isoOf(date);
    return `${formatTime(`${pad(date.getHours())}:${pad(date.getMinutes())}`)} • ${relativeDate(iso)}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function average(numbers) {
    const nums = numbers.filter((n) => typeof n === 'number' && !Number.isNaN(n));
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function subjectById(state, id) {
    if (!state || !id) return null;
    return state.subjects.find((s) => s.id === id) || null;
  }

  function subjectName(state, id) {
    return subjectById(state, id)?.name || 'بدون درس';
  }

  function strengthMeta(level) {
    return STRENGTHS.find((s) => s.level === level) || null;
  }

  function subjectColor(state, id) {
    return subjectById(state, id)?.color || '#8b5cf6';
  }

  function makePeriod(state, dayKey, index, previous) {
    let start;
    if (previous && previous.end) {
      start = minutesToTime(timeToMinutes(previous.end) + 5);
    } else {
      start = minutesToTime(7 * 60 + 30 + index * 55);
    }
    return {
      id: uid('p'),
      subjectId: null,
      rotating: false,
      variants: ['', ''],
      start,
      end: minutesToTime(timeToMinutes(start) + 45)
    };
  }

  function makeDefaultSchedule() {
    const schedule = {};
    DAYS.forEach((d) => { schedule[d.key] = []; });
    ['sat', 'sun', 'mon', 'tue', 'wed'].forEach((key) => {
      let prev = null;
      for (let i = 0; i < 4; i += 1) {
        const p = makePeriod(null, key, i, prev);
        schedule[key].push(p);
        prev = p;
      }
    });
    return schedule;
  }

  function makeDefaultState() {
    const subjects = DEFAULT_SUBJECTS.map(([id, name], index) => ({
      id,
      name,
      color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
      strength: null,
      custom: false
    }));
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      profile: {
        name: '',
        school: '',
        grade: 7,
        setupComplete: false
      },
      settings: {
        weekDays: ['sat', 'sun', 'mon', 'tue', 'wed'],
        maxGrade: 20,
        theme: 'dark',
        accent: 'violet',
        rotating: { anchor: weekStart(), indices: {} },
        pomodoro: {
          focus: 25,
          short: 5,
          long: 15,
          longEvery: 4,
          autoStart: false,
          sound: true
        },
        notifications: true
      },
      subjects,
      schedule: makeDefaultSchedule(),
      homework: [],
      exams: [],
      manualGrades: [],
      pomodoroSessions: []
    };
  }

  function normalizeState(raw) {
    const base = makeDefaultState();
    if (!raw || typeof raw !== 'object' || !Object.keys(raw).length) return base;

    const state = {
      ...base,
      ...raw,
      profile: { ...base.profile, ...(raw.profile || {}) },
      settings: {
        ...base.settings,
        ...(raw.settings || {}),
        rotating: { ...base.settings.rotating, ...((raw.settings || {}).rotating || {}) },
        pomodoro: { ...base.settings.pomodoro, ...((raw.settings || {}).pomodoro || {}) }
      },
      subjects: Array.isArray(raw.subjects) && raw.subjects.length
        ? raw.subjects.map((s, i) => {
            const level = Number(s.strength);
            return {
              id: s.id || uid('s'),
              name: s.name || 'درس',
              color: s.color || SUBJECT_COLORS[i % SUBJECT_COLORS.length],
              strength: Number.isInteger(level) && level >= 1 && level <= 5 ? level : null,
              custom: Boolean(s.custom)
            };
          })
        : base.subjects,
      schedule: { ...base.schedule, ...(raw.schedule || {}) },
      homework: Array.isArray(raw.homework) ? raw.homework : [],
      exams: Array.isArray(raw.exams) ? raw.exams : [],
      manualGrades: Array.isArray(raw.manualGrades) ? raw.manualGrades : [],
      pomodoroSessions: Array.isArray(raw.pomodoroSessions) ? raw.pomodoroSessions : []
    };    DAYS.forEach((d) => {
      if (!Array.isArray(state.schedule[d.key])) state.schedule[d.key] = [];
    });

    state.settings.weekDays = Array.isArray(state.settings.weekDays) && state.settings.weekDays.length
      ? state.settings.weekDays.filter((k) => DAY_BY_KEY[k])
      : base.settings.weekDays;

    if (!state.settings.weekDays.length) state.settings.weekDays = base.settings.weekDays;

    state.profile.grade = clamp(Number(state.profile.grade) || 7, 1, 12);
    state.settings.maxGrade = clamp(Number(state.settings.maxGrade) || 20, 1, 100);

    state.homework = state.homework.map((hw) => {
      const due = { ...(hw.due || { mode: 'auto' }) };
      if (due.date && !isISODate(due.date)) {
        if (due.mode === 'manual') due.mode = 'auto';
        delete due.date;
      }
      return {
        ...hw,
        id: hw.id || uid('hw'),
        due
      };
    });

    state.exams = state.exams.map((exam) => ({
      ...exam,
      id: exam.id || uid('ex'),
      date: isISODate(exam.date) ? exam.date : todayISO()
    }));

    state.manualGrades = state.manualGrades.map((grade) => ({
      ...grade,
      id: grade.id || uid('mg'),
      date: isISODate(grade.date) ? grade.date : todayISO()
    }));

    state.pomodoroSessions = state.pomodoroSessions
      .filter((s) => s && typeof s === 'object')
      .map((s) => ({
        ...s,
        id: s.id || uid('pomo'),
        minutes: Math.max(0, Number(s.minutes) || 0),
        mode: s.mode === 'break' ? 'break' : 'focus',
        kind: STUDY_KINDS.some((k) => k.id === s.kind) ? s.kind : 'free',
        date: studySessionDate(s)
      }));

    return state;
  }

  /* -------------------------- rotating class logic ------------------------- */

  function rotatingAnchor(state) {
    return state.settings.rotating?.anchor || weekStart();
  }

  function resolveSubject(state, period, iso) {
    if (!period) return null;
    if (!period.rotating) return period.subjectId || null;
    const variants = (period.variants || []).filter(Boolean);
    if (!variants.length) return null;
    const anchor = rotatingAnchor(state);
    const startIndex = Number(state.settings.rotating?.indices?.[period.id] || 0);
    const weeks = weeksBetween(anchor, iso);
    const idx = ((startIndex + weeks) % variants.length + variants.length) % variants.length;
    return variants[idx];
  }

  function rotatingCurrentSubject(state, period) {
    return resolveSubject(state, period, todayISO());
  }

  function findPeriod(state, periodId, dayKey) {
    if (!periodId) return null;
    if (dayKey) {
      const periods = state.schedule[dayKey] || [];
      return periods.find((p) => p.id === periodId) || null;
    }
    for (const key of Object.keys(state.schedule)) {
      const found = (state.schedule[key] || []).find((p) => p.id === periodId);
      if (found) return found;
    }
    return null;
  }

  function periodIndex(state, period, dayKey) {
    const periods = state.schedule[dayKey] || [];
    return periods.findIndex((p) => p.id === period.id);
  }

  function autoDue(state, subjectId, from = new Date()) {
    if (!subjectId) return null;
    const startISO = isoOf(from);
    for (let i = 0; i < 35; i += 1) {
      const iso = addDays(startISO, i);
      const dayKey = weekdayKey(iso);
      if (!state.settings.weekDays.includes(dayKey)) continue;
      const periods = state.schedule[dayKey] || [];
      for (const period of periods) {
        if (resolveSubject(state, period, iso) !== subjectId) continue;
        const end = period.end || '23:59';
        const dt = new Date(`${iso}T${end}:00`);
        if (dt.getTime() > from.getTime()) {
          return {
            date: iso,
            dayKey,
            period,
            periodIndex: periods.indexOf(period),
            time: end,
            auto: true
          };
        }
      }
    }
    return null;
  }

  function dueForHomework(state, hw, now = new Date()) {
    if (!hw) return null;
    if (hw.due?.mode === 'manual' && hw.due.date) {
      const dayKey = weekdayKey(hw.due.date);
      const period = hw.due.periodId ? findPeriod(state, hw.due.periodId, dayKey) : null;
      return {
        date: hw.due.date,
        dayKey,
        period,
        periodIndex: period ? periodIndex(state, period, dayKey) : -1,
        time: period?.end || null,
        auto: false
      };
    }
    const found = autoDue(state, hw.subjectId, now);
    if (found) return found;
    const fallback = hw.due?.fallback || addDays(todayISO(), 7);
    return {
      date: fallback,
      dayKey: weekdayKey(fallback),
      period: null,
      periodIndex: -1,
      time: null,
      auto: true,
      missing: true
    };
  }

  function homeworkStatus(state, hw, now = new Date()) {
    if (hw.done) return 'done';
    const due = dueForHomework(state, hw, now);
    if (!due) return 'upcoming';
    const today = isoOf(now);
    if (due.date < today) return 'overdue';
    if (due.date === today) return 'today';
    const diff = daysBetween(today, due.date);
    return diff <= 7 ? 'week' : 'upcoming';
  }

  function dueLabel(state, hw, now = new Date()) {
    const due = dueForHomework(state, hw, now);
    if (!due) return 'بدون مهلت';
    const day = DAY_BY_KEY[due.dayKey]?.label || '';
    const periodText = due.period
      ? `زنگ ${toFa(due.periodIndex + 1)}${due.period.end ? ` • ${formatTime(due.period.end)}` : ''}`
      : '';
    let base;
    if (due.date === todayISO()) base = 'امروز';
    else if (due.date === addDays(todayISO(), 1)) base = 'فردا';
    else base = `${day} ${faDateShort(due.date)}`;
    return [base, periodText].filter(Boolean).join(' • ');
  }

  function dueDateForSort(state, hw, now = new Date()) {
    const due = dueForHomework(state, hw, now);
    if (!due) return '9999-12-31';
    return `${due.date}T${due.time || '23:59'}`;
  }

  /* ------------------------------- subjects -------------------------------- */

  function gradeLabel(grade) {
    const g = Number(grade) || 1;
    if (g <= 6) return `پایه ${toFa(g)}`;
    if (g <= 9) return `پایه ${toFa(g)} (متوسطه اول)`;
    return `پایه ${toFa(g)} (متوسطه دوم)`;
  }

  function usedSubjectIds(state) {
    const ids = new Set();
    Object.values(state.schedule || {}).forEach((periods) => {
      (periods || []).forEach((p) => {
        if (p.subjectId) ids.add(p.subjectId);
        (p.variants || []).forEach((v) => { if (v) ids.add(v); });
      });
    });
    state.homework.forEach((h) => { if (h.subjectId) ids.add(h.subjectId); });
    state.exams.forEach((e) => { if (e.subjectId) ids.add(e.subjectId); });
    state.manualGrades.forEach((g) => { if (g.subjectId) ids.add(g.subjectId); });
    return ids;
  }

  function scoreEntries(state) {
    const entries = [];
    state.exams.forEach((exam) => {
      if (exam.score !== null && exam.score !== undefined && exam.score !== '' && !Number.isNaN(Number(exam.score))) {
        entries.push({
          id: `exam-${exam.id}`,
          subjectId: exam.subjectId,
          title: exam.title,
          score: Number(exam.score),
          date: exam.date,
          source: 'exam'
        });
      }
    });
    state.manualGrades.forEach((g) => {
      if (g.score !== null && g.score !== undefined && g.score !== '' && !Number.isNaN(Number(g.score))) {
        entries.push({
          id: `manual-${g.id}`,
          subjectId: g.subjectId,
          title: g.title,
          score: Number(g.score),
          date: g.date,
          source: 'manual'
        });
      }
    });
    return entries;
  }

  function gradeStats(state) {
    const entries = scoreEntries(state);
    const overall = average(entries.map((e) => e.score));
    const bySubject = state.subjects.map((subject) => {
      const scores = entries.filter((e) => e.subjectId === subject.id).map((e) => e.score);
      return { subject, scores, average: average(scores), count: scores.length };
    }).filter((row) => row.count > 0);
    return { entries, overall, bySubject };
  }

  function upcomingExams(state, limit = 5) {
    const today = todayISO();
    return state.exams
      .filter((e) => e.date >= today && !e.taken && (e.score === null || e.score === undefined || e.score === ''))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, limit);
  }

  function isPendingExam(exam) {
    return Boolean(exam) && !exam.taken
      && (exam.score === null || exam.score === undefined || exam.score === '');
  }

  /* ---------------------------- study / pomodoro --------------------------- */

  function studyKindMeta(kind) {
    return STUDY_KINDS.find((k) => k.id === kind) || STUDY_KINDS[STUDY_KINDS.length - 1];
  }

  function studySessionDate(session) {
    const raw = session?.date || String(session?.completedAt || '').slice(0, 10);
    return isISODate(raw) ? raw : todayISO();
  }

  function studySessions(state) {
    return (state?.pomodoroSessions || [])
      .filter((s) => s && s.mode !== 'break' && Number(s.minutes) > 0)
      .map((s) => ({
        ...s,
        kind: STUDY_KINDS.some((k) => k.id === s.kind) ? s.kind : 'free',
        date: studySessionDate(s)
      }));
  }

  function studyMinutes(state, { from = null, to = null, subjectId = null } = {}) {
    return studySessions(state).reduce((sum, s) => {
      if (subjectId && s.subjectId !== subjectId) return sum;
      if (from && s.date < from) return sum;
      if (to && s.date > to) return sum;
      return sum + (Number(s.minutes) || 0);
    }, 0);
  }

  function studyBySubject(state, { from = null, to = null } = {}) {
    const totals = new Map();
    studySessions(state).forEach((s) => {
      if (!s.subjectId) return;
      if (from && s.date < from) return;
      if (to && s.date > to) return;
      totals.set(s.subjectId, (totals.get(s.subjectId) || 0) + (Number(s.minutes) || 0));
    });
    const used = usedSubjectIds(state);
    return state.subjects
      .filter((subject) => used.has(subject.id) || totals.has(subject.id))
      .map((subject) => ({ subject, minutes: totals.get(subject.id) || 0 }))
      .sort((a, b) => b.minutes - a.minutes || comparePersian(a.subject.name, b.subject.name));
  }

  function subjectsOnDate(state, iso) {
    const dayKey = weekdayKey(iso);
    if (!state.settings.weekDays.includes(dayKey)) return [];
    const rows = [];
    (state.schedule[dayKey] || []).forEach((period, index) => {
      const subjectId = resolveSubject(state, period, iso);
      if (!subjectId) return;
      const slot = { index, start: period.start || '', end: period.end || '' };
      const existing = rows.find((row) => row.subjectId === subjectId);
      if (existing) existing.slots.push(slot);
      else rows.push({ subjectId, slots: [slot] });
    });
    return rows;
  }

  function rankStudyRows(rows) {
    return rows.slice().sort((a, b) => {
      const doneA = a.doneMinutes > 0 ? 1 : 0;
      const doneB = b.doneMinutes > 0 ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      const strengthA = Number(a.subject?.strength) || 3.5;
      const strengthB = Number(b.subject?.strength) || 3.5;
      if (strengthA !== strengthB) return strengthA - strengthB;
      return comparePersian(a.subject?.name, b.subject?.name);
    });
  }

  function studyRecommendations(state, now = new Date()) {
    const today = todayISO();
    const tomorrow = addDays(today, 1);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const doneToday = new Map();
    studySessions(state)
      .filter((s) => s.date === today)
      .forEach((s) => {
        if (!s.subjectId) return;
        doneToday.set(s.subjectId, (doneToday.get(s.subjectId) || 0) + (Number(s.minutes) || 0));
      });

    const withMeta = (rows) => rows
      .map((row) => ({
        ...row,
        subject: subjectById(state, row.subjectId),
        doneMinutes: doneToday.get(row.subjectId) || 0
      }))
      .filter((row) => row.subject);

    const review = rankStudyRows(withMeta(subjectsOnDate(state, today)).map((row) => ({
      ...row,
      endedCount: row.slots.filter((slot) => !slot.end || timeToMinutes(slot.end) <= nowMinutes).length
    })));

    const pre = rankStudyRows(withMeta(subjectsOnDate(state, tomorrow)));

    return { today, tomorrow, review, pre };
  }

  function comparePersian(a, b) {
    return String(a || '').localeCompare(String(b || ''), 'fa');
  }

  function debounce(fn, wait = 280) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  App.util = {
    DAYS,
    DAY_BY_KEY,
    DAY_BY_JS,
    STRENGTHS,
    SUBJECT_COLORS,
    ACCENTS,
    DEFAULT_SUBJECTS,
    uid,
    isoOf,
    todayISO,
    parseISO,
    addDays,
    weekdayKey,
    weekStart,
    weekEnd,
    weeksBetween,
    daysBetween,
    toFa,
    faNumber,
    faDate,
    faDateShort,
    faDateLong,
    faDay,
    relativeDate,
    JALALI_MONTHS,
    isoToJalaali,
    jalaaliToISO,
    isLeapJalaaliYear,
    jalaaliMonthLength,
    jalaliMonthName,
    jalaliToday,
    timeToMinutes,
    minutesToTime,
    formatTime,
    formatDateTime,
    escapeHtml,
    escapeAttr,
    clamp,
    average,
    normalizeText,
    subjectById,
    subjectName,
    strengthMeta,
    subjectColor,
    makePeriod,
    makeDefaultSchedule,
    makeDefaultState,
    normalizeState,
    rotatingAnchor,
    resolveSubject,
    rotatingCurrentSubject,
    findPeriod,
    periodIndex,
    autoDue,
    dueForHomework,
    homeworkStatus,
    dueLabel,
    dueDateForSort,
    gradeLabel,
    usedSubjectIds,
    scoreEntries,
    gradeStats,
    upcomingExams,
    isPendingExam,
    STUDY_KINDS,
    studyKindMeta,
    studySessionDate,
    studySessions,
    studyMinutes,
    studyBySubject,
    subjectsOnDate,
    studyRecommendations,
    comparePersian,
    debounce,
    deepClone
  };
})();
