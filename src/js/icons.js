/* درس‌نامه — inline SVG icon set (Feather-style paths) */
(function () {
  const App = window.App;

  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M7 2.5v4M17 2.5v4M3 9.5h18"/><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 17h2M11 17h2"/>',
    tasks: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="m7.5 9 1.6 1.6L12 7.8"/><path d="M14.5 9h2.5M7.5 15l1.6 1.6L12 13.8M14.5 15h2.5"/>',
    exam: '<path d="M6 2.5h8.5L20 8v13.5H6z"/><path d="M14 2.5V8h5.5"/><path d="M9.5 12h7M9.5 15.5h7M9.5 19h4.5"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M9 9.5V20M15 9.5V20"/>',
    award: '<circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-1.5 8 5-2.6 5 2.6-1.5-8"/><path d="m10 9 1.4 1.4L14 7.8"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4.5l3 1.8"/><path d="M9 2.5h6M12 2.5V5"/><path d="m19 6 1.5-1.5"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    trash: '<path d="M3.5 6.5h17M8 6.5V4h8v2.5M6.5 6.5 7.5 21h9l1-14.5"/><path d="M10 10.5v6M14 10.5v6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
    sparkles: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 2l.6 1.4L7 4l-1.4.6L5 6l-.6-1.4L3 4l1.4-.6z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>',
    monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    play: '<path d="m7 4.5 13 7.5-13 7.5z"/>',
    pause: '<path d="M8 4.5v15M16 4.5v15"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    skip: '<path d="m5 4.5 10 7.5-10 7.5z"/><path d="M19 4.5v15"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    trending: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    coffee: '<path d="M4 8h13v6.5A4.5 4.5 0 0 1 12.5 19h-4A4.5 4.5 0 0 1 4 14.5z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M7 3v2M11 2.5V4M15 3v2M3 22h16"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/>',
    upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/>',
    database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/><path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    flame: '<path d="M12 22c4 0 6.5-2.7 6.5-6.2 0-2.6-1.4-4.7-3.2-6.3-.7 1.6-1.8 2.6-3 3.1.3-3.8-1.7-6.5-3.8-8.1.1 2.6-1.4 4.4-2.2 6.3a9.6 9.6 0 0 0-.8 4c0 3.9 2.5 7.2 6.5 7.2z"/>',
    alert: '<path d="M12 3 2.8 20h18.4z"/><path d="M12 9.5v4M12 17h.01"/>',
    grad: '<path d="m2.5 9 9.5-5 9.5 5-9.5 5z"/><path d="M6.5 11.2V16c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.8"/><path d="M21.5 9v6"/>',
    layers: '<path d="m12 2.5 9.5 5-9.5 5-9.5-5z"/><path d="m2.5 12 9.5 5 9.5-5"/><path d="m2.5 16.5 9.5 5 9.5-5"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.5-4.5"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    arrowUp: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.7-7.7 1.1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    zap: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V7M17 16v-6"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m11 12 9.5-9.5M17 6l2.5 2.5M14.5 8.5 17 11"/>',
    bot: '<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    message: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l2.2-3.4A8.5 8.5 0 1 1 21 11.5z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H5.5A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15"/>'
  };

  function icon(name, size = 20, className = '') {
    const path = P[name] || P.info;
    return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }

  function logo(size = 40) {
    return `<svg class="brand-mark" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lg-brand" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stop-color="#a78bfa"/><stop offset="1" stop-color="#2dd4bf"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#lg-brand)" opacity=".16"/>
      <path d="M13 12.5h13.5a5 5 0 0 1 5 5V36a4 4 0 0 0-4-4H13z" stroke="url(#lg-brand)" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M13 12.5v19.5" stroke="url(#lg-brand)" stroke-width="2.4" stroke-linecap="round"/>
      <path d="m21 19 1.5 3.4 3.5.4-2.6 2.4.7 3.5-3.1-1.8-3.1 1.8.7-3.5-2.6-2.4 3.5-.4z" fill="url(#lg-brand)"/>
    </svg>`;
  }

  App.icons = { icon, logo };
})();
