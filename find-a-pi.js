/**
 * find-a-pi.js — Embeddable "Find a Private Investigator" widget
 *
 * Embed:
 *   <div id="find-a-pi"></div>
 *   <script src="find-a-pi.js"
 *           data-src="pi-data.json"
 *           data-container="find-a-pi"></script>
 *
 * Attributes on the <script> tag:
 *   data-src        Path to your pi-data.json file  (default: "pi-data.json")
 *   data-container  ID of the mount element          (default: "find-a-pi")
 */
(function () {
  'use strict';

  const currentScript = document.currentScript;

  const AVATAR_COLORS = [
    '#1a56db', '#7e3af2', '#0e9f6e', '#e3a008', '#e02424', '#ff5a1f', '#6b7280'
  ];

  function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function escapeHtml(value) {
    const el = document.createElement('div');
    el.appendChild(document.createTextNode(String(value == null ? '' : value)));
    return el.innerHTML;
  }

  function phoneTel(phone) {
    return 'tel:' + phone.replace(/[^0-9+]/g, '');
  }

  function isValidUrl(str) {
    try {
      const u = new URL(str);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch (_) {
      return false;
    }
  }

  const ICONS = {
    search: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    location: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2a5.5 5.5 0 0 1 5.5 5.5c0 4-5.5 10.5-5.5 10.5S4.5 11.5 4.5 7.5A5.5 5.5 0 0 1 10 2z" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="7.5" r="1.75" stroke="currentColor" stroke-width="1.4"/></svg>',
    phone: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6.3 8.6a10.8 10.8 0 0 0 5.1 5.1l1.4-1.4a.75.75 0 0 1 .8-.18 9 9 0 0 0 2.8.45.75.75 0 0 1 .75.75v2.7a.75.75 0 0 1-.75.75C8.1 16.83 3.17 11.9 3.17 5.75A.75.75 0 0 1 3.92 5H6.6a.75.75 0 0 1 .75.75 9 9 0 0 0 .45 2.8.75.75 0 0 1-.19.8L6.3 8.6z" fill="currentColor"/></svg>',
    email: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="5" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M3 7l7 5 7-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    globe: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M10 3c0 0-3 3-3 7s3 7 3 7M10 3c0 0 3 3 3 7s-3 7-3 7M3 10h14" stroke="currentColor" stroke-width="1.4"/></svg>'
  };

  class FindPIWidget {
    constructor(container, dataUrl) {
      this.container = container;
      this.dataUrl = dataUrl;
      this.investigators = [];
      this.filtered = [];
      this.filters = { name: '', state: '', specialty: '' };
    }

    async init() {
      this.container.innerHTML = '<div class="fpi-loading" role="status">Loading investigators…</div>';
      try {
        const res = await fetch(this.dataUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        this.investigators = Array.isArray(data.investigators) ? data.investigators : [];
        this.filtered = [...this.investigators];
        this.render();
      } catch (err) {
        this.container.innerHTML =
          '<div class="fpi-error" role="alert">Could not load investigator data. Please try again later.</div>';
        console.error('[find-a-pi]', err);
      }
    }

    getStates() {
      return [...new Set(this.investigators.map(pi => pi.state))].sort();
    }

    getSpecialties() {
      return [...new Set(this.investigators.flatMap(pi => pi.specialties || []))].sort();
    }

    applyFilters() {
      const { name, state, specialty } = this.filters;
      const q = name.trim().toLowerCase();
      this.filtered = this.investigators.filter(pi => {
        const nameMatch = !q ||
          pi.name.toLowerCase().includes(q) ||
          pi.firm.toLowerCase().includes(q);
        const stateMatch = !state || pi.state === state;
        const specialtyMatch = !specialty || (pi.specialties || []).includes(specialty);
        return nameMatch && stateMatch && specialtyMatch;
      });
      this.renderGrid();
    }

    render() {
      const states = this.getStates();
      const specialties = this.getSpecialties();

      const stateOptions = states
        .map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
        .join('');

      const specialtyOptions = specialties
        .map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
        .join('');

      this.container.innerHTML = `
        <section class="fpi-widget" aria-label="Find a Private Investigator">
          <div class="fpi-filters" role="search">
            <div class="fpi-search-wrap">
              <span class="fpi-search-icon">${ICONS.search}</span>
              <input
                class="fpi-input fpi-search"
                type="search"
                placeholder="Search name or firm…"
                aria-label="Search investigators by name or firm"
              />
            </div>
            <select class="fpi-input fpi-select" aria-label="Filter by state">
              <option value="">All States</option>
              ${stateOptions}
            </select>
            <select class="fpi-input fpi-select" aria-label="Filter by member type">
              <option value="">All Member Types</option>
              ${specialtyOptions}
            </select>
          </div>
          <div class="fpi-results-meta" aria-live="polite"></div>
          <div class="fpi-grid" role="list"></div>
        </section>
      `;

      const search = this.container.querySelector('.fpi-search');
      const selects = this.container.querySelectorAll('.fpi-select');

      search.addEventListener('input', e => {
        this.filters.name = e.target.value;
        this.applyFilters();
      });

      selects[0].addEventListener('change', e => {
        this.filters.state = e.target.value;
        this.applyFilters();
      });

      selects[1].addEventListener('change', e => {
        this.filters.specialty = e.target.value;
        this.applyFilters();
      });

      this.renderGrid();
    }

    cardHTML(pi) {
      const color = avatarColor(pi.name);
      const initial = escapeHtml((pi.name || '?').charAt(0).toUpperCase());
      const tags = (pi.specialties || [])
        .map(s => `<span class="fpi-tag">${escapeHtml(s)}</span>`)
        .join('');

      const phoneLink = pi.phone
        ? `<a class="fpi-contact-link" href="${phoneTel(pi.phone)}" aria-label="Call ${escapeHtml(pi.name)}">${ICONS.phone}<span>${escapeHtml(pi.phone)}</span></a>`
        : '';

      const emailLink = pi.email
        ? `<a class="fpi-contact-link" href="mailto:${escapeHtml(pi.email)}" aria-label="Email ${escapeHtml(pi.name)}">${ICONS.email}<span>${escapeHtml(pi.email)}</span></a>`
        : '';

      const websiteLink = pi.website && isValidUrl(pi.website)
        ? `<a class="fpi-contact-link fpi-website-link" href="${escapeHtml(pi.website)}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${escapeHtml(pi.firm)} website">${ICONS.globe}<span>Website</span></a>`
        : '';

      const memoriamBanner = pi.in_memoriam
        ? `<div class="fpi-memoriam-banner">✦ In Memoriam</div>`
        : '';

      const roleEl = pi.role
        ? `<p class="fpi-role">${escapeHtml(pi.role)}</p>`
        : '';

      return `
        <div class="fpi-card${pi.in_memoriam ? ' fpi-card--memoriam' : ''}" role="listitem">
          ${memoriamBanner}
          <div class="fpi-card-header">
            <div class="fpi-avatar" style="background:${color}" aria-hidden="true">${initial}</div>
            <div class="fpi-card-identity">
              <h3 class="fpi-pi-name">${escapeHtml(pi.name)}</h3>
              <p class="fpi-firm-name">${escapeHtml(pi.firm)}</p>
              ${roleEl}
            </div>
          </div>
          <div class="fpi-card-body">
            <div class="fpi-location">
              ${ICONS.location}
              <span>${escapeHtml(pi.city)}, ${escapeHtml(pi.state)}</span>
            </div>
            <div class="fpi-tags">${tags}</div>
          </div>
          <div class="fpi-card-footer">
            ${phoneLink}${emailLink}${websiteLink}
          </div>
        </div>
      `;
    }

    renderGrid() {
      const meta = this.container.querySelector('.fpi-results-meta');
      const grid = this.container.querySelector('.fpi-grid');
      const n = this.filtered.length;

      meta.textContent = n === 1 ? '1 investigator found' : `${n} investigators found`;

      if (n === 0) {
        grid.innerHTML = '<div class="fpi-empty">No investigators match your filters. Try broadening your search.</div>';
        return;
      }

      grid.innerHTML = this.filtered.map(pi => this.cardHTML(pi)).join('');
    }
  }

  function boot() {
    const containerId =
      (currentScript && currentScript.getAttribute('data-container')) || 'find-a-pi';
    const dataUrl =
      (currentScript && currentScript.getAttribute('data-src')) || 'pi-data.json';

    const el = document.getElementById(containerId);
    if (!el) {
      console.warn('[find-a-pi] Mount element not found: #' + containerId);
      return;
    }

    const widget = new FindPIWidget(el, dataUrl);
    widget.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
