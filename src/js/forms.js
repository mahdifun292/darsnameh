/* درس‌نامه — shared forms (homework, exam, grade, subject, rotation) */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  function bindDatePreview(input, element) {
    if (!input || !element) return;
    const update = () => {
      element.innerHTML = input.value
        ? `${icon('calendar', 13)} ${u.faDateLong(input.value)}`
        : `${icon('calendar', 13)} تاریخ را انتخاب کن`;
    };
    input.addEventListener('change', update);
    input.addEventListener('input', update);
    update();
  }

  /* ---------------------------- Jalali date field --------------------------- */

  function jalaliYearOptions(selected) {
    const current = u.jalaliToday().jy;
    const years = new Set();
    for (let y = current - 2; y <= current + 6; y += 1) years.add(y);
    if (selected) years.add(Number(selected));
    return [...years].sort((a, b) => a - b)
      .map((y) => `<option value="${y}" ${Number(selected) === y ? 'selected' : ''}>${u.toFa(y)}</option>`)
      .join('');
  }

  function jalaliDayOptions(jy, jm, selected) {
    const length = u.jalaaliMonthLength(jy, jm);
    const value = Math.min(Math.max(Number(selected) || 1, 1), length);
    return Array.from({ length }, (_, i) => i + 1)
      .map((d) => `<option value="${d}" ${value === d ? 'selected' : ''}>${u.toFa(d)}</option>`)
      .join('');
  }

  function jalaliDateField({ id, name = 'date', value = u.todayISO() } = {}) {
    const iso = value || u.todayISO();
    const parts = u.isoToJalaali(iso);
    return `
      <div class="jalali-date" data-jalali-date>
        <div class="jalali-date-row">
          <select class="select jalali-day" id="${u.escapeAttr(id)}-day" data-jd aria-label="روز">
            ${jalaliDayOptions(parts.jy, parts.jm, parts.jd)}
          </select>
          <select class="select jalali-month" id="${u.escapeAttr(id)}-month" data-jm aria-label="ماه">
            ${u.JALALI_MONTHS.map((label, i) =>
              `<option value="${i + 1}" ${parts.jm === i + 1 ? 'selected' : ''}>${label}</option>`
            ).join('')}
          </select>
          <select class="select jalali-year" id="${u.escapeAttr(id)}-year" data-jy aria-label="سال">
            ${jalaliYearOptions(parts.jy)}
          </select>
          <button type="button" class="icon-btn sm jalali-today" data-jalali-today title="امروز" aria-label="انتخاب امروز">
            ${icon('calendar', 15)}
          </button>
        </div>
        <input type="hidden" id="${u.escapeAttr(id)}" name="${u.escapeAttr(name)}" value="${u.escapeAttr(iso)}">
      </div>
    `;
  }

  function bindJalaliDates(root) {
    if (!root) return;
    root.querySelectorAll('[data-jalali-date]').forEach((field) => {
      const hidden = field.querySelector('input[type="hidden"]');
      const daySelect = field.querySelector('[data-jd]');
      const monthSelect = field.querySelector('[data-jm]');
      const yearSelect = field.querySelector('[data-jy]');
      const todayButton = field.querySelector('[data-jalali-today]');
      const initial = u.isoToJalaali(hidden.value || u.todayISO());

      function fillYears(selected) {
        yearSelect.innerHTML = jalaliYearOptions(selected);
        yearSelect.value = String(selected);
      }

      function fillDays(jy, jm, selected) {
        daySelect.innerHTML = jalaliDayOptions(jy, jm, selected);
      }

      function sync(emit = true) {
        let jy = Number(yearSelect.value);
        let jm = Number(monthSelect.value);
        let jd = Number(daySelect.value);
        if (!jy || !jm || !jd) return;
        const length = u.jalaaliMonthLength(jy, jm);
        if (jd > length) {
          jd = length;
          fillDays(jy, jm, jd);
        }
        hidden.value = u.jalaaliToISO(jy, jm, jd);
        if (emit) hidden.dispatchEvent(new Event('change', { bubbles: true }));
      }

      fillYears(initial.jy);
      fillDays(initial.jy, initial.jm, initial.jd);
      monthSelect.value = String(initial.jm);
      daySelect.value = String(initial.jd);

      daySelect.addEventListener('change', () => sync());
      monthSelect.addEventListener('change', () => {
        fillDays(Number(yearSelect.value), Number(monthSelect.value), Number(daySelect.value));
        sync();
      });
      yearSelect.addEventListener('change', () => {
        fillDays(Number(yearSelect.value), Number(monthSelect.value), Number(daySelect.value));
        sync();
      });
      todayButton?.addEventListener('click', () => {
        const today = u.jalaliToday();
        fillYears(today.jy);
        fillDays(today.jy, today.jm, today.jd);
        monthSelect.value = String(today.jm);
        daySelect.value = String(today.jd);
        sync();
      });
    });
  }

  function timePartOptions(count, selected) {
    return Array.from({ length: count }, (_, i) => i)
      .map((n) => `<option value="${n}" ${Number(selected) === n ? 'selected' : ''}>${u.toFa(String(n).padStart(2, '0'))}</option>`)
      .join('');
  }

  function timeField(prefix, value, label) {
    const [hour, minute] = String(value || '08:00').split(':').map(Number);
    return `
      <div class="time-picker" data-time-field="${prefix}">
        <select class="select time-picker-part" name="${prefix}Hour" aria-label="${label} — ساعت">
          ${timePartOptions(24, Number.isFinite(hour) ? hour : 8)}
        </select>
        <span class="time-picker-sep">:</span>
        <select class="select time-picker-part" name="${prefix}Minute" aria-label="${label} — دقیقه">
          ${timePartOptions(60, Number.isFinite(minute) ? minute : 0)}
        </select>
      </div>
    `;
  }


  /* ------------------------------- homework -------------------------------- */

  function openHomework({ homework = null, defaults = {}, onSaved = null } = {}) {
    const state = App.store.state;
    const isEdit = Boolean(homework);
    const hw = homework || {
      title: '',
      subjectId: defaults.subjectId || '',
      description: '',
      due: { mode: 'auto' }
    };
    const dueMode = hw.due?.mode || 'auto';

    const body = `
      <form id="hw-form" class="form" autocomplete="off">
        <div class="field">
          <label for="hw-title">موضوع تکلیف <span class="req">*</span></label>
          <input class="input" id="hw-title" name="title" maxlength="120" required
            placeholder="مثلاً حل تمرین‌های صفحه ۲۴" value="${u.escapeAttr(hw.title || '')}" autofocus>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="hw-subject">درس <span class="req">*</span></label>
            <select class="select" id="hw-subject" name="subjectId" required>
              ${ui.subjectOptions(state, hw.subjectId, 'یک درس انتخاب کن')}
            </select>
          </div>
          <div class="field">
            <label>مهلت تحویل</label>
            <div class="segmented" role="group">
              <label class="${dueMode === 'auto' ? 'active' : ''}">
                <input type="radio" name="dueMode" value="auto" ${dueMode === 'auto' ? 'checked' : ''}>
                ${icon('sparkles', 15)} خودکار
              </label>
              <label class="${dueMode === 'manual' ? 'active' : ''}">
                <input type="radio" name="dueMode" value="manual" ${dueMode === 'manual' ? 'checked' : ''}>
                ${icon('calendar', 15)} دستی
              </label>
            </div>
          </div>
        </div>

        <div class="due-block" data-due-auto>
          <div class="auto-due-preview" id="auto-due-preview"></div>
          <p class="hint">${icon('info', 14)} مهلت خودکار همیشه بر اساس برنامه هفتگی به‌روز می‌شود؛ اگر زنگ این درس جابه‌جا شود، مهلت هم جابه‌جا می‌شود.</p>
        </div>

        <div class="due-block" data-due-manual>
          <div class="form-row">
            <div class="field">
              <label for="hw-date-day">تاریخ تحویل</label>
              ${jalaliDateField({
                id: 'hw-date',
                name: 'date',
                value: hw.due?.mode === 'manual' ? hw.due.date : u.addDays(u.todayISO(), 3)
              })}
            </div>
            <div class="field">
              <label for="hw-period">زنگ (اختیاری)</label>
              <select class="select" id="hw-period" name="periodId"></select>
            </div>
          </div>
          <p class="hint date-preview" id="hw-date-preview"></p>
          <p class="hint">${icon('info', 14)} اگر زنگ را انتخاب نکنی، کل آن روز به عنوان مهلت در نظر گرفته می‌شود.</p>
        </div>

        <div class="field">
          <label for="hw-desc">توضیحات</label>
          <textarea class="textarea" id="hw-desc" name="description" rows="3"
            placeholder="جزئیات، منابع یا نکته‌ای درباره این تکلیف...">${u.escapeHtml(hw.description || '')}</textarea>
        </div>
      </form>
    `;

    const modal = ui.openModal({
      title: isEdit ? 'ویرایش تکلیف' : 'افزودن تکلیف جدید',
      subtitle: isEdit ? 'تغییرات بلافاصله روی مهلت‌ها اعمال می‌شود' : 'یک کار کوچک امروز، یک نتیجه بزرگ فردا',
      iconName: 'tasks',
      body,
      size: 'md',
      footer: `
        <button type="button" class="btn btn-ghost" data-cancel>انصراف</button>
        <button type="submit" form="hw-form" class="btn btn-primary">${icon('check', 17)} ${isEdit ? 'ذخیره تغییرات' : 'افزودن تکلیف'}</button>
      `,
      onMount: (root, close) => {
        const form = root.querySelector('#hw-form');
        const subjectSelect = form.querySelector('[name="subjectId"]');
        const autoBlock = form.querySelector('[data-due-auto]');
        const manualBlock = form.querySelector('[data-due-manual]');
        const autoPreview = form.querySelector('#auto-due-preview');
        const dateInput = form.querySelector('#hw-date');
        const periodSelect = form.querySelector('#hw-period');

        const currentMode = () => form.querySelector('[name="dueMode"]:checked')?.value || 'auto';

        function syncMode() {
          const mode = currentMode();
          autoBlock.classList.toggle('hidden', mode !== 'auto');
          manualBlock.classList.toggle('hidden', mode !== 'manual');
          form.querySelectorAll('[name="dueMode"]').forEach((radio) => {
            radio.closest('label').classList.toggle('active', radio.checked);
          });
          if (mode === 'auto') updateAutoPreview();
        }

        function updateAutoPreview() {
          const subjectId = subjectSelect.value;
          if (!subjectId) {
            autoPreview.innerHTML = `<span class="preview-muted">${icon('clock', 18)} اول یک درس انتخاب کن تا نزدیک‌ترین زنگ محاسبه شود.</span>`;
            return;
          }
          const due = u.autoDue(state, subjectId);
          if (!due) {
            autoPreview.innerHTML = `<span class="preview-warn">${icon('alert', 18)} برای این درس هیچ زنگی در برنامه پیدا نشد. مهلت موقتاً یک هفته بعد در نظر گرفته می‌شود.</span>`;
            return;
          }
          autoPreview.innerHTML = `
            <div class="preview-label">${icon('clock', 16)} نزدیک‌ترین زنگ ${u.escapeHtml(u.subjectName(state, subjectId))}</div>
            <div class="preview-value">
              ${u.faDate(due.date, { weekday: 'long' })}
              <span>•</span> زنگ ${u.toFa(due.periodIndex + 1)}
              ${due.period?.end ? `<span>•</span> تا ساعت ${u.formatTime(due.period.end)}` : ''}
            </div>
          `;
        }

        function refreshPeriods() {
          const date = dateInput.value;
          if (!date) {
            periodSelect.innerHTML = '<option value="">فقط این روز</option>';
            return;
          }
          const dayKey = u.weekdayKey(date);
          const periods = state.schedule[dayKey] || [];
          const selected = hw.due?.mode === 'manual' ? hw.due.periodId || '' : '';
          periodSelect.innerHTML = '<option value="">فقط این روز</option>' + periods.map((p, i) => {
            const subjectId = u.resolveSubject(state, p, date);
            const subject = u.subjectById(state, subjectId);
            return `<option value="${u.escapeAttr(p.id)}" ${selected === p.id ? 'selected' : ''}>
              زنگ ${u.toFa(i + 1)}${subject ? ` — ${u.escapeHtml(subject.name)}` : ''}${p.end ? ` (${u.formatTime(p.end)})` : ''}
            </option>`;
          }).join('');
        }

        subjectSelect.addEventListener('change', updateAutoPreview);
        form.querySelectorAll('[name="dueMode"]').forEach((radio) => {
          radio.addEventListener('change', syncMode);
        });
        dateInput.addEventListener('change', refreshPeriods);
        bindJalaliDates(form);
        bindDatePreview(dateInput, form.querySelector('#hw-date-preview'));

        syncMode();
        refreshPeriods();

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const title = u.normalizeText(form.elements.title.value);
          const subjectId = form.elements.subjectId.value;
          if (!title) {
            ui.toast('موضوع تکلیف را بنویس.', 'error');
            form.elements.title.focus();
            return;
          }
          if (!subjectId) {
            ui.toast('برای تکلیف یک درس انتخاب کن.', 'error');
            subjectSelect.focus();
            return;
          }

          const mode = currentMode();
          let due;
          if (mode === 'auto') {
            const found = u.autoDue(state, subjectId);
            due = { mode: 'auto', fallback: found ? undefined : u.addDays(u.todayISO(), 7) };
          } else {
            if (!dateInput.value) {
              ui.toast('تاریخ تحویل را انتخاب کن.', 'error');
              form.querySelector('#hw-date-day')?.focus();
              return;
            }
            due = {
              mode: 'manual',
              date: dateInput.value,
              periodId: periodSelect.value || null
            };
          }

          const nowIso = new Date().toISOString();
          App.store.update((draft) => {
            if (isEdit) {
              const target = draft.homework.find((h) => h.id === homework.id);
              if (target) {
                Object.assign(target, {
                  title,
                  subjectId,
                  description: form.elements.description.value.trim(),
                  due,
                  updatedAt: nowIso
                });
              }
            } else {
              draft.homework.push({
                id: u.uid('hw'),
                title,
                subjectId,
                description: form.elements.description.value.trim(),
                due,
                done: false,
                doneAt: null,
                createdAt: nowIso,
                updatedAt: nowIso
              });
            }
          });

          close();
          ui.toast(isEdit ? 'تکلیف ویرایش شد.' : 'تکلیف اضافه شد.', 'success');
          if (onSaved) onSaved();
        });

        root.querySelector('[data-cancel]').addEventListener('click', () => close());
      }
    });

    return modal;
  }

  /* --------------------------------- exam ---------------------------------- */

  function openExam({ exam = null, defaults = {}, onSaved = null } = {}) {
    const state = App.store.state;
    const isEdit = Boolean(exam);
    const defaultDate = defaults.date || nextDateForDay(defaults.dayKey || u.weekdayKey(u.todayISO()));
    const examData = exam || {
      title: '',
      subjectId: defaults.subjectId || '',
      date: defaultDate,
      periodId: defaults.periodId || null,
      description: ''
    };

    const body = `
      <form id="exam-form" class="form" autocomplete="off">
        <div class="field">
          <label for="exam-title">عنوان امتحان <span class="req">*</span></label>
          <input class="input" id="exam-title" name="title" maxlength="120" required
            placeholder="مثلاً امتحان میان‌ترم ریاضی" value="${u.escapeAttr(examData.title || '')}" autofocus>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="exam-subject">درس <span class="req">*</span></label>
            <select class="select" id="exam-subject" name="subjectId" required>
              ${ui.subjectOptions(state, examData.subjectId, 'یک درس انتخاب کن')}
            </select>
          </div>
          <div class="field">
            <label for="exam-date-day">تاریخ امتحان <span class="req">*</span></label>
            ${jalaliDateField({ id: 'exam-date', name: 'date', value: examData.date || defaultDate })}
          </div>
        </div>
        <div class="field">
          <label for="exam-period">زنگ امتحان (اختیاری)</label>
          <select class="select" id="exam-period" name="periodId"></select>
        </div>
        <p class="hint date-preview" id="exam-date-preview"></p>
        <div class="field">
          <label for="exam-desc">توضیحات و مباحث</label>
          <textarea class="textarea" id="exam-desc" name="description" rows="3"
            placeholder="مباحث، فصل‌ها یا نکاتی که باید مرور شوند...">${u.escapeHtml(examData.description || '')}</textarea>
        </div>
        <p class="hint">${icon('info', 14)} تاریخ امتحان می‌تواند هر روزی باشد؛ حتی چند هفته بعد از زنگ انتخاب‌شده.</p>
      </form>
    `;

    const modal = ui.openModal({
      title: isEdit ? 'ویرایش امتحان' : 'ثبت امتحان جدید',
      subtitle: defaults.dayKey ? `بر اساس ${u.DAY_BY_KEY[defaults.dayKey]?.label || 'برنامه'} — تاریخ را می‌توانی تغییر بدهی` : '',
      iconName: 'exam',
      body,
      footer: `
        <button type="button" class="btn btn-ghost" data-cancel>انصراف</button>
        <button type="submit" form="exam-form" class="btn btn-primary">${icon('check', 17)} ${isEdit ? 'ذخیره تغییرات' : 'ثبت امتحان'}</button>
      `,
      onMount: (root, close) => {
        const form = root.querySelector('#exam-form');
        const dateInput = form.querySelector('[name="date"]');
        const periodSelect = form.querySelector('[name="periodId"]');

        function refreshPeriods() {
          const date = dateInput.value;
          if (!date) return;
          const dayKey = u.weekdayKey(date);
          const periods = state.schedule[dayKey] || [];
          const selected = exam ? exam.periodId || '' : (defaults.periodId || '');
          periodSelect.innerHTML = '<option value="">بدون زنگ مشخص</option>' + periods.map((p, i) => {
            const subjectId = u.resolveSubject(state, p, date);
            const subject = u.subjectById(state, subjectId);
            return `<option value="${u.escapeAttr(p.id)}" ${selected === p.id ? 'selected' : ''}>
              زنگ ${u.toFa(i + 1)}${subject ? ` — ${u.escapeHtml(subject.name)}` : ''}${p.end ? ` (${u.formatTime(p.end)})` : ''}
            </option>`;
          }).join('');
        }

        dateInput.addEventListener('change', refreshPeriods);
        bindJalaliDates(form);
        bindDatePreview(dateInput, form.querySelector('#exam-date-preview'));
        refreshPeriods();

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const title = u.normalizeText(form.elements.title.value);
          const subjectId = form.elements.subjectId.value;
          if (!title) {
            ui.toast('عنوان امتحان را بنویس.', 'error');
            form.elements.title.focus();
            return;
          }
          if (!subjectId) {
            ui.toast('برای امتحان یک درس انتخاب کن.', 'error');
            form.elements.subjectId.focus();
            return;
          }
          if (!form.elements.date.value) {
            ui.toast('تاریخ امتحان را انتخاب کن.', 'error');
            form.querySelector('#exam-date-day')?.focus();
            return;
          }

          App.store.update((draft) => {
            if (isEdit) {
              const target = draft.exams.find((e) => e.id === exam.id);
              if (target) {
                Object.assign(target, {
                  title,
                  subjectId,
                  date: form.elements.date.value,
                  periodId: form.elements.periodId.value || null,
                  description: form.elements.description.value.trim(),
                  updatedAt: new Date().toISOString()
                });
              }
            } else {
              draft.exams.push({
                id: u.uid('exam'),
                title,
                subjectId,
                date: form.elements.date.value,
                periodId: form.elements.periodId.value || null,
                description: form.elements.description.value.trim(),
                taken: false,
                score: null,
                createdAt: new Date().toISOString()
              });
            }
          });

          close();
          ui.toast(isEdit ? 'امتحان ویرایش شد.' : 'امتحان ثبت شد.', 'success');
          if (onSaved) onSaved();
        });

        root.querySelector('[data-cancel]').addEventListener('click', () => close());
      }
    });

    return modal;
  }

  function nextDateForDay(dayKey) {
    const target = u.DAY_BY_KEY[dayKey];
    if (!target) return u.todayISO();
    const now = new Date();
    let diff = (target.jsDay - now.getDay() + 7) % 7;
    if (diff === 0) {
      // If today's classes are probably over, suggest next week.
      diff = now.getHours() >= 15 ? 7 : 0;
    }
    return u.addDays(u.todayISO(), diff);
  }

  /* ------------------------------ manual grade ----------------------------- */

  function openManualGrade({ grade = null, defaults = {}, onSaved = null } = {}) {
    const state = App.store.state;
    const max = state.settings.maxGrade;
    const isEdit = Boolean(grade);
    const g = grade || {
      subjectId: defaults.subjectId || '',
      title: '',
      score: '',
      date: u.todayISO()
    };

    const body = `
      <form id="grade-form" class="form" autocomplete="off">
        <div class="form-row">
          <div class="field">
            <label for="grade-subject">درس <span class="req">*</span></label>
            <select class="select" id="grade-subject" name="subjectId" required>
              ${ui.subjectOptions(state, g.subjectId, 'یک درس انتخاب کن')}
            </select>
          </div>
          <div class="field">
            <label for="grade-title">عنوان نمره <span class="req">*</span></label>
            <input class="input" id="grade-title" name="title" maxlength="100" required
              placeholder="مثلاً پرسش کلاسی" value="${u.escapeAttr(g.title || '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="grade-score">نمره (از ${u.toFa(max)}) <span class="req">*</span></label>
            <input class="input" id="grade-score" name="score" type="number" min="0" max="${max}" step="0.25" required
              placeholder="۱۸٫۵" value="${g.score ?? ''}">
          </div>
          <div class="field">
            <label for="grade-date-day">تاریخ</label>
            ${jalaliDateField({ id: 'grade-date', name: 'date', value: g.date || u.todayISO() })}
          </div>
        </div>
        <p class="hint date-preview" id="grade-date-preview"></p>
        <p class="hint">${icon('info', 14)} این نمره در میانگین همان درس و معدل کلی حساب می‌شود.</p>
      </form>
    `;

    const modal = ui.openModal({
      title: isEdit ? 'ویرایش نمره دستی' : 'افزودن نمره دستی',
      subtitle: `نمره‌ها از ${u.toFa(max)} محاسبه می‌شوند`,
      iconName: 'award',
      body,
      footer: `
        <button type="button" class="btn btn-ghost" data-cancel>انصراف</button>
        <button type="submit" form="grade-form" class="btn btn-primary">${icon('check', 17)} ${isEdit ? 'ذخیره' : 'ثبت نمره'}</button>
      `,
      onMount: (root, close) => {
        const form = root.querySelector('#grade-form');
        bindJalaliDates(form);
        bindDatePreview(form.elements.date, form.querySelector('#grade-date-preview'));
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const subjectId = form.elements.subjectId.value;
          const title = u.normalizeText(form.elements.title.value);
          const score = Number(form.elements.score.value);
          if (!subjectId || !title) {
            ui.toast('درس و عنوان نمره را کامل کن.', 'error');
            return;
          }
          if (Number.isNaN(score) || score < 0 || score > max) {
            ui.toast(`نمره باید بین ۰ و ${u.toFa(max)} باشد.`, 'error');
            form.elements.score.focus();
            return;
          }

          App.store.update((draft) => {
            if (isEdit) {
              const target = draft.manualGrades.find((x) => x.id === grade.id);
              if (target) {
                Object.assign(target, {
                  subjectId,
                  title,
                  score,
                  date: form.elements.date.value || u.todayISO()
                });
              }
            } else {
              draft.manualGrades.push({
                id: u.uid('grade'),
                subjectId,
                title,
                score,
                date: form.elements.date.value || u.todayISO(),
                createdAt: new Date().toISOString()
              });
            }
          });

          close();
          ui.toast(isEdit ? 'نمره ویرایش شد.' : 'نمره ثبت شد.', 'success');
          if (onSaved) onSaved();
        });

        root.querySelector('[data-cancel]').addEventListener('click', () => close());
      }
    });

    return modal;
  }

  /* --------------------------------- period -------------------------------- */

  function openPeriod({ dayKey, period = null, index = null, onSaved = null } = {}) {
    const state = App.store.state;
    const day = dayKey || u.weekdayKey(u.todayISO());
    const periods = state.schedule[day] || [];
    const isEdit = Boolean(period);
    const position = index === null ? periods.length : index;
    const p = period || u.makePeriod(state, day, position, periods[periods.length - 1] || null);
    const initialVariants = (p.variants || []).filter(Boolean);
    const initialCurrent = p.rotating ? u.resolveSubject(state, p, u.todayISO()) : null;
    const initialSubject = p.subjectId || '';

    const body = `
      <form id="period-form" class="form" autocomplete="off">
        <div class="period-day-note">
          ${icon('calendar', 15)}
          <span>${u.DAY_BY_KEY[day].label} • زنگ ${u.toFa(position + 1)}</span>
          <span class="period-day-hint">${isEdit ? 'تغییرات بلافاصله ذخیره می‌شود' : 'زنگ جدید'}</span>
        </div>

        <div class="form-row">
          <div class="field">
            <label>ساعت شروع</label>
            ${timeField('start', p.start || '07:30', 'شروع')}
          </div>
          <div class="field">
            <label>ساعت پایان</label>
            ${timeField('end', p.end || '08:15', 'پایان')}
          </div>
        </div>
        <p class="hint period-duration" data-duration></p>

        <div class="field" data-subject-field>
          <label for="period-subject">درس این زنگ</label>
          <select class="select" id="period-subject" name="subjectId">
            ${ui.subjectOptions(state, initialSubject, 'بدون درس')}
          </select>
        </div>

        <div class="period-rotating-toggle">
          <label class="toggle-chip">
            <input type="checkbox" name="rotating" ${p.rotating ? 'checked' : ''}>
            <span>${icon('refresh', 14)} زنگ چرخشی</span>
          </label>
          <span class="tiny muted">هر هفته بین دو درس جابه‌جا می‌شود</span>
        </div>

        <div class="period-rotating-box ${p.rotating ? '' : 'hidden'}" data-rotating-box>
          <div class="form-row">
            <div class="field">
              <label for="period-variant-0">گزینه اول</label>
              <select class="select" id="period-variant-0" name="variant0">
                ${ui.subjectOptions(state, initialVariants[0] || '', 'انتخاب درس')}
              </select>
            </div>
            <div class="field">
              <label for="period-variant-1">گزینه دوم</label>
              <select class="select" id="period-variant-1" name="variant1">
                ${ui.subjectOptions(state, initialVariants[1] || '', 'انتخاب درس')}
              </select>
            </div>
          </div>
          <div class="field">
            <label for="period-current">این هفته کدام درس؟</label>
            <select class="select" id="period-current" name="current"></select>
          </div>
          <p class="hint">${icon('info', 13)} هفته‌های بعد خودکار جابه‌جا می‌شود؛ هر زمان از «تنظیم هفته چرخشی» هم می‌توانی عوضش کنی.</p>
        </div>
      </form>
    `;

    const modal = ui.openModal({
      title: isEdit ? 'ویرایش زنگ' : 'افزودن زنگ',
      subtitle: `${u.DAY_BY_KEY[day].label} — ساعت و درس را راحت عوض کن`,
      iconName: 'clock',
      body,
      footer: `
        ${isEdit ? `<button type="button" class="btn btn-ghost" data-delete style="color:var(--danger)">${icon('trash', 15)} حذف زنگ</button>` : ''}
        <button type="button" class="btn btn-ghost" data-cancel>انصراف</button>
        <button type="submit" form="period-form" class="btn btn-primary">${icon('check', 17)} ${isEdit ? 'ذخیره تغییرات' : 'افزودن زنگ'}</button>
      `,
      onMount: (root, close) => {
        const form = root.querySelector('#period-form');
        const rotatingInput = form.elements.rotating;
        const rotatingBox = form.querySelector('[data-rotating-box]');
        const subjectField = form.querySelector('[data-subject-field]');
        const variant0 = form.elements.variant0;
        const variant1 = form.elements.variant1;
        const currentSelect = form.elements.current;
        const duration = form.querySelector('[data-duration]');

        function readTime(prefix) {
          const hour = Number(form.elements[`${prefix}Hour`].value);
          const minute = Number(form.elements[`${prefix}Minute`].value);
          return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }

        function updateDuration() {
          const diff = u.timeToMinutes(readTime('end')) - u.timeToMinutes(readTime('start'));
          duration.innerHTML = diff > 0
            ? `${icon('clock', 13)} مدت این زنگ: ${u.toFa(diff)} دقیقه`
            : `${icon('alert', 13)} ساعت پایان باید بعد از شروع باشد.`;
          duration.classList.toggle('is-error', diff <= 0);
        }

        function variantOptions() {
          const values = [variant0.value, variant1.value].filter(Boolean);
          const previous = currentSelect.value || initialCurrent || values[0] || '';
          currentSelect.innerHTML = values.length
            ? values.map((sid) => {
                const subject = u.subjectById(state, sid);
                return `<option value="${u.escapeAttr(sid)}">${u.escapeHtml(subject?.name || '')}</option>`;
              }).join('')
            : '<option value="">اول دو گزینه را انتخاب کن</option>';
          if (values.includes(previous)) currentSelect.value = previous;
        }

        function syncRotating() {
          const on = rotatingInput.checked;
          rotatingBox.classList.toggle('hidden', !on);
          subjectField.classList.toggle('hidden', on);
          if (on) {
            if (!variant0.value && form.elements.subjectId.value) variant0.value = form.elements.subjectId.value;
            variantOptions();
          }
        }

        rotatingInput.addEventListener('change', syncRotating);
        variant0.addEventListener('change', variantOptions);
        variant1.addEventListener('change', variantOptions);
        form.querySelectorAll('.time-picker select').forEach((select) => select.addEventListener('change', updateDuration));

        syncRotating();
        updateDuration();

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const start = readTime('start');
          const end = readTime('end');
          if (u.timeToMinutes(start) >= u.timeToMinutes(end)) {
            ui.toast('ساعت پایان باید بعد از شروع باشد.', 'error');
            return;
          }

          const rotating = rotatingInput.checked;
          const variants = [variant0.value, variant1.value];
          if (rotating) {
            if (!variants[0] || !variants[1]) {
              ui.toast('برای زنگ چرخشی هر دو گزینه را انتخاب کن.', 'error');
              (variants[0] ? variant1 : variant0).focus();
              return;
            }
            if (variants[0] === variants[1]) {
              ui.toast('دو گزینه زنگ چرخشی باید متفاوت باشند.', 'error');
              variant1.focus();
              return;
            }
          }

          App.store.update((draft) => {
            const list = draft.schedule[day] || (draft.schedule[day] = []);
            let target;
            if (isEdit) {
              target = list.find((item) => item.id === period.id);
            } else {
              target = { ...p, id: p.id || u.uid('p') };
              list.push(target);
            }
            if (!target) return;

            target.start = start;
            target.end = end;
            target.rotating = rotating;
            if (rotating) {
              target.variants = variants;
              target.subjectId = null;
              const selected = currentSelect.value || variants[0];
              const idx = variants.indexOf(selected);
              draft.settings.rotating.anchor = draft.settings.rotating.anchor || u.weekStart();
              draft.settings.rotating.indices = draft.settings.rotating.indices || {};
              const weeks = u.weeksBetween(draft.settings.rotating.anchor, u.todayISO());
              if (idx >= 0) {
                draft.settings.rotating.indices[target.id] = ((idx - weeks) % variants.length + variants.length) % variants.length;
              }
            } else {
              target.subjectId = form.elements.subjectId.value || null;
              target.variants = target.variants || ['', ''];
              if (draft.settings.rotating.indices) delete draft.settings.rotating.indices[target.id];
            }
          });

          close();
          ui.toast(isEdit ? 'زنگ ویرایش شد.' : 'زنگ اضافه شد.', 'success');
          if (onSaved) onSaved();
        });

        root.querySelector('[data-cancel]').addEventListener('click', () => close());

        root.querySelector('[data-delete]')?.addEventListener('click', async () => {
          const ok = await ui.confirm({
            title: 'حذف زنگ',
            message: `زنگ ${u.toFa(position + 1)} از ${u.DAY_BY_KEY[day].label} حذف شود؟`,
            danger: true,
            confirmText: 'حذف کن'
          });
          if (!ok) return;
          App.store.update((draft) => {
            draft.schedule[day] = (draft.schedule[day] || []).filter((item) => item.id !== period.id);
            if (draft.settings.rotating.indices) delete draft.settings.rotating.indices[period.id];
          });
          close();
          ui.toast('زنگ حذف شد.', 'info');
          if (onSaved) onSaved();
        });
      }
    });

    return modal;
  }

  /* -------------------------------- subject -------------------------------- */

  function openSubject({ subject = null, onSaved = null } = {}) {
    const state = App.store.state;
    const isEdit = Boolean(subject);
    const s = subject || {
      name: '',
      color: u.SUBJECT_COLORS[state.subjects.length % u.SUBJECT_COLORS.length]
    };

    const body = `
      <form id="subject-form" class="form" autocomplete="off">
        <div class="field">
          <label for="subject-name">نام درس <span class="req">*</span></label>
          <input class="input" id="subject-name" name="name" maxlength="50" required
            placeholder="مثلاً جغرافیا" value="${u.escapeAttr(s.name || '')}" autofocus>
        </div>
        <div class="field">
          <label>رنگ درس</label>
          <div class="color-picker">
            ${u.SUBJECT_COLORS.map((color) => `
              <label class="color-swatch" style="--c:${color}">
                <input type="radio" name="color" value="${color}" ${s.color === color ? 'checked' : ''}>
                <span></span>
              </label>
            `).join('')}
          </div>
        </div>
        ${isEdit ? `<p class="hint">${icon('info', 14)} تغییر نام یا رنگ، همه‌جا (برنامه، تکالیف و نمرات) اعمال می‌شود.</p>` : ''}
      </form>
    `;

    const modal = ui.openModal({
      title: isEdit ? 'ویرایش درس' : 'افزودن درس دلخواه',
      subtitle: 'هر درسی که در برنامه‌ات هست را می‌توانی اضافه کنی',
      iconName: 'book',
      body,
      footer: `
        <button type="button" class="btn btn-ghost" data-cancel>انصراف</button>
        <button type="submit" form="subject-form" class="btn btn-primary">${icon('check', 17)} ${isEdit ? 'ذخیره' : 'افزودن درس'}</button>
      `,
      onMount: (root, close) => {
        const form = root.querySelector('#subject-form');
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const name = u.normalizeText(form.elements.name.value);
          if (!name) {
            ui.toast('نام درس را بنویس.', 'error');
            return;
          }
          const duplicate = state.subjects.some((x) =>
            x.id !== subject?.id && u.normalizeText(x.name) === name
          );
          if (duplicate) {
            ui.toast('درسی با همین نام قبلاً وجود دارد.', 'error');
            return;
          }
          const color = form.querySelector('[name="color"]:checked')?.value || s.color;
          App.store.update((draft) => {
            if (isEdit) {
              const target = draft.subjects.find((x) => x.id === subject.id);
              if (target) Object.assign(target, { name, color });
            } else {
              draft.subjects.push({
                id: u.uid('s'),
                name,
                color,
                strength: null,
                custom: true
              });
            }
          });
          close();
          ui.toast(isEdit ? 'درس ویرایش شد.' : 'درس اضافه شد.', 'success');
          if (onSaved) onSaved();
        });
        root.querySelector('[data-cancel]').addEventListener('click', () => close());
      }
    });

    return modal;
  }

  /* ------------------------------- rotation -------------------------------- */

  function openRotationSetup({ onSaved = null } = {}) {
    const state = App.store.state;
    const slots = [];
    state.settings.weekDays.forEach((dayKey) => {
      (state.schedule[dayKey] || []).forEach((period, index) => {
        if (period.rotating && (period.variants || []).filter(Boolean).length >= 2) {
          slots.push({ dayKey, period, index });
        }
      });
    });

    if (!slots.length) {
      ui.toast('هنوز هیچ زنگ چرخشی تعریف نکرده‌ای. در برنامه هفتگی، گزینه «چرخشی» را روشن کن.', 'info', 4200);
      return;
    }

    const body = `
      <div class="rotation-setup">
        <p class="rotation-intro">${icon('refresh', 17)} برای هر زنگ چرخشی مشخص کن <b>این هفته</b> کدام درس برگزار می‌شود. هفته‌های بعد به صورت خودکار بین گزینه‌ها جابه‌جا می‌شود.</p>
        ${slots.map(({ dayKey, period, index }) => {
          const current = u.rotatingCurrentSubject(state, period);
          return `
            <div class="rotation-row">
              <div class="rotation-row-title">
                <span class="day-pill">${u.DAY_BY_KEY[dayKey].label}</span>
                <span>زنگ ${u.toFa(index + 1)}</span>
              </div>
              <div class="rotation-options">
                ${(period.variants || []).filter(Boolean).map((sid) => {
                  const subject = u.subjectById(state, sid);
                  if (!subject) return '';
                  return `
                    <label class="rotation-option ${current === sid ? 'selected' : ''}" style="--c:${subject.color}">
                      <input type="radio" name="rot-${period.id}" value="${u.escapeAttr(sid)}" ${current === sid ? 'checked' : ''}>
                      <span class="dot"></span>${u.escapeHtml(subject.name)}
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    const modal = ui.openModal({
      title: 'تنظیم هفته چرخشی',
      subtitle: `هفته جاری: ${u.faDate(u.weekStart(), { month: 'long' })} تا ${u.faDate(u.weekEnd(), { month: 'long' })}`,
      iconName: 'refresh',
      body,
      size: 'lg',
      footer: `
        <button type="button" class="btn btn-ghost" data-cancel>انصراف</button>
        <button type="button" class="btn btn-primary" data-save>${icon('check', 17)} ذخیره این هفته</button>
      `,
      onMount: (root, close) => {
        root.querySelectorAll('.rotation-option input').forEach((input) => {
          input.addEventListener('change', () => {
            const parent = input.closest('.rotation-options');
            parent.querySelectorAll('.rotation-option').forEach((el) => el.classList.remove('selected'));
            input.closest('.rotation-option').classList.add('selected');
          });
        });

        root.querySelector('[data-save]').addEventListener('click', () => {
          const anchor = u.weekStart();
          App.store.update((draft) => {
            draft.settings.rotating.anchor = anchor;
            draft.settings.rotating.indices = draft.settings.rotating.indices || {};
            slots.forEach(({ period }) => {
              const selected = root.querySelector(`input[name="rot-${period.id}"]:checked`);
              if (!selected) return;
              const variants = (period.variants || []).filter(Boolean);
              const idx = variants.indexOf(selected.value);
              if (idx >= 0) draft.settings.rotating.indices[period.id] = idx;
            });
          });
          close();
          ui.toast('هفته چرخشی تنظیم شد.', 'success');
          if (onSaved) onSaved();
        });

        root.querySelector('[data-cancel]').addEventListener('click', () => close());
      }
    });

    return modal;
  }

  App.forms = {
    openHomework,
    openExam,
    openManualGrade,
    openPeriod,
    openSubject,
    openRotationSetup,
    nextDateForDay,
    bindJalaliDates,
    jalaliDateField
  };
})();
