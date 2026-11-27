/* درس‌نامه — AI advisor page */
(function () {
  const App = window.App;
  const u = App.util;
  const ui = App.ui;
  const { icon } = App.icons;

  const page = {
    busy: false,
    draft: '',
    focus: false,
    userId: null
  };

  const QUICK_PROMPTS = [
    'برای امتحان بعدی‌ام یک برنامهٔ مطالعه بچین.',
    'وضعیت درسی‌ام را تحلیل کن؛ کجا ضعف دارم؟',
    'برای فردا یک تکلیف ریاضی اضافه کن.',
    'نمره‌هایم را بررسی کن و پیشنهاد بده.'
  ];

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function maskBase(url) {
    try {
      const parsed = new URL(url);
      return `${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    } catch {
      return String(url || '');
    }
  }

  function timeLabel(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    return u.toFa(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
  }

  function pushMessage(draft, message) {
    draft.aiChat.messages.push(message);
    if (draft.aiChat.messages.length > 120) {
      draft.aiChat.messages = draft.aiChat.messages.slice(-120);
    }
  }

  function contextStats(state) {
    const stats = u.gradeStats(state);
    const byAverage = stats.bySubject.slice().sort((a, b) => b.average - a.average);
    return {
      overall: stats.overall,
      max: state.settings.maxGrade,
      pending: state.homework.filter((hw) => !hw.done).length,
      upcoming: u.upcomingExams(state, 99).length,
      best: byAverage[0] || null,
      worst: byAverage.length ? byAverage[byAverage.length - 1] : null
    };
  }

  function contextRow(label, value, tone = '') {
    return `
      <div class="ai-context-row ${tone ? `tone-${tone}` : ''}">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `;
  }

  function planItemsHtml(state, plan, limit = 5) {
    const items = (plan.items || []).slice(0, limit);
    if (!items.length) return '';
    return `<div class="ai-plan-items">${items.map((item) => {
      const subject = u.subjectById(state, item.subjectId);
      return `
        <div class="ai-plan-item">
          <span class="ai-plan-dot" style="--c:${subject?.color || 'var(--accent)'}"></span>
          <div class="ai-plan-item-main">
            <strong>${u.escapeHtml(subject?.name || 'درس')}</strong>
            <span>${u.faDateShort(item.date)} • ${u.toFa(item.minutes)} دقیقه${item.focus ? ` • ${u.escapeHtml(item.focus)}` : ''}</span>
          </div>
          <button class="icon-btn sm" data-ai-plan-start data-subject="${u.escapeAttr(item.subjectId)}" data-date="${u.escapeAttr(item.date)}" data-minutes="${u.escapeAttr(item.minutes)}" title="شروع مطالعه" aria-label="شروع مطالعه">
            ${icon('play', 12)}
          </button>
        </div>
      `;
    }).join('')}${(plan.items || []).length > limit ? `<span class="tiny muted">و ${u.toFa(plan.items.length - limit)} جلسهٔ دیگر</span>` : ''}</div>`;
  }

  function planBox(state, plan) {
    const first = plan.items?.[0];
    return `
      <div class="ai-plan-box">
        <div class="ai-plan-box-head">
          <span class="ai-plan-box-icon">${icon('calendar', 15)}</span>
          <strong>${u.escapeHtml(plan.title)}</strong>
          <span class="badge badge-muted">${u.toFa(plan.items.length)} جلسه</span>
        </div>
        ${plan.summary ? `<p>${u.escapeHtml(plan.summary)}</p>` : ''}
        ${planItemsHtml(state, plan, 5)}
        ${first ? `<button class="btn btn-soft btn-sm" data-ai-plan-start data-subject="${u.escapeAttr(first.subjectId)}" data-date="${u.escapeAttr(first.date)}" data-minutes="${u.escapeAttr(first.minutes)}">
          ${icon('play', 12)} شروع اولین جلسه
        </button>` : ''}
      </div>
    `;
  }

  function messageHtml(state, message) {
    const isUser = message.role === 'user';
    const plan = message.planId ? state.aiChat.plans.find((item) => item.id === message.planId) : null;
    const changes = Array.isArray(message.changes) ? message.changes : [];
    const warnings = Array.isArray(message.warnings) ? message.warnings : [];
    const initial = (state.profile.name || 'د').trim().charAt(0) || 'د';
    return `
      <div class="ai-msg ${isUser ? 'user' : 'assistant'} ${message.error ? 'error' : ''}">
        <span class="ai-msg-avatar">${isUser ? u.escapeHtml(initial) : icon(message.error ? 'alert' : 'sparkles', 15)}</span>
        <div class="ai-msg-body">
          <div class="ai-bubble" dir="auto">${u.escapeHtml(message.content).replace(/\n/g, '<br>')}</div>
          ${changes.length ? `<div class="ai-changes">${changes.map((change) => `<span class="ai-change">${icon('check', 11)} ${u.escapeHtml(change)}</span>`).join('')}</div>` : ''}
          ${warnings.length ? `<div class="ai-warnings">${warnings.map((warning) => `<span>${icon('alert', 11)} ${u.escapeHtml(warning)}</span>`).join('')}</div>` : ''}
          ${plan ? planBox(state, plan) : ''}
          <span class="ai-msg-time">${timeLabel(message.at)}</span>
        </div>
      </div>
    `;
  }

  function typingHtml() {
    return `
      <div class="ai-msg assistant ai-typing">
        <span class="ai-msg-avatar">${icon('sparkles', 15)}</span>
        <div class="ai-msg-body">
          <div class="ai-bubble ai-typing-bubble"><span></span><span></span><span></span></div>
          <span class="ai-msg-time">مشاور دارد فکر می‌کند…</span>
        </div>
      </div>
    `;
  }

  function renderHero(state) {
    const ai = state.settings.ai;
    const configured = App.ai.isConfigured(state);
    const title = ai.enabled && !configured ? 'تنظیمات مشاور کامل نیست' : 'مشاور درسی هوشمند';
    const text = ai.enabled && !configured
      ? 'برای شروع، آدرس سرویس، کلید API و نام مدل را کامل کن. کلید فقط روی همین دستگاه ذخیره می‌شود.'
      : 'یک مشاور تحصیلی فارسی‌زبان که برنامه‌ات را می‌شناسد؛ می‌تواند تکلیف و امتحان اضافه کند، نمره ثبت کند، نقاط قوت و ضعفت را تحلیل کند و برنامهٔ مطالعه بچیند.';
    const buttonLabel = configured ? 'فعال‌سازی مشاور' : 'تنظیم و فعال‌سازی';
    return `
      <section class="card ai-hero">
        <div class="ai-hero-copy">
          <span class="ai-eyebrow">${icon('sparkles', 13)} دستیار هوشمند درس‌نامه</span>
          <h2>${title}</h2>
          <p>${text}</p>
          <div class="row ai-hero-actions">
            <button class="btn btn-primary" data-ai-activate>${icon('sparkles', 16)} ${buttonLabel}</button>
            ${configured ? `<button class="btn btn-ghost" data-ai-config>${icon('settings', 15)} تنظیمات اتصال</button>` : ''}
          </div>
          <p class="hint">${icon('lock', 13)} کلید API فقط در فایل دادهٔ همین دستگاه ذخیره می‌شود و از برنامه خارج نمی‌شود.</p>
        </div>
        <div class="ai-hero-orb">
          <span class="ai-orb-ring"></span>
          <span class="ai-orb-core">${icon('sparkles', 42)}</span>
          <span class="ai-orb-chip one">${icon('chart', 13)} تحلیل نمرات</span>
          <span class="ai-orb-chip two">${icon('calendar', 13)} برنامه مطالعه</span>
          <span class="ai-orb-chip three">${icon('tasks', 13)} مدیریت تکالیف</span>
        </div>
      </section>

      <div class="ai-feature-grid">
        <div class="card ai-feature">
          <span class="ai-feature-icon">${icon('message', 20)}</span>
          <h3>گفتگوی طبیعی</h3>
          <p>به فارسی بپرس؛ مشاور از برنامه، نمرات و تکالیف فعلی‌ات پاسخ می‌دهد.</p>
        </div>
        <div class="card ai-feature">
          <span class="ai-feature-icon">${icon('edit', 20)}</span>
          <h3>تغییر واقعی برنامه</h3>
          <p>می‌تواند تکلیف و امتحان اضافه یا ویرایش کند و نمره و سطح درس‌ها را ثبت کند.</p>
        </div>
        <div class="card ai-feature">
          <span class="ai-feature-icon">${icon('target', 20)}</span>
          <h3>برنامهٔ شخصی</h3>
          <p>بر اساس روزهای باقی‌مانده تا امتحان و نقاط ضعفت، جلسه‌های مطالعه می‌چیند.</p>
        </div>
        <div class="card ai-feature">
          <span class="ai-feature-icon">${icon('lock', 20)}</span>
          <h3>حریم خصوصی</h3>
          <p>درخواست‌ها از خود برنامه ارسال می‌شوند و داده‌های هر کاربر جدا نگهداری می‌شود.</p>
        </div>
      </div>
    `;
  }

  function renderChat(state) {
    const ai = state.settings.ai;
    const messages = state.aiChat.messages;
    const plans = state.aiChat.plans;
    const ctx = contextStats(state);
    const avg = ctx.overall === null ? '—' : u.faNumber(ctx.overall, 2);

    return `
      <div class="ai-layout">
        <section class="card ai-chat-card">
          <div class="ai-chat-head">
            <div class="ai-chat-title">
              <span class="ai-chat-avatar">${icon('sparkles', 20)}</span>
              <div>
                <strong>مشاور درسی</strong>
                <span>${u.escapeHtml(ai.model)} • ${u.escapeHtml(maskBase(ai.baseUrl))}</span>
              </div>
            </div>
            <div class="row ai-chat-tools">
              <span class="badge badge-success">${icon('zap', 11)} فعال</span>
              <button class="icon-btn sm" data-ai-clear title="پاک کردن گفتگو" aria-label="پاک کردن گفتگو" ${page.busy ? 'disabled' : ''}>${icon('trash', 14)}</button>
              <button class="icon-btn sm" data-ai-config title="تنظیمات مشاور" aria-label="تنظیمات مشاور">${icon('settings', 14)}</button>
            </div>
          </div>

          <div class="ai-messages" id="ai-messages">
            ${messages.length ? messages.map((message) => messageHtml(state, message)).join('') : `
              <div class="ai-chat-empty">
                <span class="ai-empty-icon">${icon('message', 30)}</span>
                <h3>سلام${state.profile.name ? ` ${u.escapeHtml(state.profile.name)}` : ''}! چطور می‌توانم کمکت کنم؟</h3>
                <p>می‌توانی دربارهٔ درس‌ها، نمرات، تکالیف یا برنامهٔ امتحان‌ها بپرسی. اگر بخواهی، همین‌جا برایت برنامه می‌چینم.</p>
              </div>
            `}
            ${page.busy ? typingHtml() : ''}
          </div>

          <div class="ai-quick">
            ${QUICK_PROMPTS.map((prompt) => `<button class="chip" data-ai-prompt="${u.escapeAttr(prompt)}" ${page.busy ? 'disabled' : ''}>${u.escapeHtml(prompt)}</button>`).join('')}
          </div>

          <form class="ai-composer" id="ai-form" autocomplete="off">
            <textarea class="textarea" id="ai-input" rows="1" maxlength="2000" placeholder="پیامت را بنویس… (Enter برای ارسال، Shift+Enter برای خط جدید)">${u.escapeHtml(page.draft)}</textarea>
            <button type="submit" class="btn btn-primary ai-send" ${page.busy ? 'disabled' : ''}>
              ${icon('send', 18)}<span>${page.busy ? 'صبر کن' : 'ارسال'}</span>
            </button>
          </form>
        </section>

        <aside class="ai-side">
          <section class="card ai-side-card">
            ${ui.sectionHead('تصویر درسی تو', 'این خلاصه همراه هر پیام به مشاور داده می‌شود.', '')}
            <div class="ai-context-list">
              ${contextRow('معدل کلی', `${avg}${ctx.overall === null ? '' : ` <small>از ${u.toFa(ctx.max)}</small>`}`)}
              ${contextRow('تکالیف باقی‌مانده', u.toFa(ctx.pending))}
              ${contextRow('امتحان پیش‌رو', u.toFa(ctx.upcoming))}
              ${contextRow('قوی‌ترین درس', ctx.best ? u.escapeHtml(ctx.best.subject.name) : '—', 'green')}
              ${contextRow('نیازمند توجه', ctx.worst ? u.escapeHtml(ctx.worst.subject.name) : '—', 'rose')}
            </div>
            <p class="ai-context-note">${icon('lock', 12)} فقط خلاصهٔ داده‌های همین کاربر ارسال می‌شود؛ دادهٔ کاربران دیگر جدا است.</p>
          </section>

          <section class="card ai-side-card">
            ${ui.sectionHead('برنامه‌های مطالعه', 'برنامه‌هایی که مشاور ساخته است.', plans.length ? `<span class="badge badge-muted">${u.toFa(plans.length)}</span>` : '')}
            ${plans.length ? plans.slice(-3).reverse().map((plan) => `
              <div class="ai-side-plan">
                <div class="ai-side-plan-head">
                  <div>
                    <strong>${u.escapeHtml(plan.title)}</strong>
                    <span>${u.toFa(plan.items.length)} جلسه • ${u.faDateShort(plan.items[0]?.date || u.todayISO())}</span>
                  </div>
                  <button class="icon-btn sm danger" data-ai-plan-del="${u.escapeAttr(plan.id)}" title="حذف برنامه" aria-label="حذف برنامه">${icon('trash', 12)}</button>
                </div>
                ${plan.summary ? `<p>${u.escapeHtml(plan.summary)}</p>` : ''}
                ${planItemsHtml(state, plan, 3)}
              </div>
            `).join('') : `<p class="ai-side-empty">${icon('info', 12)} هنوز برنامه‌ای نساخته‌ای. از مشاور بخواه برای امتحان بعدی‌ات برنامه بچیند.</p>`}
          </section>

          <section class="card ai-side-card ai-tip-card">
            <span class="ai-tip-icon">${icon('sparkles', 17)}</span>
            <div>
              <strong>نکتهٔ مشاور</strong>
              <p>هرچه دقیق‌تر بگویی کدام درس، چه روزی و چقدر وقت داری، برنامهٔ بهتری می‌گیری.</p>
            </div>
          </section>
        </aside>
      </div>
    `;
  }

  function render(root) {
    const state = App.store.state;
    if (page.userId !== App.store.activeUserId) {
      page.userId = App.store.activeUserId;
      page.busy = false;
      page.draft = '';
      page.focus = false;
    }
    const ready = App.ai.isReady(state);
    const status = ready
      ? '<span class="badge badge-success">فعال</span>'
      : `<span class="badge ${state.settings.ai.enabled ? 'badge-warn' : 'badge-muted'}">${state.settings.ai.enabled ? 'نیازمند تنظیم' : 'غیرفعال'}</span>`;

    root.innerHTML = `
      ${ui.pageHeader(
        'مشاور درسی هوشمند',
        'مشاور تحصیلی فارسی‌زبان که برنامه، نمرات و تکالیف تو را می‌شناسد و می‌تواند برنامه‌ات را تغییر بدهد.',
        `${status}
         <button class="btn btn-ghost" data-ai-config>${icon('settings', 15)} تنظیمات مشاور</button>`
      )}
      ${ready ? renderChat(state) : renderHero(state)}
    `;

    if (ready) bindChat(root, state);
    else bindHero(root, state);

    requestAnimationFrame(() => {
      const box = root.querySelector('#ai-messages');
      if (box) box.scrollTop = box.scrollHeight;
      if (page.focus) {
        const input = root.querySelector('#ai-input');
        input?.focus({ preventScroll: true });
        page.focus = false;
      }
    });
  }

  function bindHero(root) {
    root.querySelectorAll('[data-ai-activate]').forEach((btn) => {
      btn.addEventListener('click', () => openConfig({ activate: true }));
    });
    root.querySelectorAll('[data-ai-config]').forEach((btn) => {
      btn.addEventListener('click', () => openConfig());
    });
  }

  function startPlan(button) {
    const subjectId = button.dataset.subject;
    if (!subjectId) return;
    const date = button.dataset.date || u.todayISO();
    const minutes = u.clamp(Number(button.dataset.minutes) || 25, 5, 120);
    const kind = date <= u.todayISO() ? 'review' : 'pre';
    location.hash = `#/study?kind=${kind}&subject=${encodeURIComponent(subjectId)}&minutes=${minutes}`;
  }

  function bindChat(root, state) {
    root.querySelectorAll('[data-ai-config]').forEach((btn) => {
      btn.addEventListener('click', () => openConfig());
    });

    root.querySelectorAll('[data-ai-clear]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!App.store.state.aiChat.messages.length && !App.store.state.aiChat.plans.length) {
          ui.toast('گفتگو خالی است.', 'info', 1800);
          return;
        }
        const ok = await ui.confirm({
          title: 'پاک کردن گفتگو',
          message: 'همهٔ پیام‌ها و برنامه‌های ساخته‌شده در این صفحه پاک شوند؟ داده‌های اصلی برنامه دست‌نخورده می‌مانند.',
          danger: true,
          confirmText: 'پاک کن'
        });
        if (!ok) return;
        App.store.update((draft) => {
          draft.aiChat.messages = [];
          draft.aiChat.plans = [];
        });
        ui.toast('گفتگو پاک شد.', 'info');
      });
    });

    root.querySelectorAll('[data-ai-plan-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const plan = App.store.state.aiChat.plans.find((item) => item.id === btn.dataset.aiPlanDel);
        if (!plan) return;
        const ok = await ui.confirm({
          title: 'حذف برنامهٔ مطالعه',
          message: `برنامهٔ «${plan.title}» حذف شود؟`,
          danger: true,
          confirmText: 'حذف کن'
        });
        if (!ok) return;
        App.store.update((draft) => {
          draft.aiChat.plans = draft.aiChat.plans.filter((item) => item.id !== plan.id);
        });
        ui.toast('برنامه حذف شد.', 'info');
      });
    });

    root.querySelectorAll('[data-ai-plan-start]').forEach((btn) => {
      btn.addEventListener('click', () => startPlan(btn));
    });

    root.querySelectorAll('[data-ai-prompt]').forEach((btn) => {
      btn.addEventListener('click', () => send(btn.dataset.aiPrompt || ''));
    });

    const form = root.querySelector('#ai-form');
    const input = root.querySelector('#ai-input');
    if (input) {
      input.style.height = 'auto';
      input.style.height = `${Math.min(140, Math.max(48, input.scrollHeight))}px`;
      input.addEventListener('input', () => {
        page.draft = input.value;
        input.style.height = 'auto';
        input.style.height = `${Math.min(140, Math.max(48, input.scrollHeight))}px`;
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          form?.requestSubmit();
        }
      });
    }

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      send(input?.value || page.draft);
    });
  }

  async function send(rawText) {
    const text = String(rawText ?? page.draft ?? '').trim();
    if (!text || page.busy) return;
    const state = App.store.state;
    if (!App.ai.isReady(state)) {
      ui.toast('اول مشاور هوشمند را فعال و تنظیم کن.', 'error');
      openConfig({ activate: true });
      return;
    }

    const userId = App.store.activeUserId;
    const stateRef = state;
    const history = state.aiChat.messages.slice(-12).map((message) => ({
      role: message.role,
      content: message.content
    }));

    page.busy = true;
    page.draft = '';
    page.focus = true;

    App.store.update((draft) => {
      pushMessage(draft, {
        role: 'user',
        content: text,
        at: new Date().toISOString(),
        planId: null,
        error: false,
        changes: [],
        warnings: []
      });
    });

    let result;
    try {
      result = await App.ai.run(text, history);
    } catch (error) {
      console.warn('AI send failed', error);
      result = { ok: false, error: 'ارتباط با مشاور برقرار نشد. دوباره تلاش کن.' };
    }

    if (App.store.activeUserId !== userId || App.store.state !== stateRef) {
      page.busy = false;
      App.renderCurrent();
      return;
    }

    if (!result.ok) {
      page.busy = false;
      App.store.update((draft) => {
        pushMessage(draft, {
          role: 'assistant',
          content: result.error,
          at: new Date().toISOString(),
          planId: null,
          error: true,
          changes: [],
          warnings: result.detail ? [result.detail] : []
        });
      });
      ui.toast(result.error, 'error', 5200);
      return;
    }

    let applied = { changes: [], warnings: [], planId: null };
    page.busy = false;
    App.store.update((draft) => {
      applied = App.ai.applyActions(draft, result.actions, result.plan);
      pushMessage(draft, {
        role: 'assistant',
        content: result.reply,
        at: new Date().toISOString(),
        planId: applied.planId,
        error: false,
        changes: applied.changes,
        warnings: [...(result.warnings || []), ...applied.warnings]
      });
    });

    if (applied.changes.length) {
      ui.toast(`${u.toFa(applied.changes.length)} تغییر در برنامه‌ات اعمال شد.`, 'success');
    } else if (applied.warnings.length) {
      ui.toast('مشاور پاسخ داد اما تغییری اعمال نشد.', 'info', 3600);
    }
  }

  function openConfig({ activate = false } = {}) {
    const state = App.store.state;
    const ai = state.settings.ai;
    const enabled = activate ? true : Boolean(ai.enabled);

    const body = `
      <form id="ai-config-form" class="form ai-config-form" autocomplete="off">
        <div class="ai-config-note">
          ${icon('lock', 15)}
          <span>این اطلاعات فقط در فایل دادهٔ همین دستگاه ذخیره می‌شود. اگر سرویس‌ات OpenAI-compatible است، آدرس پایه را وارد کن.</span>
        </div>

        <div class="field">
          <label for="ai-base">آدرس سرویس (Base URL)</label>
          <input class="input" id="ai-base" value="${u.escapeAttr(ai.baseUrl || '')}" placeholder="https://api.openai.com/v1" dir="ltr">
          <p class="hint">نمونه: <span dir="ltr">https://api.openai.com/v1</span> یا <span dir="ltr">https://openrouter.ai/api/v1</span></p>
        </div>

        <div class="field">
          <label for="ai-key">کلید API</label>
          <div class="ai-key-row">
            <input class="input" id="ai-key" type="password" value="${u.escapeAttr(ai.apiKey || '')}" placeholder="sk-..." dir="ltr">
            <button type="button" class="btn btn-ghost btn-sm" data-ai-key-toggle>نمایش</button>
          </div>
        </div>

        <div class="form-row">
          <div class="field">
            <label for="ai-model">نام مدل</label>
            <input class="input" id="ai-model" value="${u.escapeAttr(ai.model || '')}" placeholder="gpt-4o-mini" dir="ltr">
          </div>
          <div class="field">
            <label>وضعیت</label>
            <label class="toggle-chip ai-enabled-toggle">
              <input type="checkbox" id="ai-enabled" ${enabled ? 'checked' : ''}>
              <span>${icon('sparkles', 14)} مشاور فعال باشد</span>
            </label>
          </div>
        </div>

        <div class="field">
          <label for="ai-instructions">دستورهای اضافی (اختیاری)</label>
          <textarea class="textarea" id="ai-instructions" rows="3" maxlength="2000" placeholder="مثلاً: لحن خیلی خودمانی داشته باش، یا برای حفظ کردن از فلش‌کارت پیشنهاد بده...">${u.escapeHtml(ai.instructions || '')}</textarea>
        </div>

        <div class="ai-test-row">
          <button type="button" class="btn btn-soft btn-sm" data-ai-test>${icon('zap', 14)} آزمایش اتصال</button>
          <span class="ai-test-status" data-ai-test-status></span>
        </div>
      </form>
    `;

    ui.openModal({
      title: 'تنظیمات مشاور هوشمند',
      subtitle: 'اتصال به یک سرویس سازگار با OpenAI',
      iconName: 'sparkles',
      size: 'md',
      body,
      footer: `
        <button type="button" class="btn btn-ghost" data-cancel>انصراف</button>
        <button type="submit" form="ai-config-form" class="btn btn-primary">${icon('check', 16)} ذخیره تنظیمات</button>
      `,
      onMount: (root, close) => {
        const form = root.querySelector('#ai-config-form');
        const keyInput = root.querySelector('#ai-key');
        const toggle = root.querySelector('[data-ai-key-toggle]');
        const testBtn = root.querySelector('[data-ai-test]');
        const testStatus = root.querySelector('[data-ai-test-status]');

        const read = () => ({
          baseUrl: root.querySelector('#ai-base').value.trim(),
          apiKey: keyInput.value.trim(),
          model: root.querySelector('#ai-model').value.trim(),
          instructions: root.querySelector('#ai-instructions').value.trim().slice(0, 2000),
          enabled: root.querySelector('#ai-enabled').checked
        });

        toggle?.addEventListener('click', () => {
          const visible = keyInput.type === 'text';
          keyInput.type = visible ? 'password' : 'text';
          toggle.textContent = visible ? 'نمایش' : 'پنهان';
        });

        testBtn?.addEventListener('click', async () => {
          const values = read();
          if (!values.baseUrl || !values.apiKey || !values.model) {
            testStatus.className = 'ai-test-status is-error';
            testStatus.textContent = 'آدرس، کلید و نام مدل را کامل کن.';
            return;
          }
          testBtn.disabled = true;
          testStatus.className = 'ai-test-status is-pending';
          testStatus.textContent = 'در حال آزمایش اتصال…';
          const result = await App.ai.test(values);
          testBtn.disabled = false;
          if (result?.ok) {
            testStatus.className = 'ai-test-status is-ok';
            testStatus.textContent = 'اتصال برقرار است؛ مدل پاسخ داد.';
          } else {
            testStatus.className = 'ai-test-status is-error';
            testStatus.textContent = result?.error || 'آزمایش اتصال ناموفق بود.';
          }
        });

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const values = read();
          if (!/^https?:\/\//i.test(values.baseUrl)) {
            ui.toast('آدرس سرویس باید با http یا https شروع شود.', 'error');
            root.querySelector('#ai-base').focus();
            return;
          }
          if (!values.model) {
            ui.toast('نام مدل را وارد کن.', 'error');
            root.querySelector('#ai-model').focus();
            return;
          }
          if (values.enabled && !values.apiKey) {
            ui.toast('برای فعال‌سازی، کلید API لازم است.', 'error');
            keyInput.focus();
            return;
          }
          App.store.update((draft) => {
            draft.settings.ai = { ...draft.settings.ai, ...values };
          });
          close();
          ui.toast(values.enabled ? 'مشاور هوشمند فعال شد.' : 'تنظیمات مشاور ذخیره شد.', 'success');
        });

        root.querySelector('[data-cancel]')?.addEventListener('click', () => close());
      }
    });
  }

  App.pages = App.pages || {};
  App.pages.ai = { render, openConfig };
})();
