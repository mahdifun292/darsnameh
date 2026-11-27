/* درس‌نامه — AI academic advisor: context, request and safe action execution */
(function () {
  const App = window.App;
  const u = App.util;

  const MAX_ACTIONS = 8;
  const MAX_PLAN_ITEMS = 40;

  const ACTION_ALIASES = {
    addhomework: 'add_homework',
    create_homework: 'add_homework',
    homework_add: 'add_homework',
    updatehomework: 'update_homework',
    edit_homework: 'update_homework',
    homework_update: 'update_homework',
    deletehomework: 'delete_homework',
    remove_homework: 'delete_homework',
    homework_delete: 'delete_homework',
    addexam: 'add_exam',
    create_exam: 'add_exam',
    updateexam: 'update_exam',
    edit_exam: 'update_exam',
    deleteexam: 'delete_exam',
    remove_exam: 'delete_exam',
    addgrade: 'add_grade',
    create_grade: 'add_grade',
    updategrade: 'update_grade',
    edit_grade: 'update_grade',
    deletegrade: 'delete_grade',
    remove_grade: 'delete_grade',
    setexamscore: 'set_exam_score',
    exam_score: 'set_exam_score',
    setstrength: 'set_strength',
    strength: 'set_strength',
    addsubject: 'add_subject',
    create_subject: 'add_subject',
    updatesubject: 'update_subject',
    edit_subject: 'update_subject',
    deletesubject: 'delete_subject',
    remove_subject: 'delete_subject',
    setprofile: 'set_profile',
    update_profile: 'set_profile',
    createstudyplan: 'create_study_plan',
    create_plan: 'create_study_plan',
    study_plan: 'create_study_plan'
  };

  const STRENGTH_LABELS = {
    'خیلی ضعیف': 1,
    'ضعیف': 2,
    'متوسط': 3,
    'خوب': 4,
    'قوی': 5,
    weak: 2,
    average: 3,
    good: 4,
    strong: 5
  };

  function aiConfig(state = App.store.state) {
    return state?.settings?.ai || {};
  }

  function isConfigured(state = App.store.state) {
    const ai = aiConfig(state);
    return Boolean(
      String(ai.baseUrl || '').trim()
      && String(ai.apiKey || '').trim()
      && String(ai.model || '').trim()
    );
  }

  function isReady(state = App.store.state) {
    return Boolean(aiConfig(state).enabled) && isConfigured(state);
  }

  function toEnDigits(value) {
    return String(value ?? '')
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  }

  function cleanNumber(value) {
    const raw = toEnDigits(value).replace(/[٫،]/g, '.').trim();
    if (!raw) return null;
    const cleaned = raw.replace(/[^\d.-]/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function resolveDate(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    const today = u.todayISO();
    let s = toEnDigits(value).trim();
    if (!s) return fallback;

    const compact = s.replace(/[\u200c\s،,]+/g, ' ').trim();
    const relative = {
      'امروز': today,
      'فردا': u.addDays(today, 1),
      'پس فردا': u.addDays(today, 2),
      'پس‌فردا': u.addDays(today, 2),
      'دیروز': u.addDays(today, -1)
    };
    const relKey = Object.keys(relative).find((key) => key.replace(/\u200c/g, '') === compact.replace(/\u200c/g, ''));
    if (relKey) return relative[relKey];

    const dateTime = compact.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
    if (dateTime) {
      const iso = `${dateTime[1]}-${pad2(dateTime[2])}-${pad2(dateTime[3])}`;
      if (u.isISODate(iso)) return iso;
    }

    const slash = compact.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
    if (slash) {
      const year = Number(slash[1]);
      const month = Number(slash[2]);
      const day = Number(slash[3]);
      if (year >= 1200 && year <= 1600) {
        try {
          const iso = u.jalaaliToISO(year, month, day);
          if (u.isISODate(iso)) return iso;
        } catch { /* ignore invalid Jalali date */ }
      }
      const iso = `${year}-${pad2(month)}-${pad2(day)}`;
      if (u.isISODate(iso)) return iso;
    }

    const monthIndex = u.JALALI_MONTHS.findIndex((month) => compact.includes(month));
    if (monthIndex >= 0) {
      const numbers = compact.match(/\d{1,4}/g) || [];
      const year = Number(numbers.find((n) => n.length === 4)) || u.jalaliToday().jy;
      const day = Number(numbers.find((n) => n.length <= 2));
      if (day) {
        try {
          const iso = u.jalaaliToISO(year, monthIndex + 1, day);
          if (u.isISODate(iso)) return iso;
        } catch { /* ignore */ }
      }
    }

    const dayText = compact.replace(/[\u200c\s]+/g, '');
    let dayMeta = null;
    let dayMatchLength = 0;
    u.DAYS.forEach((day) => {
      const label = day.label.replace(/[\u200c\s]+/g, '');
      if (label.length > dayMatchLength && dayText.includes(label)) {
        dayMeta = day;
        dayMatchLength = label.length;
      }
    });
    if (dayMeta) {
      const now = new Date();
      let diff = (dayMeta.jsDay - now.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      return u.addDays(today, diff);
    }

    return fallback;
  }

  function resolveSubject(draft, ref) {
    if (!ref) return null;
    let raw = ref;
    if (typeof raw === 'object') raw = raw.id || raw.subjectId || raw.name || raw.subject;
    const value = String(raw || '').trim();
    if (!value) return null;

    const byId = draft.subjects.find((subject) => subject.id === value);
    if (byId) return byId;

    const norm = u.normalizeText(value);
    if (!norm) return null;
    const exact = draft.subjects.filter((subject) => u.normalizeText(subject.name) === norm);
    if (exact.length) return exact[0];

    const partial = draft.subjects.filter((subject) => {
      const name = u.normalizeText(subject.name);
      return name.includes(norm) || norm.includes(name);
    });
    return partial.length === 1 ? partial[0] : (partial[0] || null);
  }

  function findUnique(list, ref, titleKey = 'title') {
    if (!list?.length || !ref) return null;
    let id = '';
    let title = '';
    if (typeof ref === 'object') {
      id = ref.id || '';
      title = ref[titleKey] || ref.title || ref.name || '';
    } else {
      id = String(ref);
      title = String(ref);
    }
    if (id) {
      const byId = list.find((item) => item.id === id);
      if (byId) return byId;
    }
    const norm = u.normalizeText(title);
    if (!norm) return null;
    const exact = list.filter((item) => u.normalizeText(item[titleKey]) === norm);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) return null;
    const partial = list.filter((item) => {
      const name = u.normalizeText(item[titleKey]);
      return name.includes(norm) || norm.includes(name);
    });
    return partial.length === 1 ? partial[0] : null;
  }

  function parseScore(value, max) {
    const n = cleanNumber(value);
    if (n === null || n < 0 || n > max) return null;
    return Math.round(n * 100) / 100;
  }

  function parseBool(value) {
    if (typeof value === 'boolean') return value;
    const text = String(value ?? '').trim().toLowerCase();
    if (['true', '1', 'yes', 'بله', 'انجام شد'].includes(text)) return true;
    if (['false', '0', 'no', 'خیر', 'نشده'].includes(text)) return false;
    return null;
  }

  function parseLevel(value) {
    if (value === null || value === undefined || value === '') return null;
    const direct = Number(toEnDigits(value));
    if (Number.isInteger(direct) && direct >= 1 && direct <= 5) return direct;
    const label = String(value).trim();
    return STRENGTH_LABELS[label] || null;
  }

  function canonicalType(type) {
    const key = String(type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return ACTION_ALIASES[key] || key;
  }

  function addHomework(draft, action, out) {
    const subject = resolveSubject(draft, action.subjectId || action.subject || action.subjectName);
    if (!subject) {
      out.warnings.push('درس تکلیف پیدا نشد؛ تکلیف اضافه نشد.');
      return;
    }
    const title = u.normalizeText(action.title || action.name || '');
    if (!title) {
      out.warnings.push('عنوان تکلیف خالی بود.');
      return;
    }
    const dueDate = resolveDate(action.dueDate || action.date || action.due?.date, null);
    const nowIso = new Date().toISOString();
    draft.homework.push({
      id: u.uid('hw'),
      title: title.slice(0, 120),
      subjectId: subject.id,
      description: String(action.description || action.note || '').trim().slice(0, 2000),
      due: dueDate
        ? { mode: 'manual', date: dueDate, periodId: null }
        : { mode: 'auto', fallback: u.addDays(u.todayISO(), 7) },
      done: Boolean(parseBool(action.done)),
      doneAt: parseBool(action.done) ? nowIso : null,
      createdAt: nowIso,
      updatedAt: nowIso
    });
    out.changes.push(`تکلیف «${title}» برای ${subject.name} اضافه شد${dueDate ? ` (مهلت ${u.faDateShort(dueDate)})` : ''}.`);
  }

  function updateHomework(draft, action, out) {
    const target = findUnique(draft.homework, action.id || action.title || action.name);
    if (!target) {
      out.warnings.push('تکلیفی برای ویرایش پیدا نشد.');
      return;
    }
    const parts = [];
    const title = u.normalizeText(action.title || action.name || '');
    if (title) {
      target.title = title.slice(0, 120);
      parts.push('عنوان');
    }
    const subjectRef = action.subjectId || action.subject || action.subjectName;
    if (subjectRef) {
      const subject = resolveSubject(draft, subjectRef);
      if (subject) {
        target.subjectId = subject.id;
        parts.push('درس');
      }
    }
    if (action.description !== undefined || action.note !== undefined) {
      target.description = String(action.description ?? action.note ?? '').trim().slice(0, 2000);
      parts.push('توضیحات');
    }
    const dueDate = resolveDate(action.dueDate || action.date || action.due?.date, null);
    if (dueDate) {
      target.due = { mode: 'manual', date: dueDate, periodId: action.periodId || null };
      parts.push('مهلت');
    } else if (String(action.dueMode || '').toLowerCase() === 'auto') {
      target.due = { mode: 'auto', fallback: u.addDays(u.todayISO(), 7) };
      parts.push('مهلت خودکار');
    }
    const done = parseBool(action.done);
    if (done !== null) {
      target.done = done;
      target.doneAt = done ? new Date().toISOString() : null;
      parts.push(done ? 'انجام‌شده' : 'انجام‌نشده');
    }
    target.updatedAt = new Date().toISOString();
    if (parts.length) out.changes.push(`تکلیف «${target.title}» ویرایش شد (${parts.join('، ')}).`);
    else out.warnings.push('هیچ تغییری برای تکلیف مشخص نشده بود.');
  }

  function deleteHomework(draft, action, out) {
    const target = findUnique(draft.homework, action.id || action.title || action.name);
    if (!target) {
      out.warnings.push('تکلیفی برای حذف پیدا نشد.');
      return;
    }
    draft.homework = draft.homework.filter((item) => item.id !== target.id);
    out.changes.push(`تکلیف «${target.title}» حذف شد.`);
  }

  function addExam(draft, action, out) {
    const subject = resolveSubject(draft, action.subjectId || action.subject || action.subjectName);
    if (!subject) {
      out.warnings.push('درس امتحان پیدا نشد؛ امتحان اضافه نشد.');
      return;
    }
    const title = u.normalizeText(action.title || action.name || '') || `امتحان ${subject.name}`;
    const date = resolveDate(action.date || action.dueDate, u.addDays(u.todayISO(), 7));
    const nowIso = new Date().toISOString();
    draft.exams.push({
      id: u.uid('exam'),
      title: title.slice(0, 120),
      subjectId: subject.id,
      date,
      periodId: action.periodId || null,
      description: String(action.description || action.note || '').trim().slice(0, 2000),
      taken: false,
      score: null,
      createdAt: nowIso
    });
    out.changes.push(`امتحان «${title}» برای ${subject.name} در ${u.faDateShort(date)} ثبت شد.`);
  }

  function updateExam(draft, action, out) {
    const target = findUnique(draft.exams, action.id || action.title || action.name);
    if (!target) {
      out.warnings.push('امتحانی برای ویرایش پیدا نشد.');
      return;
    }
    const parts = [];
    const title = u.normalizeText(action.title || action.name || '');
    if (title) {
      target.title = title.slice(0, 120);
      parts.push('عنوان');
    }
    const subjectRef = action.subjectId || action.subject || action.subjectName;
    if (subjectRef) {
      const subject = resolveSubject(draft, subjectRef);
      if (subject) {
        target.subjectId = subject.id;
        parts.push('درس');
      }
    }
    const date = resolveDate(action.date || action.dueDate, null);
    if (date) {
      target.date = date;
      parts.push('تاریخ');
    }
    if (action.description !== undefined || action.note !== undefined) {
      target.description = String(action.description ?? action.note ?? '').trim().slice(0, 2000);
      parts.push('توضیحات');
    }
    if (action.score !== undefined) {
      const score = parseScore(action.score, draft.settings.maxGrade);
      if (score === null) {
        out.warnings.push(`نمره امتحان باید بین ۰ و ${u.toFa(draft.settings.maxGrade)} باشد.`);
      } else {
        target.score = score;
        target.taken = true;
        parts.push('نمره');
      }
    }
    const taken = parseBool(action.taken);
    if (taken !== null) {
      target.taken = taken;
      parts.push(taken ? 'شرکت‌کرده' : 'شرکت‌نکرده');
    }
    target.updatedAt = new Date().toISOString();
    if (parts.length) out.changes.push(`امتحان «${target.title}» ویرایش شد (${parts.join('، ')}).`);
    else out.warnings.push('هیچ تغییری برای امتحان مشخص نشده بود.');
  }

  function deleteExam(draft, action, out) {
    const target = findUnique(draft.exams, action.id || action.title || action.name);
    if (!target) {
      out.warnings.push('امتحانی برای حذف پیدا نشد.');
      return;
    }
    draft.exams = draft.exams.filter((item) => item.id !== target.id);
    out.changes.push(`امتحان «${target.title}» حذف شد.`);
  }

  function setExamScore(draft, action, out) {
    const target = findUnique(draft.exams, action.id || action.title || action.name);
    if (!target) {
      out.warnings.push('امتحانی برای ثبت نمره پیدا نشد.');
      return;
    }
    const score = parseScore(action.score, draft.settings.maxGrade);
    if (score === null) {
      out.warnings.push(`نمره باید بین ۰ و ${u.toFa(draft.settings.maxGrade)} باشد.`);
      return;
    }
    target.score = score;
    target.taken = true;
    out.changes.push(`نمره ${u.faNumber(score)} برای «${target.title}» ثبت شد.`);
  }

  function addGrade(draft, action, out) {
    const subject = resolveSubject(draft, action.subjectId || action.subject || action.subjectName);
    if (!subject) {
      out.warnings.push('درس نمره پیدا نشد؛ نمره ثبت نشد.');
      return;
    }
    const score = parseScore(action.score, draft.settings.maxGrade);
    if (score === null) {
      out.warnings.push(`نمره باید بین ۰ و ${u.toFa(draft.settings.maxGrade)} باشد.`);
      return;
    }
    const title = u.normalizeText(action.title || action.name || '') || 'نمره ثبت‌شده';
    const date = resolveDate(action.date, u.todayISO());
    draft.manualGrades.push({
      id: u.uid('grade'),
      subjectId: subject.id,
      title: title.slice(0, 100),
      score,
      date,
      createdAt: new Date().toISOString()
    });
    out.changes.push(`نمره ${u.faNumber(score)} برای ${subject.name} ثبت شد.`);
  }

  function updateGrade(draft, action, out) {
    const target = findUnique(draft.manualGrades, action.id || action.title || action.name);
    if (!target) {
      out.warnings.push('نمره‌ای برای ویرایش پیدا نشد.');
      return;
    }
    const parts = [];
    const subjectRef = action.subjectId || action.subject || action.subjectName;
    if (subjectRef) {
      const subject = resolveSubject(draft, subjectRef);
      if (subject) {
        target.subjectId = subject.id;
        parts.push('درس');
      }
    }
    const title = u.normalizeText(action.title || action.name || '');
    if (title) {
      target.title = title.slice(0, 100);
      parts.push('عنوان');
    }
    if (action.score !== undefined) {
      const score = parseScore(action.score, draft.settings.maxGrade);
      if (score === null) {
        out.warnings.push(`نمره باید بین ۰ و ${u.toFa(draft.settings.maxGrade)} باشد.`);
      } else {
        target.score = score;
        parts.push('نمره');
      }
    }
    const date = resolveDate(action.date, null);
    if (date) {
      target.date = date;
      parts.push('تاریخ');
    }
    if (parts.length) out.changes.push(`نمره «${target.title}» ویرایش شد.`);
    else out.warnings.push('هیچ تغییری برای نمره مشخص نشده بود.');
  }

  function deleteGrade(draft, action, out) {
    const target = findUnique(draft.manualGrades, action.id || action.title || action.name);
    if (!target) {
      out.warnings.push('نمره‌ای برای حذف پیدا نشد.');
      return;
    }
    draft.manualGrades = draft.manualGrades.filter((item) => item.id !== target.id);
    out.changes.push(`نمره «${target.title}» حذف شد.`);
  }

  function setStrength(draft, action, out) {
    const subject = resolveSubject(draft, action.subjectId || action.subject || action.subjectName);
    if (!subject) {
      out.warnings.push('درس برای تنظیم سطح پیدا نشد.');
      return;
    }
    const level = parseLevel(action.level ?? action.strength ?? action.value);
    if (!level) {
      out.warnings.push('سطح باید عددی بین ۱ تا ۵ باشد.');
      return;
    }
    subject.strength = level;
    out.changes.push(`سطح ${subject.name} روی «${u.strengthMeta(level)?.label || level}» تنظیم شد.`);
  }

  function addSubject(draft, action, out) {
    const name = u.normalizeText(action.name || action.title || action.subject || '');
    if (!name) {
      out.warnings.push('نام درس خالی بود.');
      return;
    }
    if (draft.subjects.some((subject) => u.normalizeText(subject.name) === name)) {
      out.warnings.push(`درس «${name}» از قبل وجود دارد.`);
      return;
    }
    const color = u.SUBJECT_COLORS[draft.subjects.length % u.SUBJECT_COLORS.length];
    draft.subjects.push({
      id: u.uid('s'),
      name: name.slice(0, 50),
      color,
      strength: null,
      custom: true
    });
    out.changes.push(`درس «${name}» اضافه شد.`);
  }

  function updateSubject(draft, action, out) {
    const target = findUnique(draft.subjects, action.id || action.oldName || action.name || action.subject, 'name');
    if (!target) {
      out.warnings.push('درسی برای ویرایش پیدا نشد.');
      return;
    }
    const name = u.normalizeText(action.newName || action.title || '');
    if (name) {
      if (draft.subjects.some((subject) => subject.id !== target.id && u.normalizeText(subject.name) === name)) {
        out.warnings.push(`درس «${name}» از قبل وجود دارد.`);
      } else {
        target.name = name.slice(0, 50);
      }
    }
    const color = String(action.color || '').trim();
    if (color && u.SUBJECT_COLORS.includes(color)) target.color = color;
    out.changes.push(`درس «${target.name}» ویرایش شد.`);
  }

  function deleteSubject(draft, action, out) {
    const target = findUnique(draft.subjects, action.id || action.name || action.subject, 'name');
    if (!target) {
      out.warnings.push('درسی برای حذف پیدا نشد.');
      return;
    }
    draft.subjects = draft.subjects.filter((subject) => subject.id !== target.id);
    Object.keys(draft.schedule).forEach((dayKey) => {
      (draft.schedule[dayKey] || []).forEach((period) => {
        let touched = false;
        if (period.subjectId === target.id) { period.subjectId = null; touched = true; }
        if (Array.isArray(period.variants)) {
          period.variants = period.variants.map((variant) => {
            if (variant === target.id) { touched = true; return ''; }
            return variant;
          });
        }
        if (touched && draft.settings.rotating?.indices) delete draft.settings.rotating.indices[period.id];
      });
    });
    draft.homework.forEach((hw) => { if (hw.subjectId === target.id) hw.subjectId = null; });
    draft.exams.forEach((exam) => { if (exam.subjectId === target.id) exam.subjectId = null; });
    draft.manualGrades.forEach((grade) => { if (grade.subjectId === target.id) grade.subjectId = null; });
    draft.aiChat.plans.forEach((plan) => {
      plan.items = (plan.items || []).filter((item) => item.subjectId !== target.id);
    });
    out.changes.push(`درس «${target.name}» حذف شد و ارجاع‌های آن خالی شد.`);
  }

  function setProfile(draft, action, out) {
    const parts = [];
    if (action.name !== undefined) {
      const name = u.normalizeText(action.name);
      if (name) {
        draft.profile.name = name.slice(0, 40);
        parts.push('نام');
      }
    }
    if (action.school !== undefined) {
      draft.profile.school = u.normalizeText(action.school).slice(0, 60);
      parts.push('مدرسه');
    }
    if (action.grade !== undefined) {
      const grade = Number(toEnDigits(action.grade));
      if (Number.isFinite(grade) && grade >= 1 && grade <= 12) {
        draft.profile.grade = Math.round(grade);
        parts.push('پایه');
      } else {
        out.warnings.push('پایه تحصیلی باید عددی بین ۱ تا ۱۲ باشد.');
      }
    }
    if (parts.length) out.changes.push(`پروفایل به‌روزرسانی شد (${parts.join('، ')}).`);
    else out.warnings.push('هیچ فیلدی برای پروفایل مشخص نشده بود.');
  }

  function addPlan(draft, plan, out) {
    if (!plan || typeof plan !== 'object') return null;
    const rawItems = Array.isArray(plan.items) ? plan.items.slice(0, MAX_PLAN_ITEMS) : [];
    const today = u.todayISO();
    const items = [];
    rawItems.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const subject = resolveSubject(draft, item.subjectId || item.subject || item.subjectName);
      if (!subject) return;
      const date = resolveDate(item.date, u.addDays(today, Math.min(index, 7))) || today;
      const minutes = u.clamp(Math.round(cleanNumber(item.minutes) || 30), 5, 240);
      items.push({
        subjectId: subject.id,
        date,
        minutes,
        focus: String(item.focus || item.topic || '').trim().slice(0, 300)
      });
    });
    if (!items.length) {
      out.warnings.push('برنامه مطالعه بدون جلسهٔ معتبر ساخته نشد.');
      return null;
    }
    const title = u.normalizeText(plan.title || plan.name || '') || 'برنامهٔ مطالعه';
    const id = u.uid('plan');
    draft.aiChat.plans.push({
      id,
      title: title.slice(0, 160),
      summary: String(plan.summary || plan.description || '').trim().slice(0, 1200),
      createdAt: new Date().toISOString(),
      items
    });
    if (draft.aiChat.plans.length > 20) draft.aiChat.plans = draft.aiChat.plans.slice(-20);
    out.changes.push(`برنامه مطالعه «${title}» با ${u.toFa(items.length)} جلسه ساخته شد.`);
    return id;
  }

  function applyActions(draft, actions, planInput = null) {
    const out = { changes: [], warnings: [], planId: null };
    if (!draft) return out;
    draft.aiChat = draft.aiChat && typeof draft.aiChat === 'object'
      ? draft.aiChat
      : { messages: [], plans: [] };
    if (!Array.isArray(draft.aiChat.plans)) draft.aiChat.plans = [];
    if (!Array.isArray(draft.aiChat.messages)) draft.aiChat.messages = [];

    const list = Array.isArray(actions) ? actions.slice(0, MAX_ACTIONS) : [];
    let plan = planInput && typeof planInput === 'object' ? planInput : null;
    const planAction = list.find((action) => action && canonicalType(action.type) === 'create_study_plan');
    if (!plan && planAction) {
      plan = planAction.plan && typeof planAction.plan === 'object' ? planAction.plan : planAction;
    }

    list.forEach((action) => {
      if (!action || typeof action !== 'object') return;
      const type = canonicalType(action.type);
      if (!type || type === 'create_study_plan') return;
      try {
        switch (type) {
          case 'add_homework': addHomework(draft, action, out); break;
          case 'update_homework': updateHomework(draft, action, out); break;
          case 'delete_homework': deleteHomework(draft, action, out); break;
          case 'add_exam': addExam(draft, action, out); break;
          case 'update_exam': updateExam(draft, action, out); break;
          case 'delete_exam': deleteExam(draft, action, out); break;
          case 'set_exam_score': setExamScore(draft, action, out); break;
          case 'add_grade': addGrade(draft, action, out); break;
          case 'update_grade': updateGrade(draft, action, out); break;
          case 'delete_grade': deleteGrade(draft, action, out); break;
          case 'set_strength': setStrength(draft, action, out); break;
          case 'add_subject': addSubject(draft, action, out); break;
          case 'update_subject': updateSubject(draft, action, out); break;
          case 'delete_subject': deleteSubject(draft, action, out); break;
          case 'set_profile': setProfile(draft, action, out); break;
          default:
            out.warnings.push(`نوع تغییر «${action.type}» پشتیبانی نمی‌شود.`);
        }
      } catch (error) {
        console.warn('AI action failed', type, error);
        out.warnings.push(`اعمال تغییر «${type}» ناموفق بود.`);
      }
    });

    out.planId = addPlan(draft, plan, out);
    return out;
  }

  function parsePayload(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const tryParse = (value) => {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch {
        return null;
      }
    };
    let parsed = tryParse(cleaned);
    if (!parsed) {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) parsed = tryParse(cleaned.slice(start, end + 1));
    }
    if (!parsed) return null;

    const reply = typeof parsed.reply === 'string'
      ? parsed.reply
      : (typeof parsed.message === 'string' ? parsed.message : '');
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const plan = parsed.plan && typeof parsed.plan === 'object' ? parsed.plan : null;
    if (!reply.trim() && !actions.length && !plan) return null;
    return { reply: reply.trim(), actions, plan };
  }

  function buildContext(state = App.store.state) {
    const today = u.todayISO();
    const jalali = u.jalaliToday();
    const stats = u.gradeStats(state);
    const max = state.settings.maxGrade;
    const pendingHomework = state.homework.filter((hw) => !hw.done);
    const subjectMeta = (subject) => ({
      id: subject.id,
      name: subject.name,
      strength: subject.strength || null,
      strengthLabel: u.strengthMeta(subject.strength)?.label || null
    });

    const byAverage = stats.bySubject.slice().sort((a, b) => b.average - a.average);
    const rated = state.subjects.filter((subject) => subject.strength);
    const weekFrom = u.addDays(today, -6);

    const plans = state.aiChat.plans.slice(-3).map((plan) => ({
      id: plan.id,
      title: plan.title,
      summary: plan.summary,
      items: plan.items.slice(0, 12).map((item) => ({
        subject: u.subjectName(state, item.subjectId),
        date: item.date,
        minutes: item.minutes,
        focus: item.focus
      }))
    }));

    return {
      today: {
        iso: today,
        jalali: `${jalali.jy}-${pad2(jalali.jm)}-${pad2(jalali.jd)}`,
        weekday: u.DAY_BY_KEY[u.weekdayKey(today)]?.label || '',
        label: u.faDateLong(today)
      },
      student: {
        name: state.profile.name || '',
        school: state.profile.school || '',
        grade: state.profile.grade,
        gradeLabel: u.gradeLabel(state.profile.grade)
      },
      maxGrade: max,
      weekDays: state.settings.weekDays.map((key) => u.DAY_BY_KEY[key]?.label).filter(Boolean),
      subjects: state.subjects.map(subjectMeta),
      schedule: state.settings.weekDays.map((dayKey) => ({
        day: u.DAY_BY_KEY[dayKey]?.label,
        periods: (state.schedule[dayKey] || [])
          .map((period, index) => {
            const subjectId = u.resolveSubject(state, period, today);
            return {
              index: index + 1,
              time: [period.start, period.end].filter(Boolean).join('-'),
              subject: subjectId ? u.subjectName(state, subjectId) : null,
              rotating: Boolean(period.rotating)
            };
          })
          .filter((period) => period.subject)
      })),
      homework: state.homework
        .slice()
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          return String(u.dueForHomework(state, a)?.date || '').localeCompare(String(u.dueForHomework(state, b)?.date || ''));
        })
        .slice(0, 40)
        .map((hw) => {
          const due = u.dueForHomework(state, hw);
          return {
            id: hw.id,
            title: hw.title,
            subject: u.subjectName(state, hw.subjectId),
            dueDate: due?.date || null,
            dueLabel: u.dueLabel(state, hw),
            status: u.homeworkStatus(state, hw),
            done: Boolean(hw.done),
            description: String(hw.description || '').slice(0, 300)
          };
        }),
      exams: state.exams
        .slice()
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .slice(0, 40)
        .map((exam) => ({
          id: exam.id,
          title: exam.title,
          subject: u.subjectName(state, exam.subjectId),
          date: exam.date,
          daysLeft: u.daysBetween(today, exam.date),
          taken: Boolean(exam.taken),
          score: exam.score ?? null,
          description: String(exam.description || '').slice(0, 300)
        })),
      grades: {
        overall: stats.overall,
        max,
        bySubject: stats.bySubject.map((row) => ({
          subject: row.subject.name,
          subjectId: row.subject.id,
          average: row.average,
          count: row.count
        })),
        recent: stats.entries
          .slice()
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
          .slice(0, 25)
          .map((entry) => ({
            subject: u.subjectName(state, entry.subjectId),
            title: entry.title,
            score: entry.score,
            date: entry.date,
            source: entry.source
          }))
      },
      strengths: rated.filter((subject) => subject.strength >= 4).map((subject) => subject.name),
      weaknesses: rated.filter((subject) => subject.strength <= 2).map((subject) => subject.name),
      bestByAverage: byAverage.slice(0, 3).map((row) => ({ subject: row.subject.name, average: row.average })),
      needsAttention: byAverage.slice().reverse().slice(0, 3).map((row) => ({ subject: row.subject.name, average: row.average })),
      study: {
        todayMinutes: u.studyMinutes(state, { from: today, to: today }),
        weekMinutes: u.studyMinutes(state, { from: weekFrom, to: today }),
        bySubject: u.studyBySubject(state, { from: weekFrom, to: today })
          .filter((row) => row.minutes > 0)
          .slice(0, 12)
          .map((row) => ({ subject: row.subject.name, minutes: row.minutes }))
      },
      pendingHomeworkCount: pendingHomework.length,
      plans
    };
  }

  function buildSystemPrompt(state = App.store.state) {
    const context = buildContext(state);
    const custom = String(state.settings.ai.instructions || '').trim();
    return `تو «مشاور درسی» اپلیکیشن درس‌نامه هستی؛ یک مشاور تحصیلی فارسی‌زبان، دلسوز، دقیق و واقع‌گرا برای دانش‌آموز ایرانی.

قواعد گفتگو:
- فقط فارسی پاسخ بده و لحن گرم، محترمانه و بدون تعارف اضافه داشته باش.
- پاسخ‌ها کوتاه و کاربردی باشند؛ اگر تحلیل می‌دهی، حداکثر ۵ نکتهٔ مهم بگو.
- اگر کاربر درخواست تغییر در برنامه، تکلیف، امتحان، نمره، درس یا پروفایل دارد، از فیلد actions استفاده کن. تغییر را فقط در actions بگذار و در reply دوباره کل داده‌ها را تکرار نکن.
- هیچ اطلاعاتی از خودت نساز. نمره، تکلیف یا امتحان جعلی اضافه نکن مگر کاربر صریحاً خواسته باشد.
- اگر درخواست مبهم است یا درس/تاریخ/نمره مشخص نیست، اول یک سؤال کوتاه بپرس و actions را خالی بگذار.
- برای پیشنهاد برنامهٔ مطالعه از فیلد plan استفاده کن؛ برای تغییرات دیگر از actions.
- حداکثر ۵ action در هر پاسخ بده.
- همهٔ تاریخ‌ها باید میلادی و به شکل YYYY-MM-DD باشند. از context تاریخ امروز را مبنا بگیر.
- برای درس‌ها تا حد امکان subjectId دقیق از context را بده؛ اگر مطمئن نیستی، نام دقیق درس را بده.
- خروجی باید فقط یک JSON معتبر باشد؛ هیچ متن قبل یا بعد از JSON، هیچ بلوک markdown و هیچ کامنتي ننویس.
- اگر کاربر فقط سلام یا سؤال عمومی کرد، actions و plan را null بگذار.

ساختار خروجی:
{
  "reply": "پاسخ فارسی و کوتاه",
  "actions": [],
  "plan": null
}

نوع actionهای مجاز:
- add_homework: { "type":"add_homework", "title":"...", "subjectId":"s-...", "dueDate":"YYYY-MM-DD", "description":"..." }
- update_homework: { "type":"update_homework", "id":"hw-...", "title":"...", "subjectId":"...", "dueDate":"...", "description":"...", "done":true|false }
- delete_homework: { "type":"delete_homework", "id":"hw-..." }
- add_exam: { "type":"add_exam", "title":"...", "subjectId":"s-...", "date":"YYYY-MM-DD", "description":"..." }
- update_exam: { "type":"update_exam", "id":"exam-...", "title":"...", "subjectId":"...", "date":"...", "description":"...", "score":18, "taken":true }
- delete_exam: { "type":"delete_exam", "id":"exam-..." }
- set_exam_score: { "type":"set_exam_score", "id":"exam-...", "score":18 }
- add_grade: { "type":"add_grade", "subjectId":"s-...", "title":"...", "score":18.5, "date":"YYYY-MM-DD" }
- update_grade: { "type":"update_grade", "id":"mg-...", "subjectId":"...", "title":"...", "score":18, "date":"..." }
- delete_grade: { "type":"delete_grade", "id":"mg-..." }
- set_strength: { "type":"set_strength", "subjectId":"s-...", "level":1..5 }
- add_subject: { "type":"add_subject", "name":"..." }
- update_subject: { "type":"update_subject", "id":"s-...", "newName":"..." }
- delete_subject: { "type":"delete_subject", "id":"s-..." }
- set_profile: { "type":"set_profile", "name":"...", "school":"...", "grade":7 }
- create_study_plan: { "type":"create_study_plan", "title":"...", "summary":"...", "items":[ { "subjectId":"s-...", "date":"YYYY-MM-DD", "minutes":45, "focus":"..." } ] }

فیلد plan (برای برنامهٔ مطالعه) دقیقاً به این شکل است:
{ "title":"...", "summary":"...", "items":[ { "subjectId":"s-...", "date":"YYYY-MM-DD", "minutes":45, "focus":"..." } ] }
اگر plan می‌دهی، action create_study_plan لازم نیست.

راهنمای مشاوره:
- برای امتحان، بر اساس روزهای باقی‌مانده، سطح درس، نمره‌های قبلی و تکالیف، برنامهٔ واقع‌بینانه بچین؛ هر جلسه بین ۲۵ تا ۹۰ دقیقه.
- نقاط قوت و ضعف را از سطح دروس، میانگین نمرات و میزان مطالعهٔ هفته استخراج کن.
- اگر داده کافی نیست، صادقانه بگو و از کاربر بخواه کامل کند.
${custom ? `\nدستورهای شخصی کاربر (اولویت دارند):\n${custom}\n` : ''}
اطلاعات فعلی کاربر (JSON):
${JSON.stringify(context)}`;
  }

  function friendlyAiError(result) {
    if (!result) return 'ارتباط با مشاور برقرار نشد. دوباره تلاش کن.';
    return result.error || 'ارتباط با مشاور برقرار نشد. دوباره تلاش کن.';
  }

  async function run(text, history = []) {
    const state = App.store.state;
    if (!isReady(state)) {
      return { ok: false, error: 'اول مشاور هوشمند را فعال و تنظیم کن.' };
    }
    if (!window.api?.aiChat) {
      return { ok: false, error: 'ارتباط با سرویس هوش مصنوعی در این نسخه در دسترس نیست.' };
    }

    const ai = aiConfig(state);
    const messages = [
      { role: 'system', content: buildSystemPrompt(state) },
      ...history
        .filter((message) => message && (message.role === 'user' || message.role === 'assistant') && message.content)
        .slice(-12)
        .map((message) => ({ role: message.role, content: String(message.content).slice(0, 8000) })),
      { role: 'user', content: String(text).slice(0, 8000) }
    ];

    let result;
    try {
      result = await window.api.aiChat({
        baseUrl: ai.baseUrl,
        apiKey: ai.apiKey,
        model: ai.model,
        messages,
        temperature: 0.35,
        maxTokens: 1800
      });
    } catch (error) {
      console.warn('AI request failed', error);
      return { ok: false, error: 'ارتباط با مشاور برقرار نشد. دوباره تلاش کن.' };
    }

    if (!result?.ok) {
      return {
        ok: false,
        error: friendlyAiError(result),
        detail: result?.detail || ''
      };
    }

    const payload = parsePayload(result.content);
    if (!payload) {
      const reply = String(result.content || '').trim();
      if (!reply) return { ok: false, error: 'پاسخ مشاور خالی بود. دوباره تلاش کن.' };
      return {
        ok: true,
        reply,
        actions: [],
        plan: null,
        warnings: ['پاسخ مدل ساختار JSON نداشت؛ فقط متن پاسخ نمایش داده شد.']
      };
    }

    return {
      ok: true,
      reply: payload.reply || 'این تغییرات را برایت اعمال کردم.',
      actions: payload.actions,
      plan: payload.plan,
      warnings: []
    };
  }

  async function test(config) {
    if (!window.api?.aiTest) {
      return { ok: false, error: 'آزمایش اتصال در این نسخه در دسترس نیست.' };
    }
    try {
      return await window.api.aiTest({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model
      });
    } catch (error) {
      console.warn('AI test failed', error);
      return { ok: false, error: 'آزمایش اتصال ناموفق بود.' };
    }
  }

  App.ai = {
    isConfigured,
    isReady,
    buildContext,
    buildSystemPrompt,
    parsePayload,
    applyActions,
    resolveDate,
    resolveSubject,
    run,
    test
  };
})();
