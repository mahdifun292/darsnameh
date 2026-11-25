/* درس‌نامه — homework list */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  let activeFilter = 'all';

  const STATUS_META = {
    overdue: { title: 'معوق', icon: 'alert', color: 'var(--danger)' },
    today: { title: 'امروز', icon: 'zap', color: 'var(--warn)' },
    week: { title: 'این هفته', icon: 'clock', color: 'var(--info)' },
    upcoming: { title: 'بعداً', icon: 'calendar', color: 'var(--accent)' },
    done: { title: 'انجام‌شده', icon: 'check', color: 'var(--success)' }
  };

  function renderTask(state, hw) {
    const subject = u.subjectById(state, hw.subjectId);
    const status = u.homeworkStatus(state, hw);
    const due = u.dueForHomework(state, hw);
    return `
      <div class="task-item ${hw.done ? 'done' : ''} ${status === 'overdue' ? 'overdue' : ''}" data-hw="${hw.id}">
        <button class="task-check" data-hw-toggle="${hw.id}" aria-label="${hw.done ? 'برگرداندن' : 'انجام شد'}">${icon('check', 13)}</button>
        <div class="task-main">
          <div class="task-title">${u.escapeHtml(hw.title)}</div>
          <div class="task-meta-row">
            ${subject ? `<span class="subject-chip" style="--c:${subject.color}"><i></i>${u.escapeHtml(subject.name)}</span>` : ''}
            <span>${icon('clock', 12)} ${u.escapeHtml(u.dueLabel(state, hw))}</span>
            ${due?.auto ? '<span class="badge badge-muted">مهلت خودکار</span>' : '<span class="badge badge-muted">مهلت دستی</span>'}
            ${status === 'overdue' ? '<span class="badge badge-danger">معوق</span>' : ''}
          </div>
          ${hw.description ? `<div class="task-desc">${u.escapeHtml(hw.description)}</div>` : ''}
        </div>
        <div class="task-actions" style="opacity:1">
          <button class="icon-btn sm" data-hw-edit="${hw.id}" aria-label="ویرایش">${icon('edit', 14)}</button>
          <button class="icon-btn sm danger" data-hw-del="${hw.id}" aria-label="حذف">${icon('trash', 14)}</button>
        </div>
      </div>
    `;
  }

  function render(root) {
    const state = App.store.state;
    const all = state.homework.slice();
    const statusOf = (hw) => u.homeworkStatus(state, hw);
    const counts = {
      all: all.length,
      overdue: all.filter((h) => statusOf(h) === 'overdue').length,
      today: all.filter((h) => statusOf(h) === 'today').length,
      week: all.filter((h) => statusOf(h) === 'week').length,
      upcoming: all.filter((h) => statusOf(h) === 'upcoming').length,
      done: all.filter((h) => statusOf(h) === 'done').length
    };
    const pending = counts.all - counts.done;

    let visible = all.filter((hw) => activeFilter === 'all' || statusOf(hw) === activeFilter);
    visible.sort((a, b) => {
      if (a.done && b.done) return String(b.doneAt || '').localeCompare(String(a.doneAt || ''));
      if (a.done) return 1;
      if (b.done) return -1;
      return u.dueDateForSort(state, a).localeCompare(u.dueDateForSort(state, b));
    });

    const filters = [
      ['all', 'همه'],
      ['overdue', 'معوق'],
      ['today', 'امروز'],
      ['week', 'این هفته'],
      ['upcoming', 'بعداً'],
      ['done', 'انجام‌شده']
    ];

    const groups = ['overdue', 'today', 'week', 'upcoming', 'done'];
    const grouped = groups
      .filter((key) => visible.some((hw) => statusOf(hw) === key))
      .map((key) => ({
        key,
        meta: STATUS_META[key],
        items: visible.filter((hw) => statusOf(hw) === key)
      }));

    root.innerHTML = `
      ${ui.pageHeader(
        'تکالیف',
        'همه کارهای درس و مدرسه، با مهلت خودکار بر اساس برنامه هفتگی.',
        `<button class="btn btn-primary" data-add-hw>${icon('plus', 16)} تکلیف جدید</button>`
      )}

      <div class="home-stats" style="margin-bottom:16px">
        ${ui.statCard({ iconName: 'tasks', label: 'کل تکالیف', value: u.toFa(counts.all), sub: `${u.toFa(pending)} مورد باقی‌مانده`, tone: 'violet' })}
        ${ui.statCard({ iconName: 'alert', label: 'معوق', value: u.toFa(counts.overdue), sub: counts.overdue ? 'نیاز به رسیدگی' : 'چیزی عقب نیفتاده', tone: 'rose' })}
        ${ui.statCard({ iconName: 'zap', label: 'برای امروز', value: u.toFa(counts.today), sub: 'مهلت تا پایان امروز', tone: 'amber' })}
        ${ui.statCard({ iconName: 'check', label: 'انجام‌شده', value: u.toFa(counts.done), sub: counts.all ? `${u.toFa(Math.round((counts.done / counts.all) * 100))}٪ پیشرفت` : 'شروع کن', tone: 'green' })}
      </div>

      <div class="summary-toolbar">
        <div class="filter-chips">
          ${filters.map(([key, label]) => `
            <button class="chip ${activeFilter === key ? 'active' : ''}" data-filter="${key}">
              ${label} <span class="count">${u.toFa(counts[key])}</span>
            </button>
          `).join('')}
        </div>
        <span class="tiny muted">${u.toFa(visible.length)} مورد نمایش داده می‌شود</span>
      </div>

      ${!visible.length
        ? `<div class="card">${ui.emptyState(
            'tasks',
            activeFilter === 'all' ? 'هنوز تکلیفی ثبت نکرده‌ای' : 'در این دسته تکلیفی نیست',
            activeFilter === 'all' ? 'اولین تکلیفت را اضافه کن؛ مهلتش را خودکار بر اساس زنگ‌های درس تنظیم می‌کنیم.' : 'فیلتر دیگری را امتحان کن یا تکلیف جدیدی اضافه کن.',
            '<button class="btn btn-primary btn-sm" data-add-hw>افزودن تکلیف</button>'
          )}</div>`
        : grouped.map((group) => `
          <section class="card" style="margin-bottom:14px">
            <div class="section-head" style="margin-bottom:6px">
              <div>
                <h2><span style="color:${group.meta.color};display:inline-flex">${icon(group.meta.icon, 16)}</span> ${group.meta.title}</h2>
                <p>${u.toFa(group.items.length)} مورد</p>
              </div>
            </div>
            <div class="task-list">${group.items.map((hw) => renderTask(state, hw)).join('')}</div>
          </section>
        `).join('')}
    `;

    root.querySelectorAll('[data-add-hw]').forEach((btn) => {
      btn.addEventListener('click', () => App.forms.openHomework());
    });

    root.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        render(root);
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
        ui.toast(hw.done ? 'به حالت انجام‌نشده برگشت.' : 'آفرین! یک کار دیگر تمام شد.', hw.done ? 'info' : 'success');
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
          message: `«${hw.title}» حذف شود؟`,
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
  App.pages.homework = { render };
})();
