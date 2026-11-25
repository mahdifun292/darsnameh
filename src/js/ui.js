/* درس‌نامه — reusable UI pieces: modal, toast, cards, pickers */
(function () {
  const App = window.App;
  const u = App.util;
  const { icon } = App.icons;

  let toastLayer = null;

  function ensureToastLayer() {
    if (!toastLayer) {
      toastLayer = document.createElement('div');
      toastLayer.className = 'toast-layer';
      toastLayer.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastLayer);
    }
    return toastLayer;
  }

  function toast(message, type = 'success', timeout = 3400) {
    const layer = ensureToastLayer();
    const node = document.createElement('div');
    node.className = `toast toast-${type}`;
    const iconName = type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check';
    node.innerHTML = `<span class="toast-icon">${icon(iconName, 18)}</span><span>${u.escapeHtml(message)}</span>`;
    layer.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => {
      node.classList.remove('show');
      setTimeout(() => node.remove(), 250);
    }, timeout);
  }

  function openModal(options = {}) {
    const {
      title = '',
      subtitle = '',
      body = '',
      footer = '',
      size = 'md',
      onMount = null,
      onClose = null,
      closeOnBackdrop = true,
      iconName = null
    } = options;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal modal-${size}" role="dialog" aria-modal="true" aria-label="${u.escapeAttr(title)}">
        <div class="modal-head">
          <div class="modal-title-wrap">
            ${iconName ? `<span class="modal-icon">${icon(iconName, 20)}</span>` : ''}
            <div>
              <h3>${u.escapeHtml(title)}</h3>
              ${subtitle ? `<p>${u.escapeHtml(subtitle)}</p>` : ''}
            </div>
          </div>
          <button type="button" class="icon-btn modal-close" aria-label="بستن">${icon('x', 20)}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>
    `;
    document.body.appendChild(backdrop);
    document.body.classList.add('modal-open');

    let closed = false;
    const close = (result) => {
      if (closed) return;
      closed = true;
      backdrop.classList.add('closing');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => {
        backdrop.remove();
        if (!document.querySelector('.modal-backdrop')) document.body.classList.remove('modal-open');
      }, 160);
      if (onClose) onClose(result);
    };

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    backdrop.querySelector('.modal-close').addEventListener('click', () => close());
    if (closeOnBackdrop) {
      backdrop.addEventListener('mousedown', (event) => {
        if (event.target === backdrop) close();
      });
    }
    document.addEventListener('keydown', onKey);

    requestAnimationFrame(() => backdrop.classList.add('open'));
    setTimeout(() => {
      const first = backdrop.querySelector('[autofocus], input:not([type="hidden"]), select, textarea');
      if (first) first.focus({ preventScroll: true });
    }, 80);

    if (onMount) onMount(backdrop, close);
    return { el: backdrop, close, body: backdrop.querySelector('.modal-body') };
  }

  function confirm(options = {}) {
    const {
      title = 'مطمئنی؟',
      message = '',
      confirmText = 'بله، ادامه بده',
      cancelText = 'انصراف',
      danger = false,
      iconName = danger ? 'alert' : 'info'
    } = options;

    return new Promise((resolve) => {
      let confirmed = false;
      const modal = openModal({
        title,
        body: `<p class="confirm-text">${u.escapeHtml(message)}</p>`,
        size: 'sm',
        iconName,
        footer: `
          <button type="button" class="btn btn-ghost" data-cancel>${u.escapeHtml(cancelText)}</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${u.escapeHtml(confirmText)}</button>
        `,
        onClose: () => resolve(confirmed),
        onMount: (modalEl, close) => {
          modalEl.querySelector('[data-cancel]').addEventListener('click', () => close());
          modalEl.querySelector('[data-confirm]').addEventListener('click', () => {
            confirmed = true;
            close();
          });
        }
      });
      modal.el.querySelector('[data-confirm]').focus();
    });
  }

  function pageHeader(title, subtitle = '', actions = '') {
    return `
      <div class="page-head">
        <div>
          <h1>${title}</h1>
          ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
        </div>
        ${actions ? `<div class="page-actions">${actions}</div>` : ''}
      </div>
    `;
  }

  function sectionHead(title, subtitle = '', actions = '') {
    return `
      <div class="section-head">
        <div>
          <h2>${title}</h2>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
        ${actions ? `<div class="section-actions">${actions}</div>` : ''}
      </div>
    `;
  }

  function emptyState(iconName, title, text = '', action = '') {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon(iconName, 28)}</div>
        <h3>${u.escapeHtml(title)}</h3>
        ${text ? `<p>${u.escapeHtml(text)}</p>` : ''}
        ${action || ''}
      </div>
    `;
  }

  function statCard({ iconName, label, value, sub = '', tone = 'violet' }) {
    return `
      <div class="stat-card tone-${tone}">
        <div class="stat-icon">${icon(iconName, 20)}</div>
        <div class="stat-copy">
          <span>${u.escapeHtml(label)}</span>
          <strong>${value}</strong>
          ${sub ? `<small>${sub}</small>` : ''}
        </div>
      </div>
    `;
  }

  function progressRing({ value = 0, max = 100, size = 120, stroke = 10, color = 'var(--accent)', label = '', sub = '' }) {
    const safeMax = max || 1;
    const pct = Math.max(0, Math.min(1, value / safeMax));
    const radius = (size - stroke) / 2;
    const circ = 2 * Math.PI * radius;
    return `
      <div class="ring-wrap" style="--ring-size:${size}px">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="ring">
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${stroke}"/>
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}"
            stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct)}"
            transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dashoffset .5s ease"/>
        </svg>
        <div class="ring-label">
          <strong>${label}</strong>
          ${sub ? `<span>${sub}</span>` : ''}
        </div>
      </div>
    `;
  }

  function strengthBadge(level) {
    const meta = u.strengthMeta(level);
    if (!meta) return `<span class="badge badge-muted">تعیین نشده</span>`;
    return `<span class="badge badge-strength" style="--tone:${meta.color}">${meta.label}</span>`;
  }

  function strengthPicker(name, selected) {
    return `
      <div class="strength-picker" data-strength-picker="${u.escapeAttr(name)}">
        ${u.STRENGTHS.map((s) => `
          <label class="strength-option ${selected === s.level ? 'selected' : ''}" style="--tone:${s.color}">
            <input type="radio" name="${u.escapeAttr(name)}" value="${s.level}" ${selected === s.level ? 'checked' : ''}>
            <span class="strength-dot"></span>
            <span>${s.label}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  function subjectOptions(state, selectedId, placeholder = 'انتخاب درس') {
    return `<option value="">${u.escapeHtml(placeholder)}</option>` + state.subjects
      .slice()
      .sort((a, b) => u.comparePersian(a.name, b.name))
      .map((s) => `<option value="${u.escapeAttr(s.id)}" ${selectedId === s.id ? 'selected' : ''}>${u.escapeHtml(s.name)}</option>`)
      .join('');
  }

  function subjectChip(state, subjectId, extra = '') {
    const subject = u.subjectById(state, subjectId);
    if (!subject) return `<span class="subject-chip is-empty">بدون درس</span>`;
    return `<span class="subject-chip" style="--c:${subject.color}"><i></i>${u.escapeHtml(subject.name)}${extra ? `<small>${extra}</small>` : ''}</span>`;
  }

  function formatScore(score, max = 20) {
    if (score === null || score === undefined || score === '') return '—';
    return `${u.faNumber(score)} <small>از ${u.toFa(max)}</small>`;
  }

  function priorityBadge(type) {
    if (type === 'overdue') return '<span class="badge badge-danger">معوق</span>';
    if (type === 'today') return '<span class="badge badge-warn">امروز</span>';
    if (type === 'week') return '<span class="badge badge-info">این هفته</span>';
    if (type === 'done') return '<span class="badge badge-success">انجام شد</span>';
    return '<span class="badge badge-muted">بعداً</span>';
  }

  App.ui = {
    toast,
    openModal,
    confirm,
    pageHeader,
    sectionHead,
    emptyState,
    statCard,
    progressRing,
    strengthBadge,
    strengthPicker,
    subjectOptions,
    subjectChip,
    formatScore,
    priorityBadge
  };
})();
