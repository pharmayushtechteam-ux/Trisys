/* ==========================================================================
   TRISYS EXPRESS - INTERACTIVE ENGINE
   Handles tab switching, package selection, country lookups, instant quotes,
   live tracking simulations, modal dialogs, toasts and scroll animations.
   ========================================================================== */

document.documentElement.classList.add('js');

// SVG Flag Helper — accurate, lightweight inline flags (3:2 canvas, 24 x 16)
const FLAG_UNION_JACK = (x, y, w, h) => `
  <svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 60 30" preserveAspectRatio="none">
    <rect width="60" height="30" fill="#012169"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" stroke-width="6"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="2.4"/>
    <path d="M30,0 V30 M0,15 H60" stroke="#FFFFFF" stroke-width="10"/>
    <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/>
  </svg>`;

// 5-point star centred at (cx, cy) with outer radius r
const FLAG_STAR = (cx, cy, r, fill, extra = '') => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const len = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + len * Math.cos(rad)).toFixed(2)},${(cy + len * Math.sin(rad)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" ${extra}/>`;
};

const FLAG_ART = {
  // India: saffron / white / green + Ashoka Chakra
  IN: `
    <rect width="24" height="5.34" fill="#FF9933"/>
    <rect y="5.33" width="24" height="5.34" fill="#FFFFFF"/>
    <rect y="10.66" width="24" height="5.34" fill="#138808"/>
    <circle cx="12" cy="8" r="2.1" fill="none" stroke="#000080" stroke-width="0.45"/>
    <circle cx="12" cy="8" r="0.45" fill="#000080"/>
    <path d="M12 5.9V10.1M9.9 8H14.1M10.5 6.5L13.5 9.5M13.5 6.5L10.5 9.5" stroke="#000080" stroke-width="0.25"/>`,

  // United States: 13 stripes + canton with stars
  US: (() => {
    const s = 16 / 13;
    let stripes = '';
    for (let i = 1; i < 13; i += 2) stripes += `<rect y="${(i * s).toFixed(3)}" width="24" height="${s.toFixed(3)}" fill="#FFFFFF"/>`;
    let stars = '';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < (r % 2 ? 5 : 6); c++) {
        const cx = (r % 2 ? 1.6 : 0.8) + c * 1.6;
        stars += `<circle cx="${cx.toFixed(2)}" cy="${(0.9 + r * 1.65).toFixed(2)}" r="0.32" fill="#FFFFFF"/>`;
      }
    }
    return `<rect width="24" height="16" fill="#B22234"/>${stripes}
      <rect width="9.6" height="${(7 * s).toFixed(3)}" fill="#3C3B6E"/>${stars}`;
  })(),

  // United Kingdom: Union Jack
  GB: FLAG_UNION_JACK(0, 0, 24, 16),

  // Canada: red bars + maple leaf
  CA: `
    <rect width="24" height="16" fill="#FFFFFF"/>
    <rect width="6" height="16" fill="#D80621"/>
    <rect x="18" width="6" height="16" fill="#D80621"/>
    <polygon fill="#D80621" points="12,3 12.9,4.8 13.8,4.4 13.5,6.7 14.9,5.3 15.2,6.1 16.5,5.8 16.1,7.2 16.7,7.5 14.7,9.2 14.9,10 12.25,9.7 12.25,12.6 11.75,12.6 11.75,9.7 9.1,10 9.3,9.2 7.3,7.5 7.9,7.2 7.5,5.8 8.8,6.1 9.1,5.3 10.5,6.7 10.2,4.4 11.1,4.8"/>`,

  // United Arab Emirates
  AE: `
    <rect width="24" height="5.34" fill="#00732F"/>
    <rect y="5.33" width="24" height="5.34" fill="#FFFFFF"/>
    <rect y="10.66" width="24" height="5.34" fill="#000000"/>
    <rect width="6" height="16" fill="#FF0000"/>`,

  // Australia: Union Jack canton, Commonwealth Star, Southern Cross
  AU: `
    <rect width="24" height="16" fill="#012169"/>
    ${FLAG_UNION_JACK(0, 0, 12, 8)}
    ${FLAG_STAR(6, 12, 1.8, '#FFFFFF')}
    ${FLAG_STAR(18, 13.4, 1.1, '#FFFFFF')}
    ${FLAG_STAR(18, 3, 1.1, '#FFFFFF')}
    ${FLAG_STAR(15, 7, 1.1, '#FFFFFF')}
    ${FLAG_STAR(21.2, 6.2, 1.1, '#FFFFFF')}
    ${FLAG_STAR(19.6, 9, 0.6, '#FFFFFF')}`,

  // Germany
  DE: `
    <rect width="24" height="5.34" fill="#000000"/>
    <rect y="5.33" width="24" height="5.34" fill="#DD0000"/>
    <rect y="10.66" width="24" height="5.34" fill="#FFCE00"/>`,

  // Singapore: crescent + 5 stars
  SG: `
    <rect width="24" height="8" fill="#EF3340"/>
    <rect y="8" width="24" height="8" fill="#FFFFFF"/>
    <circle cx="5" cy="4" r="2.6" fill="#FFFFFF"/>
    <circle cx="6.1" cy="4" r="2.5" fill="#EF3340"/>
    ${FLAG_STAR(8.2, 2.3, 0.55, '#FFFFFF')}
    ${FLAG_STAR(6.9, 3.3, 0.55, '#FFFFFF')}
    ${FLAG_STAR(9.5, 3.3, 0.55, '#FFFFFF')}
    ${FLAG_STAR(7.4, 4.9, 0.55, '#FFFFFF')}
    ${FLAG_STAR(9, 4.9, 0.55, '#FFFFFF')}`,

  // France
  FR: `
    <rect width="8" height="16" fill="#002395"/>
    <rect x="8" width="8" height="16" fill="#FFFFFF"/>
    <rect x="16" width="8" height="16" fill="#ED2939"/>`,

  // Saudi Arabia: green with Shahada (stylised) and sword
  SA: `
    <rect width="24" height="16" fill="#006C35"/>
    <path d="M6.5 6.2c1 .8 1.8-.6 2.8.2s1.8-.6 2.8.2 1.8-.6 2.8.2 1.8-.6 2.8.2" fill="none" stroke="#FFFFFF" stroke-width="0.7" stroke-linecap="round"/>
    <path d="M7 7.9h10" stroke="#FFFFFF" stroke-width="0.5" stroke-linecap="round"/>
    <path d="M6.5 10.6H17.2l.8-.5M7.6 10.1v1" stroke="#FFFFFF" stroke-width="0.6" stroke-linecap="round" fill="none"/>`,

  // New Zealand: Union Jack canton + 4 red stars outlined in white
  NZ: `
    <rect width="24" height="16" fill="#012169"/>
    ${FLAG_UNION_JACK(0, 0, 12, 8)}
    ${FLAG_STAR(18, 13, 1.2, '#C8102E', 'stroke="#FFFFFF" stroke-width="0.35"')}
    ${FLAG_STAR(18, 3.4, 1.1, '#C8102E', 'stroke="#FFFFFF" stroke-width="0.35"')}
    ${FLAG_STAR(15.4, 7.3, 1.05, '#C8102E', 'stroke="#FFFFFF" stroke-width="0.35"')}
    ${FLAG_STAR(20.8, 6.6, 0.95, '#C8102E', 'stroke="#FFFFFF" stroke-width="0.35"')}`,

  // Japan
  JP: `
    <rect width="24" height="16" fill="#FFFFFF"/>
    <circle cx="12" cy="8" r="4.8" fill="#BC002D"/>`,

  // Netherlands
  NL: `
    <rect width="24" height="5.34" fill="#AE1C28"/>
    <rect y="5.33" width="24" height="5.34" fill="#FFFFFF"/>
    <rect y="10.66" width="24" height="5.34" fill="#21468B"/>`,

  // Italy
  IT: `
    <rect width="8" height="16" fill="#009246"/>
    <rect x="8" width="8" height="16" fill="#FFFFFF"/>
    <rect x="16" width="8" height="16" fill="#CE2B37"/>`,

  // Malaysia: 14 stripes, blue canton, yellow crescent + 14-point star
  MY: (() => {
    const s = 16 / 14;
    let stripes = '';
    for (let i = 1; i < 14; i += 2) stripes += `<rect y="${(i * s).toFixed(3)}" width="24" height="${s.toFixed(3)}" fill="#FFFFFF"/>`;
    return `<rect width="24" height="16" fill="#CC0001"/>${stripes}
      <rect width="12" height="${(8 * s).toFixed(3)}" fill="#010066"/>
      <circle cx="4.4" cy="4.57" r="3" fill="#FFCC00"/>
      <circle cx="5.3" cy="4.57" r="2.5" fill="#010066"/>
      ${FLAG_STAR(8.6, 4.57, 1.9, '#FFCC00')}`;
  })(),

  // Ireland
  IE: `
    <rect width="8" height="16" fill="#169B62"/>
    <rect x="8" width="8" height="16" fill="#FFFFFF"/>
    <rect x="16" width="8" height="16" fill="#FF883E"/>`,

  // Spain: red / yellow (double) / red + simplified coat of arms
  ES: `
    <rect width="24" height="16" fill="#AA151B"/>
    <rect y="4" width="24" height="8" fill="#F1BF00"/>
    <rect x="5.2" y="5.8" width="2.6" height="3.4" rx="0.6" fill="#AA151B"/>
    <rect x="5.2" y="5.8" width="1.3" height="1.7" fill="#C8B100"/>
    <rect x="4.6" y="5.6" width="0.5" height="4" fill="#C8B100"/>
    <rect x="7.9" y="5.6" width="0.5" height="4" fill="#C8B100"/>`,

  // Qatar: maroon with 9-point white serrated band
  QA: (() => {
    const h = 16 / 9;
    let d = 'M0 0H6.4';
    for (let i = 0; i < 9; i++) d += `L9 ${(i * h + h / 2).toFixed(3)}L6.4 ${((i + 1) * h).toFixed(3)}`;
    d += 'H0Z';
    return `<rect width="24" height="16" fill="#8A1538"/><path d="${d}" fill="#FFFFFF"/>`;
  })(),

  // Kuwait: green / white / red + black trapezoid
  KW: `
    <rect width="24" height="5.34" fill="#007A3D"/>
    <rect y="5.33" width="24" height="5.34" fill="#FFFFFF"/>
    <rect y="10.66" width="24" height="5.34" fill="#CE1126"/>
    <polygon points="0,0 6,5.33 6,10.67 0,16" fill="#000000"/>`,

  // Oman: red hoist band, white / red / green, white emblem
  OM: `
    <rect width="24" height="16" fill="#DB161B"/>
    <rect x="6.5" width="17.5" height="5.34" fill="#FFFFFF"/>
    <rect x="6.5" y="10.66" width="17.5" height="5.34" fill="#008000"/>
    <path d="M1.8 1.6L4.6 4.4M4.6 1.6L1.8 4.4" stroke="#FFFFFF" stroke-width="0.55" stroke-linecap="round"/>
    <circle cx="3.2" cy="3" r="0.7" fill="#FFFFFF"/>`
};

function getFlagSvg(code) {
  const art = FLAG_ART[code] || `
    <rect width="24" height="16" fill="#E2E8F0"/>
    <circle cx="12" cy="8" r="4" fill="#94A3B8"/>`;
  return `<svg viewBox="0 0 24 16" class="flag-svg" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">${art}</svg>`;
}

// Global State
const appState = {
  activeTab: 'quote',
  currentTab: 'quote',
  packageType: 'document',
  selectedPackage: 'document',
  fromCountry: { code: 'IN', name: 'India', flagSvg: getFlagSvg('IN') },
  toCountry: { code: 'GB', name: 'United Kingdom', flagSvg: getFlagSvg('GB') },
  activeSelectingField: 'from', // 'from' or 'to'
  weight: '1',
  weightUnit: 'kg',
  error: '',
  isSubmitting: false,
  lastFocused: null
};

// Popular Worldwide Destinations
const supportedCountries = [
  { code: 'IN', name: 'India', zone: 'South Asia' },
  { code: 'US', name: 'United States', zone: 'North America' },
  { code: 'GB', name: 'United Kingdom', zone: 'Europe' },
  { code: 'CA', name: 'Canada', zone: 'North America' },
  { code: 'AE', name: 'United Arab Emirates', zone: 'Middle East' },
  { code: 'AU', name: 'Australia', zone: 'Oceania' },
  { code: 'DE', name: 'Germany', zone: 'Europe' },
  { code: 'SG', name: 'Singapore', zone: 'Southeast Asia' },
  { code: 'FR', name: 'France', zone: 'Europe' },
  { code: 'SA', name: 'Saudi Arabia', zone: 'Middle East' },
  { code: 'NZ', name: 'New Zealand', zone: 'Oceania' },
  { code: 'JP', name: 'Japan', zone: 'East Asia' },
  { code: 'NL', name: 'Netherlands', zone: 'Europe' },
  { code: 'IT', name: 'Italy', zone: 'Europe' },
  { code: 'MY', name: 'Malaysia', zone: 'Southeast Asia' },
  { code: 'IE', name: 'Ireland', zone: 'Europe' },
  { code: 'ES', name: 'Spain', zone: 'Europe' },
  { code: 'QA', name: 'Qatar', zone: 'Middle East' },
  { code: 'KW', name: 'Kuwait', zone: 'Middle East' },
  { code: 'OM', name: 'Oman', zone: 'Middle East' }
];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  applyUrlParamsToState();
  updateCountryUI();
  renderCountryDropdownList();
  renderDestinationsGrid();
  setupMobileNav();
  setupTabs();
  setupPackageRadiogroup();
  setupNavigation();
  setupSearch();
  setupNavbarShadow();
  setupScrollReveal();
  setupGlobalKeys();
  initDedicatedPage();

  window.addEventListener('popstate', () => {
    applyUrlParamsToState();
    updateCountryUI();
    refreshDedicatedPage();
  });
});

/* --------------------------------------------------------------------------
   Toast (non-blocking replacement for alert())
   -------------------------------------------------------------------------- */
let toastTimer = null;

function showToast(message, duration = 3800) {
  const toast = document.getElementById('toast') || document.getElementById('toastNotification');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* --------------------------------------------------------------------------
   Modals (shared open/close with focus return, Esc & scroll lock)
   -------------------------------------------------------------------------- */
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  appState.lastFocused = document.activeElement;
  modal.classList.add('active');
  document.body.classList.add('modal-open');

  // Focus first useful control once the dialog is visible
  setTimeout(() => {
    const candidates = modal.querySelectorAll('input:not([type="hidden"]), .rate-card, .country-option, .biz-item');
    const target = Array.from(candidates).find(el => el.offsetParent !== null);
    if (target) {
      target.focus();
    } else {
      // Focus the dialog itself (no visible ring) so keyboard users start inside it
      const dialog = modal.querySelector('.modal-card');
      dialog.setAttribute('tabindex', '-1');
      dialog.focus();
    }
  }, 60);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('active');

  if (!document.querySelector('.modal-overlay.active')) {
    document.body.classList.remove('modal-open');
  }
  if (appState.lastFocused && typeof appState.lastFocused.focus === 'function') {
    appState.lastFocused.focus();
  }
}

function setupGlobalKeys() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = document.querySelectorAll('.modal-overlay.active');
    if (open.length) {
      closeModal(open[open.length - 1].id);
      return;
    }
    if (document.querySelector('.nav-dropdown.open')) {
      const trigger = document.querySelector('.nav-dropdown.open .has-dropdown');
      closeAllDropdowns();
      if (trigger) trigger.focus();
      return;
    }
    closeMobileNav();
  });
}

/* --------------------------------------------------------------------------
   Booking card tabs
   -------------------------------------------------------------------------- */
function setupTabs() {
  const tabs = Array.from(document.querySelectorAll('.quote-tab'));

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => navigateTabRoute(tab.dataset.tab));

    // Arrow-key navigation between tabs (WAI-ARIA tabs pattern)
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) {
        e.preventDefault();
        next.focus();
        navigateTabRoute(next.dataset.tab);
      }
    });
  });
}

function navigateTabRoute(tabName) {
  switchMainTab(tabName);
  const pageType = document.body?.dataset?.page || '';
  const currentPath = (window.location.pathname.replace(/\/+$/, '') || '/').toLowerCase();

  if (tabName === 'quote') {
    if (currentPath === '/' || currentPath === '/index.html') {
      return;
    }
    if (pageType === 'quote') {
      renderDedicatedQuotePage();
      const stdForm = document.getElementById('standardQuoteSection');
      const ecomForm = document.getElementById('ecommerceServiceSection');
      const bulkForm = document.getElementById('bulkServiceSection');
      const targetSec = (ecomForm && !ecomForm.hidden) ? ecomForm : (bulkForm && !bulkForm.hidden) ? bulkForm : stdForm;
      if (targetSec) targetSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    window.location.href = buildQuoteUrl('/quote');
    return;
  }

  if (tabName === 'rates') {
    if (pageType === 'rates' || currentPath === '/rates' || currentPath === '/rates.html') {
      renderDedicatedRatesPage();
      return;
    }
    window.location.href = buildQuoteUrl('/rates');
    return;
  }

  if (tabName === 'track') {
    if (pageType === 'track' || currentPath === '/track' || currentPath === '/track.html') {
      const input = document.getElementById('trackingInput');
      if (input) input.focus();
      return;
    }
    window.location.href = buildQuoteUrl('/track');
    return;
  }

  if (tabName === 'pickup') {
    if (pageType === 'pickup' || currentPath === '/schedule-pickup' || currentPath === '/pickup' || currentPath === '/pickup.html') {
      const nameInput = document.getElementById('senderName');
      if (nameInput) nameInput.focus();
      return;
    }
    window.location.href = buildQuoteUrl('/schedule-pickup');
    return;
  }

  window.location.href = buildQuoteUrl('/');
}

/* --------------------------------------------------------------------------
   Main navigation: dropdowns, actions, active state
   -------------------------------------------------------------------------- */
const POPULAR_DESTINATIONS = ['US', 'GB', 'CA', 'AE', 'AU', 'DE', 'SG', 'SA'];

function setupNavigation() {
  const menu = document.getElementById('navMenu');
  if (!menu) return;

  renderNavCountries();

  // Dropdown triggers: click to toggle (works for touch, keyboard and mobile accordion)
  menu.querySelectorAll('.nav-dropdown > .has-dropdown').forEach(trigger => {
    const dropdown = trigger.parentElement;

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const willOpen = !dropdown.classList.contains('open');
      closeAllDropdowns(willOpen ? dropdown : null);
      setDropdown(dropdown, willOpen);
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        closeAllDropdowns(dropdown);
        setDropdown(dropdown, true);
        const first = dropdown.querySelector('.dropdown-panel a, .dropdown-panel button');
        if (first) first.focus();
      }
    });

    // Desktop hover keeps aria-expanded in sync with what the user sees
    dropdown.addEventListener('mouseenter', () => {
      if (isDesktopNav()) {
        closeAllDropdowns(dropdown);
        setDropdown(dropdown, true);
      }
    });
    dropdown.addEventListener('mouseleave', () => {
      if (isDesktopNav()) setDropdown(dropdown, false);
    });

    // Arrow keys and activation inside a panel
    dropdown.querySelector('.dropdown-panel').addEventListener('keydown', (e) => {
      const items = Array.from(dropdown.querySelectorAll('.dropdown-panel a, .dropdown-panel button'));
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(i + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (e.key === ' ' && document.activeElement && dropdown.contains(document.activeElement)) {
        e.preventDefault();
        document.activeElement.click();
      }
    });
  });

  // Every actionable link inside the menu
  menu.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link || !menu.contains(link)) return;

    const { tab, service, modal, country, help, helpPage } = link.dataset;
    const nav = link.dataset.nav;

    closeAllDropdowns();
    closeMobileNav();

    if (nav === 'home') {
      const homeEl = document.getElementById('home');
      if (homeEl) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setActiveNav('home');
      } else {
        e.preventDefault();
        window.location.href = '/';
      }
    } else if (tab) {
      e.preventDefault();
      goToTab(tab);
    } else if (service) {
      e.preventDefault();
      e.stopPropagation();
      navigateToServicePage(service);
    } else if (helpPage || help) {
      e.preventDefault();
      e.stopPropagation();
      navigateToHelpPage(helpPage || help);
    } else if (country) {
      e.preventDefault();
      const c = supportedCountries.find(x => x.code === country);
      if (c) {
        appState.toCountry = { code: c.code, name: c.name, flagSvg: getFlagSvg(c.code) };
        updateCountryUI();
        if (document.getElementById('ship')) {
          goToTab('quote');
          showToast(`Destination set to ${c.name}`);
        } else {
          window.location.href = buildQuoteUrl();
        }
      }
    } else if (modal) {
      e.preventDefault();
      openModal(modal);
      if (help) scrollHelpTo(help);
    }
  });

  // Close dropdowns when clicking anywhere else
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown')) closeAllDropdowns();
  });

  setupScrollSpy();
}

function isDesktopNav() {
  return window.matchMedia('(min-width: 1241px) and (hover: hover)').matches;
}

function setDropdown(dropdown, open) {
  dropdown.classList.toggle('open', open);
  const trigger = dropdown.querySelector('.has-dropdown');
  if (trigger) trigger.setAttribute('aria-expanded', String(open));
}

function closeAllDropdowns(except = null) {
  document.querySelectorAll('.nav-dropdown.open').forEach(d => {
    if (d !== except) setDropdown(d, false);
  });
}

function renderNavCountries() {
  const grid = document.getElementById('navCountries');
  if (!grid) return;
  grid.innerHTML = POPULAR_DESTINATIONS.map(code => {
    const c = supportedCountries.find(x => x.code === code);
    return `<a href="#ship" class="dd-country" data-country="${c.code}">
      <span class="flag-icon">${getFlagSvg(c.code)}</span>
      <span>${c.name}</span>
    </a>`;
  }).join('');
}

// Open a booking tab and navigate to its dedicated page
function goToTab(tab) {
  navigateTabRoute(tab);
}

function highlightServiceCard(service) {
  const cards = document.querySelectorAll('.service-card');
  const order = ['document', 'parcel', 'medicine', 'ecommerce', 'bulk'];
  const card = cards[order.indexOf(service)];
  if (!card) return;
  card.classList.add('is-highlighted');
  setTimeout(() => card.classList.remove('is-highlighted'), 2200);
}

function scrollHelpTo(section) {
  setTimeout(() => {
    const target = document.getElementById(`help-${section}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);
}

function setActiveNav(key) {
  document.querySelectorAll('#navMenu > .nav-item, #navMenu > .nav-dropdown').forEach(el => {
    const isActive = el.dataset.nav === key;
    const item = el.classList.contains('nav-dropdown') ? el.querySelector('.nav-item') : el;
    item.classList.toggle('active', isActive);
    if (isActive) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

// Highlight Home / Services while scrolling
function setupScrollSpy() {
  if (!('IntersectionObserver' in window)) return;
  const sections = [
    { el: document.getElementById('home'), key: 'home' },
    { el: document.getElementById('services'), key: 'services' }
  ].filter(s => s.el);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const match = sections.find(s => s.el === entry.target);
      if (!match) return;
      // In the hero, reflect the booking tab in use (Track / Rates / Ship)
      if (match.key === 'home') {
        const tabNav = { quote: 'home', pickup: 'ship', track: 'track', rates: 'rates' };
        setActiveNav(tabNav[appState.currentTab] || 'home');
        return;
      }
      setActiveNav(match.key);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach(s => observer.observe(s.el));
}

// Switch Main Booking Card Tabs
function switchMainTab(tabName) {
  appState.activeTab = tabName;
  appState.currentTab = tabName;

  const panes = {
    quote: 'tabQuote',
    track: 'tabTrack',
    pickup: 'tabPickup',
    rates: 'tabRates'
  };

  document.querySelectorAll('.quote-tab').forEach(t => {
    const isActive = t.dataset.tab === tabName;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', String(isActive));
    t.tabIndex = isActive ? 0 : -1;
    if (isActive) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  Object.entries(panes).forEach(([key, id]) => {
    const pane = document.getElementById(id);
    if (!pane) return;
    const isActive = key === tabName;
    pane.classList.toggle('active', isActive);
    pane.hidden = !isActive;
  });

  // Keep the navbar highlight in sync with the booking tab
  const tabNav = { quote: 'home', pickup: 'ship', track: 'track', rates: 'rates' };
  setActiveNav(tabNav[tabName] || 'home');
}

/* --------------------------------------------------------------------------
   Quote form controls
   -------------------------------------------------------------------------- */
// Select Package Type in Quote Form
function selectPackageType(type, buttonElement, shouldNavigate = true) {
  const normalizedType = String(type || 'document').toLowerCase();
  appState.packageType = normalizedType;
  appState.selectedPackage = normalizedType;
  document.querySelectorAll('.pkg-btn').forEach(btn => {
    const isMatch = btn === buttonElement || (!buttonElement && btn.dataset.type === normalizedType);
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-checked', String(isMatch));
    btn.tabIndex = isMatch ? 0 : -1;
  });

  if (shouldNavigate) {
    const targetUrl = buildQuoteUrl('/quote');
    window.location.href = targetUrl;
    return;
  }

  if (typeof refreshDedicatedPage === 'function') refreshDedicatedPage();
}

function setupPackageRadiogroup() {
  const buttons = Array.from(document.querySelectorAll('.pkg-btn'));
  if (!buttons.length) return;
  buttons.forEach((btn, idx) => {
    const isChecked = btn.classList.contains('active');
    btn.tabIndex = isChecked ? 0 : -1;
    btn.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = buttons[(idx + 1) % buttons.length];
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = buttons[(idx - 1 + buttons.length) % buttons.length];
      }
      if (next) {
        e.preventDefault();
        next.focus();
        selectPackageType(next.dataset.type, next, true);
      }
    });
  });
}

// Swap Origin & Destination
function swapCountries() {
  const temp = appState.fromCountry;
  appState.fromCountry = appState.toCountry;
  appState.toCountry = temp;
  updateCountryUI();

  const btn = document.querySelector('.swap-btn');
  if (btn) btn.classList.toggle('is-spinning');
  if (typeof refreshDedicatedPage === 'function') refreshDedicatedPage();
}

function updateCountryUI() {
  const fromFlag = document.getElementById('fromFlag');
  const fromName = document.getElementById('fromCountryName');
  const toFlag = document.getElementById('toFlag');
  const toName = document.getElementById('toCountryName');

  if (fromFlag) fromFlag.innerHTML = appState.fromCountry.flagSvg;
  if (fromName) fromName.textContent = appState.fromCountry.name;
  if (toFlag) toFlag.innerHTML = appState.toCountry.flagSvg;
  if (toName) toName.textContent = appState.toCountry.name;
}

function setQuoteInlineError(message = '') {
  appState.error = message;
  const weightInput = document.getElementById('weightInput');
  const weightBox = weightInput ? weightInput.closest('.weight-input-box') : null;
  let errorEl = document.getElementById('quoteFormError');

  if (!errorEl) {
    const tabQuote = document.getElementById('tabQuote');
    if (tabQuote) {
      errorEl = document.createElement('p');
      errorEl.id = 'quoteFormError';
      errorEl.className = 'quote-inline-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.setAttribute('aria-live', 'polite');
      tabQuote.appendChild(errorEl);
    }
  }

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  if (weightInput) {
    if (message) weightInput.setAttribute('aria-invalid', 'true');
    else weightInput.removeAttribute('aria-invalid');
  }

  if (weightBox) {
    weightBox.classList.toggle('has-error', Boolean(message));
  }
}

function handleWeightInput(rawValue) {
  appState.weight = String(rawValue).trim();
  const num = Number(appState.weight);
  if (appState.weight !== '' && Number.isFinite(num) && num > 0) {
    setQuoteInlineError('');
  }
  if (typeof refreshDedicatedPage === 'function') refreshDedicatedPage();
}

// Toggle lb <-> kg without silently converting the numeric weight
function toggleWeightUnit() {
  appState.weightUnit = appState.weightUnit === 'lb' ? 'kg' : 'lb';
  const unitEl = document.getElementById('currentWeightUnit');
  if (unitEl) unitEl.textContent = appState.weightUnit;
  if (typeof refreshDedicatedPage === 'function') refreshDedicatedPage();
}

/* --------------------------------------------------------------------------
   Country picker
   -------------------------------------------------------------------------- */
// Open Country Selector Modal
function toggleCountryDropdown(field) {
  appState.activeSelectingField = field;
  document.getElementById('countryModalTitle').textContent =
    field === 'from' ? 'Select Origin Country' : 'Select Destination Country';
  document.getElementById('countrySearchInput').value = '';
  renderCountryDropdownList();
  openModal('countryDropdownModal');
}

// Render Supported Countries List
function renderCountryDropdownList(filter = '') {
  const list = document.getElementById('countryList');
  if (!list) return;
  list.innerHTML = '';

  const query = filter.trim().toLowerCase();
  const current = appState.activeSelectingField === 'from' ? appState.fromCountry : appState.toCountry;

  const filtered = supportedCountries.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.code.toLowerCase().includes(query) ||
    c.zone.toLowerCase().includes(query)
  );

  if (!filtered.length) {
    list.innerHTML = `<p class="country-empty">No countries match "${escapeHtml(filter)}"</p>`;
    return;
  }

  filtered.forEach(country => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'country-option' + (current && current.code === country.code ? ' is-selected' : '');
    item.innerHTML = `
      <span class="flag-icon">${getFlagSvg(country.code)}</span>
      <span class="country-name">${country.name}</span>
      <span class="country-code">${country.zone}</span>
    `;
    item.addEventListener('click', () => selectCountry(country));
    list.appendChild(item);
  });
}

function filterCountries() {
  renderCountryDropdownList(document.getElementById('countrySearchInput').value);
}

function selectCountry(country) {
  const countryObj = {
    code: country.code,
    name: country.name,
    flagSvg: getFlagSvg(country.code)
  };

  if (appState.activeSelectingField === 'from') {
    appState.fromCountry = countryObj;
  } else {
    appState.toCountry = countryObj;
  }
  updateCountryUI();
  closeModal('countryDropdownModal');
  if (typeof refreshDedicatedPage === 'function') refreshDedicatedPage();
}

/* --------------------------------------------------------------------------
   URL Parameters, Page Navigation & Sharing
   -------------------------------------------------------------------------- */
function findCountryByNameOrCode(val) {
  if (!val) return null;
  const q = val.trim().toLowerCase();
  return supportedCountries.find(
    c => c.name.toLowerCase() === q || c.code.toLowerCase() === q
  ) || null;
}

function applyUrlParamsToState() {
  const params = new URLSearchParams(window.location.search);

  const fromParam = params.get('from');
  if (fromParam) {
    const c = findCountryByNameOrCode(fromParam);
    if (c) appState.fromCountry = { code: c.code, name: c.name, flagSvg: getFlagSvg(c.code) };
  }

  const toParam = params.get('to');
  if (toParam) {
    const c = findCountryByNameOrCode(toParam);
    if (c) appState.toCountry = { code: c.code, name: c.name, flagSvg: getFlagSvg(c.code) };
  }

  const pathSlug = (window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
  const pathServiceMap = {
    '/medicine-courier': 'medicine',
    '/medicine': 'medicine',
    '/ecommerce-logistics': 'ecommerce',
    '/ecommerce': 'ecommerce',
    '/bulk-commercial': 'bulk',
    '/bulk': 'bulk',
    '/document-courier': 'document',
    '/parcel-shipping': 'parcel'
  };

  const pkg = params.get('type') || params.get('pkg') || pathServiceMap[pathSlug];
  if (pkg && ['document', 'parcel', 'medicine', 'other', 'ecommerce', 'bulk'].includes(pkg.toLowerCase())) {
    appState.packageType = pkg.toLowerCase();
    appState.selectedPackage = pkg.toLowerCase();
    const pkgBtn = document.querySelector(`.pkg-btn[data-type="${appState.selectedPackage}"]`);
    selectPackageType(appState.selectedPackage, pkgBtn, false);
  }

  const rawWeight = params.get('weight');
  const explicitUnit = params.get('unit');
  if (rawWeight) {
    const match = rawWeight.trim().match(/^([0-9]*\.?[0-9]+)\s*(lb|kg)?$/i);
    if (match) {
      const parsedNum = parseFloat(match[1]);
      const parsedUnit = (match[2] || explicitUnit || appState.weightUnit || 'kg').toLowerCase();
      if (Number.isFinite(parsedNum) && parsedNum > 0) {
        appState.weight = String(parsedNum);
        const weightInput = document.getElementById('weightInput');
        if (weightInput) weightInput.value = appState.weight;
      }
      if (parsedUnit === 'lb' || parsedUnit === 'kg') {
        appState.weightUnit = parsedUnit;
        const unitEl = document.getElementById('currentWeightUnit');
        if (unitEl) unitEl.textContent = parsedUnit;
      }
    }
  } else if (explicitUnit && (explicitUnit === 'kg' || explicitUnit === 'lb')) {
    appState.weightUnit = explicitUnit;
    const unitEl = document.getElementById('currentWeightUnit');
    if (unitEl) unitEl.textContent = explicitUnit;
  }

  const awb = params.get('awb');
  if (awb) {
    const trackingInput = document.getElementById('trackingInput');
    if (trackingInput) trackingInput.value = awb;
  }

  const address = params.get('address');
  if (address) {
    const addrInput = document.getElementById('pickupAddress');
    if (addrInput) addrInput.value = address;
  }

  const slot = params.get('slot');
  if (slot) {
    const slotInput = document.getElementById('pickupSlot');
    if (slotInput) slotInput.value = slot;
  }

  const tab = params.get('tab');
  if (tab && ['quote', 'track', 'pickup', 'rates'].includes(tab)) {
    setTimeout(() => switchMainTab(tab), 20);
  }
}

function buildQuoteUrl(page = '/quote') {
  const weightInput = document.getElementById('weightInput');
  const rawWeight = weightInput ? String(weightInput.value).trim() : String(appState.weight || '1').trim();
  const cleanNumeric = rawWeight.replace(/(lb|kg)$/i, '').trim() || '1';
  const unit = appState.weightUnit || 'kg';
  const pkgType = appState.selectedPackage || appState.packageType || 'document';

  const query = [
    `from=${encodeURIComponent(appState.fromCountry.name)}`,
    `to=${encodeURIComponent(appState.toCountry.name)}`,
    `type=${encodeURIComponent(pkgType)}`,
    `weight=${encodeURIComponent(cleanNumeric)}`,
    `unit=${encodeURIComponent(unit)}`
  ].join('&');
  return `${page}?${query}`;
}

const PACKAGE_WEIGHT_LIMITS_KG = {
  document: 5,
  parcel: 70,
  medicine: 70,
  ecommerce: 70,
  bulk: 5000,
  other: 100
};

function validateQuoteInputs() {
  const weightInput = document.getElementById('weightInput');
  const rawVal = weightInput ? String(weightInput.value).trim() : String(appState.weight).trim();
  const numVal = Number(rawVal);
  const pkgType = (appState.selectedPackage || appState.packageType || 'document').toLowerCase();

  if (!appState.fromCountry || !appState.fromCountry.name) {
    return { valid: false, error: 'Please select an origin country.' };
  }
  if (!appState.toCountry || !appState.toCountry.name) {
    return { valid: false, error: 'Please select a destination country.' };
  }
  if (appState.fromCountry.name.toLowerCase() === appState.toCountry.name.toLowerCase()) {
    return {
      valid: false,
      error: `Origin and destination cannot both be ${appState.fromCountry.name}. Please select two different countries.`
    };
  }
  if (!['document', 'parcel', 'medicine', 'ecommerce', 'bulk', 'other'].includes(pkgType)) {
    return { valid: false, error: 'Please select a valid package type.' };
  }
  if (rawVal === '' || !Number.isFinite(numVal) || isNaN(numVal) || numVal <= 0) {
    return { valid: false, error: 'Please enter a valid positive numeric weight greater than 0.' };
  }
  if (!['lb', 'kg'].includes(appState.weightUnit)) {
    return { valid: false, error: 'Please select a valid weight unit (lb or kg).' };
  }

  const actualKg = appState.weightUnit === 'lb' ? +(numVal * 0.453592).toFixed(2) : numVal;
  const maxKg = PACKAGE_WEIGHT_LIMITS_KG[pkgType] || 70;
  const maxLb = +(maxKg * 2.20462).toFixed(1);
  if (actualKg > maxKg) {
    const pkgLabel = (PACKAGE_TYPE_CONFIG[pkgType] && PACKAGE_TYPE_CONFIG[pkgType].label) || pkgType;
    return {
      valid: false,
      error: `${pkgLabel} shipments support up to ${maxKg} kg (${maxLb} lb). Please enter a lower weight or switch to Parcel / Bulk & Cargo.`
    };
  }

  appState.weight = String(numVal);
  return { valid: true, error: '' };
}

function navigateToQuotePage() {
  if (appState.isSubmitting) return;

  const check = validateQuoteInputs();
  if (!check.valid) {
    setQuoteInlineError(check.error);
    const weightInput = document.getElementById('weightInput');
    if (weightInput) weightInput.focus();
    return;
  }

  setQuoteInlineError('');
  appState.isSubmitting = true;
  const submitBtn = document.querySelector('#tabQuote .btn-quote');
  if (submitBtn) submitBtn.disabled = true;

  window.location.href = buildQuoteUrl('/quote');
}

function navigateToTrackPage() {
  const input = document.getElementById('trackingInput');
  const awb = (input && input.value.trim()) || '';
  if (awb) {
    window.location.href = `/track?awb=${encodeURIComponent(awb)}`;
  } else {
    window.location.href = '/track';
  }
}

function navigateToPickupPage() {
  const addrEl = document.getElementById('pickupAddress');
  const slotEl = document.getElementById('pickupSlot');
  const address = (addrEl && addrEl.value.trim()) || '';
  const slot = (slotEl && slotEl.value.trim()) || '';
  const base = buildQuoteUrl('/schedule-pickup');
  const extra = [];
  if (address) extra.push(`address=${encodeURIComponent(address)}`);
  if (slot) extra.push(`slot=${encodeURIComponent(slot)}`);
  window.location.href = extra.length ? `${base}&${extra.join('&')}` : base;
}

function navigateToRatesPage() {
  window.location.href = buildQuoteUrl('/rates');
}

const PACKAGE_TYPE_CONFIG = {
  document: {
    label: 'Document',
    serviceName: 'Document Courier',
    badge: 'Document Courier Service',
    pageTitle: 'Document Courier — International Shipping Quote | TRISYS EXPRESS',
    heading: 'Document Shipping Quote',
    subtitle: 'International courier handling for legal contracts, academic transcripts, certificates, and business correspondence.',
    checklist: [
      'Accepted items: Printed documents, certificates, contracts, academic records, and non-negotiable papers.',
      'Packaging standard: Tamper-evident, moisture-resistant Trisys Express document envelope.',
      'Customs requirement: Non-commercial document declaration (no commercial invoice required for paper-only envelopes).'
    ]
  },
  parcel: {
    label: 'Parcel',
    serviceName: 'Parcel Shipping',
    badge: 'International Parcel Shipping',
    pageTitle: 'Parcel Shipping — International Shipping Quote | TRISYS EXPRESS',
    heading: 'Parcel Shipping Quote',
    subtitle: 'Door-to-door international parcel shipping for personal gifts, apparel, retail goods, and commercial samples.',
    checklist: [
      'Accepted items: Apparel, personal gifts, boxed merchandise, electronics (subject to IATA battery rules), and household goods.',
      'Packaging standard: Double-walled corrugated box with internal cushioning and sealed seams.',
      'Customs requirement: Itemized packing list, shipper KYC ID, and proforma/commercial invoice.'
    ]
  },
  medicine: {
    label: 'Medicine',
    serviceName: 'Medicine Courier',
    badge: 'Compliant Prescription Shipping',
    pageTitle: 'Medicine Courier — Compliant Prescription Shipping | TRISYS EXPRESS',
    heading: 'Medicine Shipping Quote',
    subtitle: 'Compliant international pharmaceutical courier for prescription medications and personal healthcare supplies.',
    checklist: [
      'Accepted items: Licensed allopathic, ayurvedic, and homeopathic prescription medications for personal use.',
      'Documentation required: Valid doctor prescription, original pharmacy bill with batch/expiry, and shipper KYC.',
      'Packaging standard: Insulated protective packaging for temperature-sensitive or fragile blister/bottle packs.'
    ]
  },
  ecommerce: {
    label: 'E-commerce Logistics',
    serviceName: 'E-commerce Logistics',
    badge: 'Cross-Border Store Fulfilment',
    pageTitle: 'E-commerce Logistics — Cross-Border Store Fulfilment | TRISYS EXPRESS',
    heading: 'E-commerce Logistics & Cross-Border Store Fulfilment',
    subtitle: 'End-to-end cross-border parcel shipping, D2C store fulfilment, CSB-V export clearance, and international returns for online brands.',
    checklist: [
      'Supported store channels: Shopify, WooCommerce, Amazon Global, eBay, custom storefronts, and CSV bulk order manifests.',
      'Export clearance: CSB-IV and CSB-V commercial export filing with LUT/GST zero-rated invoice support and DDU/DDP delivery options.',
      'Chargeable weight rule: Calculated as the greater of actual scale weight or volumetric weight (Length × Width × Height cm ÷ 5000).'
    ]
  },
  bulk: {
    label: 'Bulk & Commercial',
    serviceName: 'Bulk & Commercial',
    badge: 'B2B Cargo & Pallets',
    pageTitle: 'Bulk & Commercial — B2B Cargo & Pallets | TRISYS EXPRESS',
    heading: 'Bulk & Commercial B2B Cargo & Pallet Shipping',
    subtitle: 'Custom B2B air and sea-air freight solutions for palletized commercial cargo, master cartons, industrial equipment, and wholesale exports.',
    checklist: [
      'Accepted freight: Euro/standard pallets, skids, wooden crates, master cartons, machinery, textiles, and commercial consignments.',
      'Commercial customs brokerage: Complete IEC, AD Code, Commercial Invoice, Packing List, Certificate of Origin, and Shipping Bill handling.',
      'Equipment & handling: Forklift/tail-lift pickup, stackable/non-stackable pallet transport, and EXW/FOB/DAP/DDP Incoterms support.'
    ]
  },
  other: {
    label: 'Other',
    serviceName: 'Specialized Cargo',
    badge: 'Specialized & Custom Cargo',
    pageTitle: 'Specialized & Custom Cargo Quote | TRISYS EXPRESS',
    heading: 'Specialized & Custom Cargo Quote',
    subtitle: 'Custom international logistics for oversized items, excess baggage, unaccompanied luggage, and specialized shipments.',
    checklist: [
      'Accepted items: Excess baggage, musical instruments, sports gear, artwork, and multi-box household relocations.',
      'Dimensional check: Volumetric weight is evaluated alongside actual scale weight for oversized cartons.',
      'Customs requirement: Detailed contents declaration and destination-specific import clearance documentation.'
    ]
  }
};

function getShareablePageUrl() {
  const baseOrigin = (appState.publicBaseUrl || window.location.origin || '').replace(/\/+$/, '');
  const pathAndSearch = `${window.location.pathname || '/'}${window.location.search || ''}`;
  return `${baseOrigin}${pathAndSearch}`;
}

async function fetchBackendRuntimeConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json().catch(() => null);
    if (res.ok && data && data.ok) {
      if (data.publicBaseUrl) {
        appState.publicBaseUrl = String(data.publicBaseUrl).replace(/\/+$/, '');
      }
      appState.carrierRateApiConfigured = Boolean(data.carrierRateApiConfigured);
      appState.carrierTrackingApiConfigured = Boolean(data.carrierTrackingApiConfigured);
      const shareInput = document.getElementById('shareUrlInput');
      if (shareInput) shareInput.value = getShareablePageUrl();
    }
  } catch (_) {
    // Non-blocking config lookup
  }
}

async function shareCurrentPageLink(customTitle, customText) {
  const shareUrl = getShareablePageUrl();
  const shareInput = document.getElementById('shareUrlInput');
  if (shareInput) shareInput.value = shareUrl;

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied successfully');
      return;
    }
  } catch (_) {
    // Fallback to input selection copy below
  }

  if (shareInput) {
    try {
      shareInput.focus();
      shareInput.select();
      const copied = document.execCommand('copy');
      if (copied) {
        showToast('Link copied successfully');
        return;
      }
    } catch (_) {
      // Fall through to error message
    }
  }

  showToast('Unable to copy link automatically — please select and copy the URL from the Shareable Link field.');
}

function shareViaWhatsApp() {
  const shareUrl = getShareablePageUrl();
  const pkgLabel = (PACKAGE_TYPE_CONFIG[appState.selectedPackage] && PACKAGE_TYPE_CONFIG[appState.selectedPackage].label) || 'Document';
  const summary = `Trisys Express Shipping (${appState.fromCountry.name} to ${appState.toCountry.name} • ${pkgLabel} • ${appState.weight} ${appState.weightUnit}): ${shareUrl}`;
  const text = encodeURIComponent(summary);
  window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
}

function shareViaEmail() {
  const shareUrl = getShareablePageUrl();
  const pkgLabel = (PACKAGE_TYPE_CONFIG[appState.selectedPackage] && PACKAGE_TYPE_CONFIG[appState.selectedPackage].label) || 'Document';
  const subject = encodeURIComponent(
    `${document.title || 'Trisys Express Shipping'} (${appState.fromCountry.name} to ${appState.toCountry.name})`
  );
  const body = encodeURIComponent(
    `Here are the shipping details from Trisys Express:\n\nRoute: ${appState.fromCountry.name} to ${appState.toCountry.name}\nService / Package Type: ${pkgLabel}\nWeight: ${appState.weight} ${appState.weightUnit}\n\nShareable Link:\n${shareUrl}`
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function syncUrlWithCurrentForm() {
  const currentPath = window.location.pathname || '/quote';
  const url = buildQuoteUrl(currentPath);
  window.history.replaceState({}, '', url);
  const shareInput = document.getElementById('shareUrlInput');
  if (shareInput) shareInput.value = getShareablePageUrl();
}

function initDedicatedPage() {
  fetchBackendRuntimeConfig();
  const pageType = document.body.dataset.page;
  if (!pageType) return;

  const shareInput = document.getElementById('shareUrlInput');
  if (shareInput) shareInput.value = getShareablePageUrl();

  // Ensure the correct top widget tab is marked active on direct load / refresh
  const pageToTab = { quote: 'quote', track: 'track', pickup: 'pickup', rates: 'rates' };
  const activeTab = pageToTab[pageType] || 'quote';
  document.querySelectorAll('.quote-tab').forEach(t => {
    const isMatch = t.dataset.tab === activeTab;
    t.classList.toggle('active', isMatch);
    t.setAttribute('aria-selected', String(isMatch));
  });

  if (pageType === 'quote') {
    renderDedicatedQuotePage();
  } else if (pageType === 'track') {
    renderDedicatedTrackPage();
  } else if (pageType === 'pickup') {
    renderDedicatedPickupPage();
  } else if (pageType === 'rates') {
    renderDedicatedRatesPage();
  } else if (pageType === 'business') {
    renderDedicatedBusinessPage();
  } else if (pageType === 'help') {
    renderDedicatedHelpPage();
  }
}

function refreshDedicatedPage() {
  const pageType = document.body.dataset.page;
  if (pageType === 'quote') renderDedicatedQuotePage();
  if (pageType === 'rates') renderDedicatedRatesPage();
  if (pageType === 'pickup') renderDedicatedPickupPage();
  if (pageType === 'business') renderDedicatedBusinessPage();
  if (pageType === 'help') renderDedicatedHelpPage();
}

function renderDedicatedQuotePage() {
  const weightInput = document.getElementById('weightInput');
  const weight = weightInput && parseFloat(weightInput.value) > 0 ? parseFloat(weightInput.value) : parseFloat(appState.weight) || 1;
  const unit = appState.weightUnit || 'kg';
  const pkgType = (appState.selectedPackage || appState.packageType || 'document').toLowerCase();
  const from = appState.fromCountry;
  const to = appState.toCountry;
  const pkgInfo = PACKAGE_TYPE_CONFIG[pkgType] || PACKAGE_TYPE_CONFIG.document;
  const pkgName = pkgInfo.label;

  syncUrlWithCurrentForm();

  if (pkgInfo.pageTitle) {
    document.title = pkgInfo.pageTitle;
  }

  const breadcrumbCurrent = document.getElementById('subpageBreadcrumbCurrent');
  if (breadcrumbCurrent) {
    breadcrumbCurrent.textContent = pkgInfo.serviceName || pkgInfo.heading;
  }

  const badgeEl = document.getElementById('quotePackageBadge');
  if (badgeEl) {
    badgeEl.textContent = pkgInfo.badge || 'Package-Specific Quote Request';
  }

  const headingEl = document.getElementById('quotePackageHeading');
  if (headingEl) headingEl.textContent = pkgInfo.heading;

  const subtitleEl = document.getElementById('quotePackageSubtitle');
  if (subtitleEl) subtitleEl.textContent = pkgInfo.subtitle;

  // Highlight active service item inside the Services dropdown
  setActiveNav('services');
  document.querySelectorAll('#dd-services .dropdown-link').forEach(link => {
    const isSelected = link.dataset.service === pkgType;
    link.classList.toggle('active', isSelected);
    if (isSelected) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  // Ensure package type radio button on the page reflects pkgType
  document.querySelectorAll('.pkg-btn').forEach(btn => {
    const isMatch = btn.dataset.type === pkgType;
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-checked', String(isMatch));
    btn.tabIndex = isMatch ? 0 : -1;
  });

  const routeTitle = document.getElementById('quotePageRouteTitle');
  if (routeTitle) {
    routeTitle.innerHTML = `
      <span class="route-pill"><span class="flag-icon">${from.flagSvg}</span> ${escapeHtml(from.name)}</span>
      <span class="route-arrow">➔</span>
      <span class="route-pill"><span class="flag-icon">${to.flagSvg}</span> ${escapeHtml(to.name)}</span>
    `;
  }

  const metaSummary = document.getElementById('quotePageMeta');
  if (metaSummary) {
    metaSummary.textContent = `Service: ${pkgInfo.serviceName || pkgName} • Weight: ${weight} ${unit} • Route: ${from.name} to ${to.name}`;
  }

  const detailsBox = document.getElementById('submittedQuoteDetails');
  if (detailsBox) {
    detailsBox.innerHTML = `
      <div class="summary-row"><span>From Country</span><strong>${escapeHtml(from.name)} (${escapeHtml(from.code)})</strong></div>
      <div class="summary-row"><span>To Country</span><strong>${escapeHtml(to.name)} (${escapeHtml(to.code)})</strong></div>
      <div class="summary-row"><span>Selected Service / Package Type</span><strong>${escapeHtml(pkgName)} (${escapeHtml(pkgType)})</strong></div>
      <div class="summary-row"><span>Entered Weight</span><strong>${escapeHtml(String(weight))}</strong></div>
      <div class="summary-row"><span>Weight Unit</span><strong>${escapeHtml(unit)}</strong></div>
    `;
  }

  const checklistBox = document.getElementById('packageSpecificChecklist');
  if (checklistBox) {
    checklistBox.innerHTML = pkgInfo.checklist
      .map(item => `<li><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="M4 10l4 4 8-8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${escapeHtml(item)}</li>`)
      .join('');
  }

  // Toggle and populate dedicated service sections for E-commerce Logistics, Bulk & Commercial, and Standard Quote
  const ecomSection = document.getElementById('ecommerceServiceSection');
  const bulkSection = document.getElementById('bulkServiceSection');
  const stdSection = document.getElementById('standardQuoteSection');

  if (ecomSection) {
    const showEcom = pkgType === 'ecommerce';
    ecomSection.hidden = !showEcom;
    if (showEcom) {
      const originInput = document.getElementById('ecomOriginCountry');
      const destInput = document.getElementById('ecomDestCountry');
      const weightField = document.getElementById('ecomWeight');
      const unitField = document.getElementById('ecomWeightUnit');
      if (originInput) originInput.value = from.name;
      if (destInput) destInput.value = to.name;
      if (weightField) weightField.value = String(weight);
      if (unitField) unitField.value = unit;
      updateEcommerceEstimateSummary();
    }
  }

  if (bulkSection) {
    const showBulk = pkgType === 'bulk';
    bulkSection.hidden = !showBulk;
    if (showBulk) {
      const originInput = document.getElementById('bulkOriginCountry');
      const destInput = document.getElementById('bulkDestCountry');
      const weightField = document.getElementById('bulkTotalWeight');
      const unitField = document.getElementById('bulkWeightUnit');
      if (originInput) originInput.value = from.name;
      if (destInput) destInput.value = to.name;
      if (weightField) weightField.value = String(weight);
      if (unitField) unitField.value = unit;
      updateBulkEstimateSummary();
    }
  }

  if (stdSection) {
    const showStd = pkgType !== 'ecommerce' && pkgType !== 'bulk';
    stdSection.hidden = !showStd;
    if (showStd) {
      const formBadge = document.getElementById('stdQuoteFormBadge');
      const formHeading = document.getElementById('stdQuoteFormHeading');
      const medRow = document.getElementById('stdQuoteMedicineComplianceRow');
      const dimRow = document.getElementById('stdQuoteDimensionsRow');
      if (formBadge) formBadge.textContent = pkgInfo.badge || 'Verified Shipping Quote';
      if (formHeading) formHeading.textContent = `Request Verified ${pkgName} Quote`;
      if (medRow) medRow.hidden = pkgType !== 'medicine';
      if (dimRow) dimRow.hidden = pkgType === 'document';
      updateStandardQuoteCalcSummary();
    }
  }

  const pickupLinks = document.querySelectorAll('.js-proceed-pickup-link');
  pickupLinks.forEach(link => {
    link.href = buildQuoteUrl('/schedule-pickup');
  });

  const ratesLinks = document.querySelectorAll('.js-compare-rates-link');
  ratesLinks.forEach(link => {
    link.href = buildQuoteUrl('/rates');
  });
}

async function handleUpdateQuoteParameters() {
  const errEl = document.getElementById('quoteSubpageFormError');
  const check = validateQuoteInputs();
  if (!check.valid) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = check.error;
    }
    const weightInput = document.getElementById('weightInput');
    if (weightInput) weightInput.focus();
    return;
  }
  if (errEl) {
    errEl.hidden = true;
    errEl.textContent = '';
  }
  renderDedicatedQuotePage();
  showToast('Service & quote parameters updated!');
}

async function updateStandardQuoteCalcSummary() {
  const summaryBox = document.getElementById('stdQuoteCalcSummary');
  const servicesListBox = document.getElementById('quoteAvailableServicesList');
  if (!summaryBox) return;

  const weightInput = document.getElementById('weightInput');
  const weight = weightInput && parseFloat(weightInput.value) > 0 ? parseFloat(weightInput.value) : parseFloat(appState.weight) || 1;
  const unit = appState.weightUnit || 'kg';
  const pkgType = (appState.selectedPackage || appState.packageType || 'document').toLowerCase();
  const pkgLabel = (PACKAGE_TYPE_CONFIG[pkgType] && PACKAGE_TYPE_CONFIG[pkgType].label) || 'Document';
  const actualKg = unit === 'lb' ? +(weight * 0.453592).toFixed(2) : +weight.toFixed(2);
  const actualLb = unit === 'lb' ? +weight.toFixed(2) : +(weight * 2.20462).toFixed(2);

  const lVal = parseFloat(document.getElementById('stdQuoteLength')?.value || '');
  const wVal = parseFloat(document.getElementById('stdQuoteWidth')?.value || '');
  const hVal = parseFloat(document.getElementById('stdQuoteHeight')?.value || '');
  const hasDims = pkgType !== 'document' && lVal > 0 && wVal > 0 && hVal > 0;
  const volKg = hasDims ? +((lVal * wVal * hVal) / 5000).toFixed(2) : null;
  const chargeableKg = volKg !== null ? +Math.max(actualKg, volKg).toFixed(2) : actualKg;

  summaryBox.innerHTML = `
    <div class="summary-row"><span>Corridor</span><strong>${escapeHtml(appState.fromCountry.name)} ➔ ${escapeHtml(appState.toCountry.name)}</strong></div>
    <div class="summary-row"><span>Service Category</span><strong>${escapeHtml(pkgLabel)}</strong></div>
    <div class="summary-row"><span>Entered Weight</span><strong>${weight} ${escapeHtml(unit)} (${actualKg} kg / ${actualLb} lb)</strong></div>
    ${volKg !== null ? `<div class="summary-row"><span>Volumetric Weight (${lVal}×${wVal}×${hVal} cm ÷ 5000)</span><strong>${volKg} kg</strong></div>` : ''}
    <div class="summary-row total"><span>Chargeable Weight</span><strong>${chargeableKg} kg</strong></div>
  `;

  if (servicesListBox) {
    try {
      const qs = new URLSearchParams({
        from: appState.fromCountry.name,
        to: appState.toCountry.name,
        type: pkgType,
        weight: String(weight),
        unit
      });
      if (hasDims) {
        qs.set('length', String(lVal));
        qs.set('width', String(wVal));
        qs.set('height', String(hVal));
      }
      const res = await fetch(`/api/rates?${qs.toString()}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.ok && Array.isArray(data.serviceTiers)) {
        servicesListBox.innerHTML = `
          <h4 style="font-size:13.5px; font-weight:700; color:var(--slate-900); margin-bottom:8px;">Available Service Tiers for This Route</h4>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${data.serviceTiers.map(tier => `
              <div style="padding:10px 12px; border:1px solid var(--slate-200); border-radius:10px; background:#f8fafc;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                  <strong style="font-size:13px; color:var(--slate-900);">${escapeHtml(tier.name)}</strong>
                  <span class="api-status-pill" style="font-size:11px;">${escapeHtml(tier.transitTime)}</span>
                </div>
                <p style="font-size:12px; color:var(--slate-600); margin:4px 0 0;">
                  ${escapeHtml(tier.pickupMode)} • ${escapeHtml(tier.customsClearance)} • <em>${escapeHtml(tier.rateStatus)}</em>
                </p>
              </div>
            `).join('')}
          </div>
        `;
      }
    } catch (_) {
      // Non-blocking tier preview
    }
  }
}

async function submitStandardQuoteForm() {
  if (appState.isSubmittingStdQuote) return;

  const check = validateQuoteInputs();
  const errorBox = document.getElementById('stdQuoteFormError');
  const confirmBox = document.getElementById('stdQuoteConfirmationBox');
  const submitBtn = document.getElementById('stdQuoteSubmitBtn');

  const fail = (el, msg) => {
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = msg;
    }
    if (confirmBox) confirmBox.hidden = true;
    if (el) {
      el.classList.add('has-field-error');
      el.focus();
    }
  };

  if (!check.valid) {
    return fail(document.getElementById('weightInput'), check.error);
  }

  const nameEl = document.getElementById('stdQuoteSenderName');
  const phoneEl = document.getElementById('stdQuotePhone');
  const emailEl = document.getElementById('stdQuoteEmail');
  const tierEl = document.getElementById('stdQuoteServiceTier');
  const lenEl = document.getElementById('stdQuoteLength');
  const widEl = document.getElementById('stdQuoteWidth');
  const hgtEl = document.getElementById('stdQuoteHeight');
  const rxCheckEl = document.getElementById('stdQuotePrescriptionCheck');
  const notesEl = document.getElementById('stdQuoteNotes');

  [nameEl, phoneEl, emailEl, lenEl, widEl, hgtEl].forEach(el => el && el.classList.remove('has-field-error'));

  const senderName = (nameEl?.value || '').trim();
  const phone = (phoneEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  const serviceTier = (tierEl?.value || 'Express Air Saver (3–5 Business Days)').trim();
  const notes = (notesEl?.value || '').trim();
  const pkgType = (appState.selectedPackage || appState.packageType || 'document').toLowerCase();

  if (!senderName) return fail(nameEl, 'Please enter your full name.');
  if (phone.replace(/\D/g, '').length < 7) return fail(phoneEl, 'Please enter a valid mobile or WhatsApp number (at least 7 digits).');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(emailEl, 'Please enter a valid email address.');

  if (pkgType === 'medicine' && (!rxCheckEl || !rxCheckEl.checked)) {
    return fail(rxCheckEl, "For Medicine Courier shipments, please confirm that you hold a valid doctor's prescription and pharmacy tax invoice.");
  }

  const lRaw = (lenEl?.value || '').trim();
  const wRaw = (widEl?.value || '').trim();
  const hRaw = (hgtEl?.value || '').trim();
  let length = null;
  let width = null;
  let height = null;
  if (pkgType !== 'document' && (lRaw || wRaw || hRaw)) {
    length = parseFloat(lRaw);
    width = parseFloat(wRaw);
    height = parseFloat(hRaw);
    if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      return fail(lenEl, 'When entering package dimensions, Length, Width, and Height (cm) must all be positive numbers.');
    }
  }

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  appState.isSubmittingStdQuote = true;
  const origBtn = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Saving Quote Request...</span>';
  }

  try {
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderName,
        email,
        phone,
        originCountry: appState.fromCountry.name,
        destCountry: appState.toCountry.name,
        packageType: pkgType,
        weight: parseFloat(appState.weight) || 1,
        weightUnit: appState.weightUnit || 'kg',
        length,
        width,
        height,
        serviceTier,
        prescriptionConfirmed: pkgType === 'medicine' ? Boolean(rxCheckEl?.checked) : false,
        notes
      })
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) {
      return fail(null, (data && data.error) || `Server returned status ${res.status}. Please check your inputs.`);
    }

    const q = data.quote;
    if (confirmBox) {
      confirmBox.hidden = false;
      confirmBox.innerHTML = `
        <div class="pickup-confirmed-banner" style="margin-top:14px;">
          <strong>Shipping Quote Request Saved — Reference: ${escapeHtml(q.quoteId)}</strong>
          <p style="margin-top:6px;">
            Sender <b>${escapeHtml(q.senderName)}</b> (${escapeHtml(q.email)} • ${escapeHtml(q.phone)}) —
            <b>${escapeHtml(q.packageTypeLabel)}</b> from <b>${escapeHtml(q.originCountry)}</b> to <b>${escapeHtml(q.destCountry)}</b>
            via <b>${escapeHtml(q.serviceTier)}</b>.
          </p>
          <p style="margin-top:6px;">
            Entered Weight: <b>${q.weight} ${escapeHtml(q.weightUnit)}</b> • Chargeable Weight: <b>${q.chargeableWeightKg} kg</b> • Status: <b>${escapeHtml(q.status)}</b>.
          </p>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
            <a href="/track?awb=${encodeURIComponent(q.quoteId)}" class="btn btn-primary btn-sm">Track Quote Reference (${escapeHtml(q.quoteId)}) →</a>
            <a href="${buildQuoteUrl('/schedule-pickup')}" class="btn btn-outline btn-sm">Schedule Doorstep Pickup →</a>
          </div>
        </div>
      `;
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(`Quote request ${q.quoteId} saved!`);
  } catch (_) {
    fail(null, 'Unable to reach the backend server to save your quote request. Please try again.');
  } finally {
    appState.isSubmittingStdQuote = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtn;
    }
  }
}

function handleServiceWeightField(serviceType, rawValue) {
  const trimmed = String(rawValue || '').trim();
  const num = parseFloat(trimmed);
  if (Number.isFinite(num) && num > 0) {
    appState.weight = String(num);
    const mainWeightInput = document.getElementById('weightInput');
    if (mainWeightInput) mainWeightInput.value = String(num);
    syncUrlWithCurrentForm();
  }
  if (serviceType === 'ecommerce') updateEcommerceEstimateSummary();
  if (serviceType === 'bulk') updateBulkEstimateSummary();
}

function handleServiceUnitField(serviceType, rawUnit) {
  const unit = String(rawUnit || 'kg').toLowerCase() === 'lb' ? 'lb' : 'kg';
  appState.weightUnit = unit;
  const unitBadge = document.getElementById('currentWeightUnit');
  if (unitBadge) unitBadge.textContent = unit;
  syncUrlWithCurrentForm();
  if (serviceType === 'ecommerce') updateEcommerceEstimateSummary();
  if (serviceType === 'bulk') updateBulkEstimateSummary();
}

function updateEcommerceEstimateSummary() {
  const summaryBox = document.getElementById('ecomCalcSummary');
  if (!summaryBox) return;

  const origin = (document.getElementById('ecomOriginCountry')?.value || appState.fromCountry.name).trim();
  const dest = (document.getElementById('ecomDestCountry')?.value || appState.toCountry.name).trim();
  const qty = Math.max(1, parseInt(document.getElementById('ecomParcelQty')?.value || '1', 10) || 1);
  const weight = Math.max(0.1, parseFloat(document.getElementById('ecomWeight')?.value || appState.weight || '1') || 1);
  const unit = (document.getElementById('ecomWeightUnit')?.value || appState.weightUnit || 'kg').toLowerCase();
  const length = Math.max(1, parseFloat(document.getElementById('ecomLength')?.value || '25') || 25);
  const width = Math.max(1, parseFloat(document.getElementById('ecomWidth')?.value || '20') || 20);
  const height = Math.max(1, parseFloat(document.getElementById('ecomHeight')?.value || '10') || 10);
  const serviceOption = document.getElementById('ecomServiceOption')?.value || 'Cross-Border Express D2C (3-5 Business Days)';
  const customsMode = document.getElementById('ecomCustomsMode')?.value || 'DDU - Delivered Duty Unpaid';

  const actualKg = unit === 'lb' ? +(weight * 0.453592).toFixed(2) : +weight.toFixed(2);
  const volPerParcelKg = +((length * width * height) / 5000).toFixed(2);
  const totalVolKg = +(volPerParcelKg * qty).toFixed(2);
  const chargeableKg = +Math.max(actualKg, totalVolKg).toFixed(2);

  summaryBox.innerHTML = `
    <div class="summary-row"><span>Fulfilment Corridor</span><strong>${escapeHtml(origin)} ➔ ${escapeHtml(dest)}</strong></div>
    <div class="summary-row"><span>Service Option</span><strong>${escapeHtml(serviceOption)}</strong></div>
    <div class="summary-row"><span>Customs Mode</span><strong>${escapeHtml(customsMode)}</strong></div>
    <div class="summary-row"><span>Parcel Quantity &amp; Dimensions</span><strong>${qty} × (${length}×${width}×${height} cm)</strong></div>
    <div class="summary-row"><span>Actual Weight</span><strong>${weight} ${escapeHtml(unit)} (${actualKg} kg)</strong></div>
    <div class="summary-row"><span>Volumetric Weight (L×W×H÷5000)</span><strong>${totalVolKg} kg</strong></div>
    <div class="summary-row total"><span>Estimated Chargeable Weight</span><strong>${chargeableKg} kg</strong></div>
  `;
}

async function submitEcommerceServiceForm() {
  if (appState.isSubmittingEcommerce) return;

  const fields = {
    storeName: document.getElementById('ecomStoreName'),
    contactName: document.getElementById('ecomContactName'),
    email: document.getElementById('ecomEmail'),
    phone: document.getElementById('ecomPhone'),
    originCountry: document.getElementById('ecomOriginCountry'),
    destCountry: document.getElementById('ecomDestCountry'),
    pickupAddress: document.getElementById('ecomPickupAddress'),
    deliveryAddress: document.getElementById('ecomDeliveryAddress'),
    parcelQty: document.getElementById('ecomParcelQty'),
    weight: document.getElementById('ecomWeight'),
    weightUnit: document.getElementById('ecomWeightUnit'),
    length: document.getElementById('ecomLength'),
    width: document.getElementById('ecomWidth'),
    height: document.getElementById('ecomHeight'),
    serviceOption: document.getElementById('ecomServiceOption'),
    customsMode: document.getElementById('ecomCustomsMode'),
    platform: document.getElementById('ecomPlatform'),
    notes: document.getElementById('ecomNotes')
  };

  const errorBox = document.getElementById('ecomFormError');
  const confirmBox = document.getElementById('ecomConfirmationBox');
  const submitBtn = document.getElementById('ecomSubmitBtn');

  Object.values(fields).forEach(el => {
    if (el) {
      el.classList.remove('has-field-error');
      el.removeAttribute('aria-invalid');
    }
  });

  const failValidation = (fieldEl, msg) => {
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = msg;
    }
    if (confirmBox) confirmBox.hidden = true;
    if (fieldEl) {
      fieldEl.classList.add('has-field-error');
      fieldEl.setAttribute('aria-invalid', 'true');
      fieldEl.focus();
    }
  };

  const storeName = (fields.storeName?.value || '').trim();
  const contactName = (fields.contactName?.value || '').trim();
  const email = (fields.email?.value || '').trim();
  const phone = (fields.phone?.value || '').trim();
  const originCountry = (fields.originCountry?.value || '').trim();
  const destCountry = (fields.destCountry?.value || '').trim();
  const pickupAddress = (fields.pickupAddress?.value || '').trim();
  const deliveryAddress = (fields.deliveryAddress?.value || '').trim();
  const parcelQty = parseInt(fields.parcelQty?.value || '', 10);
  const weight = parseFloat(fields.weight?.value || '');
  const weightUnit = (fields.weightUnit?.value || 'kg').trim().toLowerCase();
  const length = parseFloat(fields.length?.value || '');
  const width = parseFloat(fields.width?.value || '');
  const height = parseFloat(fields.height?.value || '');
  const serviceOption = (fields.serviceOption?.value || '').trim();
  const customsMode = (fields.customsMode?.value || '').trim();
  const platform = (fields.platform?.value || '').trim();
  const notes = (fields.notes?.value || '').trim();

  if (!storeName) return failValidation(fields.storeName, 'Please enter your Store or Brand Name.');
  if (!contactName) return failValidation(fields.contactName, 'Please enter the Contact Person Name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return failValidation(fields.email, 'Please enter a valid business email address.');
  if (phone.replace(/\D/g, '').length < 7) return failValidation(fields.phone, 'Please enter a valid phone or WhatsApp number (at least 7 digits).');
  if (!originCountry) return failValidation(fields.originCountry, 'Please enter the shipment origin country.');
  if (!destCountry) return failValidation(fields.destCountry, 'Please enter the destination country.');
  if (!pickupAddress) return failValidation(fields.pickupAddress, 'Please enter the origin pickup warehouse or street address.');
  if (!deliveryAddress) return failValidation(fields.deliveryAddress, 'Please enter the destination delivery address or postal zone.');
  if (!Number.isFinite(parcelQty) || parcelQty < 1) return failValidation(fields.parcelQty, 'Parcel quantity must be a whole number of at least 1.');
  if (!Number.isFinite(weight) || weight <= 0) return failValidation(fields.weight, 'Parcel weight must be a positive number greater than 0.');
  if (!Number.isFinite(length) || length <= 0) return failValidation(fields.length, 'Parcel length (cm) must be greater than 0.');
  if (!Number.isFinite(width) || width <= 0) return failValidation(fields.width, 'Parcel width (cm) must be greater than 0.');
  if (!Number.isFinite(height) || height <= 0) return failValidation(fields.height, 'Parcel height (cm) must be greater than 0.');

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  appState.isSubmittingEcommerce = true;
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting Fulfilment Request...</span>';
  }

  try {
    const response = await fetch('/api/service-enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceType: 'ecommerce',
        storeName,
        contactName,
        email,
        phone,
        originCountry,
        destCountry,
        pickupAddress,
        deliveryAddress,
        parcelQty,
        weight,
        weightUnit,
        length,
        width,
        height,
        serviceOption,
        customsMode,
        platform,
        notes
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !data.ok) {
      const serverErr = (data && data.error) || `Server returned status ${response.status}. Please check your inputs and try again.`;
      failValidation(null, serverErr);
      return;
    }

    const rec = data.enquiry;
    if (confirmBox) {
      confirmBox.hidden = false;
      confirmBox.innerHTML = `
        <div class="pickup-confirmed-banner">
          <strong>E-commerce Fulfilment Enquiry Recorded — Reference: ${escapeHtml(rec.enquiryId)}</strong>
          <p style="margin-top:6px;">
            Store <b>${escapeHtml(rec.storeName)}</b> (${escapeHtml(rec.contactName)} • ${escapeHtml(rec.email)}) —
            <b>${rec.parcelQty} parcel(s)</b> from <b>${escapeHtml(rec.originCountry)}</b> (${escapeHtml(rec.pickupAddress)})
            to <b>${escapeHtml(rec.destCountry)}</b> (${escapeHtml(rec.deliveryAddress)}) via <b>${escapeHtml(rec.serviceOption)}</b> (${escapeHtml(rec.customsMode)}).
          </p>
          <p style="margin-top:6px;">
            Calculated Chargeable Weight: <b>${rec.chargeableWeightKg} kg</b> (Actual: ${rec.actualWeightKg} kg • Volumetric: ${rec.volumetricWeightKg} kg).
          </p>
          <p style="margin-top:6px;"><em>${escapeHtml(data.message)}</em></p>
        </div>
      `;
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(`E-commerce enquiry ${rec.enquiryId} saved!`);
  } catch (err) {
    failValidation(null, 'Unable to reach the server to submit your E-commerce Logistics enquiry. Your entered details have been preserved—please try again.');
  } finally {
    appState.isSubmittingEcommerce = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }
}

function updateBulkEstimateSummary() {
  const summaryBox = document.getElementById('bulkCalcSummary');
  if (!summaryBox) return;

  const origin = (document.getElementById('bulkOriginCountry')?.value || appState.fromCountry.name).trim();
  const dest = (document.getElementById('bulkDestCountry')?.value || appState.toCountry.name).trim();
  const qty = Math.max(1, parseInt(document.getElementById('bulkPalletQty')?.value || '2', 10) || 1);
  const weight = Math.max(0.1, parseFloat(document.getElementById('bulkTotalWeight')?.value || appState.weight || '1') || 1);
  const unit = (document.getElementById('bulkWeightUnit')?.value || appState.weightUnit || 'kg').toLowerCase();
  const length = Math.max(1, parseFloat(document.getElementById('bulkLength')?.value || '120') || 120);
  const width = Math.max(1, parseFloat(document.getElementById('bulkWidth')?.value || '80') || 80);
  const height = Math.max(1, parseFloat(document.getElementById('bulkHeight')?.value || '100') || 100);
  const cargoType = document.getElementById('bulkCargoType')?.value || 'Palletized Commercial Goods';
  const handlingReq = document.getElementById('bulkHandlingReq')?.value || 'Standard Palletized / Forklift Handling';
  const incoterms = document.getElementById('bulkIncoterms')?.value || 'Door-to-Door Commercial Express (DAP / DDP)';

  const actualKg = unit === 'lb' ? +(weight * 0.453592).toFixed(2) : +weight.toFixed(2);
  const totalVolumeCbm = +((length * width * height * qty) / 1000000).toFixed(3);
  const volumetricKg = +((length * width * height * qty) / 6000).toFixed(2);
  const chargeableKg = +Math.max(actualKg, volumetricKg).toFixed(2);

  summaryBox.innerHTML = `
    <div class="summary-row"><span>Freight Corridor</span><strong>${escapeHtml(origin)} ➔ ${escapeHtml(dest)}</strong></div>
    <div class="summary-row"><span>Cargo Type</span><strong>${escapeHtml(cargoType)}</strong></div>
    <div class="summary-row"><span>Handling &amp; Mode</span><strong>${escapeHtml(handlingReq)} • ${escapeHtml(incoterms)}</strong></div>
    <div class="summary-row"><span>Pallet / Unit Qty &amp; Size</span><strong>${qty} × (${length}×${width}×${height} cm)</strong></div>
    <div class="summary-row"><span>Total Cubic Volume (CBM)</span><strong>${totalVolumeCbm} m³</strong></div>
    <div class="summary-row"><span>Actual Gross Weight</span><strong>${weight} ${escapeHtml(unit)} (${actualKg} kg)</strong></div>
    <div class="summary-row"><span>Air Freight Volumetric Weight</span><strong>${volumetricKg} kg</strong></div>
    <div class="summary-row total"><span>Estimated Chargeable Freight Weight</span><strong>${chargeableKg} kg</strong></div>
  `;
}

async function submitBulkServiceForm() {
  if (appState.isSubmittingBulk) return;

  const fields = {
    companyName: document.getElementById('bulkCompanyName'),
    contactPerson: document.getElementById('bulkContactPerson'),
    email: document.getElementById('bulkEmail'),
    phone: document.getElementById('bulkPhone'),
    originCountry: document.getElementById('bulkOriginCountry'),
    destCountry: document.getElementById('bulkDestCountry'),
    pickupAddress: document.getElementById('bulkPickupAddress'),
    deliveryAddress: document.getElementById('bulkDeliveryAddress'),
    palletQty: document.getElementById('bulkPalletQty'),
    totalWeight: document.getElementById('bulkTotalWeight'),
    weightUnit: document.getElementById('bulkWeightUnit'),
    length: document.getElementById('bulkLength'),
    width: document.getElementById('bulkWidth'),
    height: document.getElementById('bulkHeight'),
    cargoType: document.getElementById('bulkCargoType'),
    handlingReq: document.getElementById('bulkHandlingReq'),
    incoterms: document.getElementById('bulkIncoterms'),
    pickupDate: document.getElementById('bulkPickupDate'),
    specialNotes: document.getElementById('bulkSpecialNotes')
  };

  const errorBox = document.getElementById('bulkFormError');
  const confirmBox = document.getElementById('bulkConfirmationBox');
  const submitBtn = document.getElementById('bulkSubmitBtn');

  Object.values(fields).forEach(el => {
    if (el) {
      el.classList.remove('has-field-error');
      el.removeAttribute('aria-invalid');
    }
  });

  const failValidation = (fieldEl, msg) => {
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = msg;
    }
    if (confirmBox) confirmBox.hidden = true;
    if (fieldEl) {
      fieldEl.classList.add('has-field-error');
      fieldEl.setAttribute('aria-invalid', 'true');
      fieldEl.focus();
    }
  };

  const companyName = (fields.companyName?.value || '').trim();
  const contactPerson = (fields.contactPerson?.value || '').trim();
  const email = (fields.email?.value || '').trim();
  const phone = (fields.phone?.value || '').trim();
  const originCountry = (fields.originCountry?.value || '').trim();
  const destCountry = (fields.destCountry?.value || '').trim();
  const pickupAddress = (fields.pickupAddress?.value || '').trim();
  const deliveryAddress = (fields.deliveryAddress?.value || '').trim();
  const palletQty = parseInt(fields.palletQty?.value || '', 10);
  const totalWeight = parseFloat(fields.totalWeight?.value || '');
  const weightUnit = (fields.weightUnit?.value || 'kg').trim().toLowerCase();
  const length = parseFloat(fields.length?.value || '');
  const width = parseFloat(fields.width?.value || '');
  const height = parseFloat(fields.height?.value || '');
  const cargoType = (fields.cargoType?.value || '').trim();
  const handlingReq = (fields.handlingReq?.value || '').trim();
  const incoterms = (fields.incoterms?.value || '').trim();
  const pickupDate = (fields.pickupDate?.value || '').trim();
  const specialNotes = (fields.specialNotes?.value || '').trim();

  if (!companyName) return failValidation(fields.companyName, 'Please enter your Business or Company Name.');
  if (!contactPerson) return failValidation(fields.contactPerson, 'Please enter the Business Contact Person.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return failValidation(fields.email, 'Please enter a valid business contact email address.');
  if (phone.replace(/\D/g, '').length < 7) return failValidation(fields.phone, 'Please enter a valid business phone number (at least 7 digits).');
  if (!originCountry) return failValidation(fields.originCountry, 'Please enter the shipment origin country.');
  if (!destCountry) return failValidation(fields.destCountry, 'Please enter the shipment destination country.');
  if (!pickupAddress) return failValidation(fields.pickupAddress, 'Please enter the origin pickup warehouse or factory address.');
  if (!deliveryAddress) return failValidation(fields.deliveryAddress, 'Please enter the destination consignee or facility address.');
  if (!Number.isFinite(palletQty) || palletQty < 1) return failValidation(fields.palletQty, 'Cargo or pallet quantity must be at least 1.');
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) return failValidation(fields.totalWeight, 'Total shipment weight must be a positive number greater than 0.');
  if (!Number.isFinite(length) || length <= 0) return failValidation(fields.length, 'Unit/pallet length (cm) must be greater than 0.');
  if (!Number.isFinite(width) || width <= 0) return failValidation(fields.width, 'Unit/pallet width (cm) must be greater than 0.');
  if (!Number.isFinite(height) || height <= 0) return failValidation(fields.height, 'Unit/pallet height (cm) must be greater than 0.');

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  appState.isSubmittingBulk = true;
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting Freight Quotation...</span>';
  }

  try {
    const response = await fetch('/api/service-enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceType: 'bulk',
        companyName,
        contactPerson,
        email,
        phone,
        originCountry,
        destCountry,
        pickupAddress,
        deliveryAddress,
        palletQty,
        totalWeight,
        weightUnit,
        length,
        width,
        height,
        cargoType,
        handlingReq,
        incoterms,
        pickupDate,
        specialNotes
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !data.ok) {
      const serverErr = (data && data.error) || `Server returned status ${response.status}. Please check your inputs and try again.`;
      failValidation(null, serverErr);
      return;
    }

    const rec = data.enquiry;
    if (confirmBox) {
      confirmBox.hidden = false;
      confirmBox.innerHTML = `
        <div class="pickup-confirmed-banner">
          <strong>Bulk &amp; Commercial Freight Enquiry Recorded — Reference: ${escapeHtml(rec.enquiryId)}</strong>
          <p style="margin-top:6px;">
            Company <b>${escapeHtml(rec.companyName)}</b> (${escapeHtml(rec.contactPerson)} • ${escapeHtml(rec.email)}) —
            <b>${rec.palletQty} pallet/cargo unit(s)</b> (${escapeHtml(rec.cargoType)}) from <b>${escapeHtml(rec.originCountry)}</b> (${escapeHtml(rec.pickupAddress)})
            to <b>${escapeHtml(rec.destCountry)}</b> (${escapeHtml(rec.deliveryAddress)}) under <b>${escapeHtml(rec.incoterms)}</b>.
          </p>
          <p style="margin-top:6px;">
            Total Volume: <b>${rec.totalVolumeCbm} CBM</b> • Chargeable Weight: <b>${rec.chargeableWeightKg} kg</b> (Actual: ${rec.actualWeightKg} kg • Volumetric: ${rec.volumetricWeightKg} kg).
          </p>
          <p style="margin-top:6px;"><em>${escapeHtml(data.message)}</em></p>
        </div>
      `;
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(`Bulk freight enquiry ${rec.enquiryId} saved!`);
  } catch (err) {
    failValidation(null, 'Unable to reach the server to submit your Bulk & Commercial quotation request. Your entered details have been preserved—please try again.');
  } finally {
    appState.isSubmittingBulk = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }
}

function renderDedicatedTrackPage() {
  const params = new URLSearchParams(window.location.search);
  const awbParam = (params.get('awb') || '').trim();
  const input = document.getElementById('trackingInput');
  const shareInput = document.getElementById('shareUrlInput');
  if (shareInput) shareInput.value = getShareablePageUrl();

  if (input && awbParam) {
    input.value = awbParam;
  }
  if (awbParam) {
    lookupTrackingStatus(awbParam);
  }
}

async function lookupTrackingStatus(optionalAwb) {
  const input = document.getElementById('trackingInput');
  const awb = (optionalAwb !== undefined ? String(optionalAwb) : (input ? input.value : '')).trim();
  const statusContainer = document.getElementById('trackResultContainer');
  const errorBox = document.getElementById('trackErrorBox');
  const detailsBox = document.getElementById('trackDetailsContent');
  const apiBanner = document.getElementById('trackApiBanner');
  const apiBannerTitle = document.getElementById('trackApiBannerTitle');
  const apiBannerText = document.getElementById('trackApiBannerText');
  const badgeEl = document.getElementById('trackRecordTypeBadge');

  if (!awb || awb.length < 4 || !/^[A-Za-z0-9\-]+$/.test(awb)) {
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = 'Please enter a valid Airway Bill (AWB) or Trisys Reference Number (at least 4 alphanumeric characters, e.g. TRISYS-PKP-123456).';
    }
    if (detailsBox) detailsBox.hidden = true;
    if (input) input.focus();
    return;
  }

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  const normalizedAwb = awb.toUpperCase();
  const currentPath = window.location.pathname || '/track';
  window.history.replaceState({}, '', `${currentPath}?awb=${encodeURIComponent(normalizedAwb)}`);
  const shareInput = document.getElementById('shareUrlInput');
  if (shareInput) shareInput.value = getShareablePageUrl();

  const awbDisplay = document.getElementById('trackAwbNumber');
  if (awbDisplay) awbDisplay.textContent = normalizedAwb;
  if (statusContainer) statusContainer.hidden = false;

  if (detailsBox) {
    detailsBox.hidden = false;
    detailsBox.innerHTML = `<p style="color:var(--slate-600); font-size:0.92rem;">Querying tracking database for <strong>${escapeHtml(normalizedAwb)}</strong>...</p>`;
  }

  try {
    const res = await fetch(`/api/track?awb=${encodeURIComponent(normalizedAwb)}`);
    const data = await res.json().catch(() => null);

    if (!res.ok || !data || !data.ok) {
      if (detailsBox) detailsBox.hidden = true;
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent = (data && data.error) || `Unable to retrieve tracking information (status ${res.status}).`;
      }
      return;
    }

    if (data.found) {
      if (badgeEl) badgeEl.textContent = data.recordType || 'Verified Shipment Record';
      const events = Array.isArray(data.events) ? data.events : [];
      if (detailsBox) {
        detailsBox.hidden = false;
        detailsBox.innerHTML = `
          <div class="pickup-order-summary" style="margin-bottom:16px;">
            <div class="summary-row"><span>Tracking / Reference ID</span><strong>${escapeHtml(data.awb)}</strong></div>
            <div class="summary-row"><span>Record Type</span><strong>${escapeHtml(data.recordType || 'Shipment')}</strong></div>
            <div class="summary-row"><span>Current Status</span><strong style="color:var(--primary-red);">${escapeHtml(data.status || 'Pending')}</strong></div>
            <div class="summary-row"><span>Origin ➔ Destination</span><strong>${escapeHtml(data.originCountry || 'India')} ➔ ${escapeHtml(data.destCountry || 'International')}</strong></div>
            <div class="summary-row"><span>Package &amp; Weight</span><strong>${escapeHtml(String(data.packageType || 'Document'))} • ${escapeHtml(String(data.weight || '1'))} ${escapeHtml(data.weightUnit || 'kg')}${data.chargeableWeightKg ? ` (Chargeable: ${escapeHtml(String(data.chargeableWeightKg))} kg)` : ''}</strong></div>
            ${data.pickupDate ? `<div class="summary-row"><span>Scheduled Pickup Slot</span><strong>${escapeHtml(data.pickupDate)} • ${escapeHtml(data.pickupTimeSlot || '')}</strong></div>` : ''}
            ${data.pickupAddress ? `<div class="summary-row"><span>Pickup Location</span><strong>${escapeHtml(data.pickupAddress)}</strong></div>` : ''}
            <div class="summary-row"><span>Estimated Delivery / Service</span><strong>${escapeHtml(data.estimatedDelivery || 'Subject to carrier uplift')}</strong></div>
          </div>
          ${events.length ? `
            <h4 style="font-size:14px; font-weight:700; color:var(--slate-900); margin-bottom:10px;">Recorded Activity Timeline</h4>
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${events.map(ev => `
                <div style="padding:12px 14px; border-left:3px solid var(--primary-red); background:#f8fafc; border-radius:0 10px 10px 0;">
                  <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; font-size:12px; color:var(--slate-500);">
                    <span>${escapeHtml(ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'Recorded')}</span>
                    <span>${escapeHtml(ev.location || '')}</span>
                  </div>
                  <strong style="display:block; color:var(--slate-900); margin-top:3px; font-size:13.5px;">${escapeHtml(ev.status || '')}</strong>
                  <p style="margin:4px 0 0; font-size:13px; color:var(--slate-700);">${escapeHtml(ev.description || '')}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
        `;
      }
      if (apiBannerTitle) apiBannerTitle.textContent = 'Verified Local Record Found';
      if (apiBannerText) {
        apiBannerText.textContent = `Showing real stored details for ${normalizedAwb} from the Trisys Express backend database. Live external airline/carrier scan events will append automatically once carrier API credentials are connected.`;
      }
      showToast(`Tracking details loaded for ${normalizedAwb}`);
    } else {
      if (badgeEl) badgeEl.textContent = 'Shipment Tracking Lookup';
      if (detailsBox) {
        detailsBox.hidden = false;
        detailsBox.innerHTML = `
          <div class="pickup-order-summary">
            <div class="summary-row"><span>Queried Reference / AWB</span><strong>${escapeHtml(normalizedAwb)}</strong></div>
            <div class="summary-row"><span>Local Database Match</span><strong>No matching pickup (TRISYS-PKP-*) or quote (TRISYS-QTE-*) found</strong></div>
            <div class="summary-row"><span>External Carrier Tracking API</span><strong>${data.carrierTrackingApiConfigured ? 'Connected' : 'Not Configured (TRISYS_CARRIER_API_KEY missing)'}</strong></div>
          </div>
        `;
      }
      if (apiBannerTitle) apiBannerTitle.textContent = 'No Record Found / Carrier Tracking API Not Configured';
      if (apiBannerText) {
        apiBannerText.textContent = data.message || `No shipment or pickup record was found for '${normalizedAwb}', and external carrier AWB tracking is not configured. No fabricated tracking events are displayed.`;
      }
    }
  } catch (_) {
    if (detailsBox) detailsBox.hidden = true;
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = 'Unable to reach the tracking server. Please check your connection and try again.';
    }
  }
}

function renderDedicatedPickupPage() {
  const params = new URLSearchParams(window.location.search);
  const weight = params.get('weight') || appState.weight || '1';
  const unit = params.get('unit') || appState.weightUnit || 'kg';
  const pkg = (params.get('type') || params.get('pkg') || appState.selectedPackage || 'document').toLowerCase();
  const pkgLabel = (PACKAGE_TYPE_CONFIG[pkg] && PACKAGE_TYPE_CONFIG[pkg].label) || 'Document';

  const originInput = document.getElementById('pickupOriginCountry');
  const destInput = document.getElementById('pickupDestCountry');
  if (originInput && !originInput.dataset.userEdited) {
    originInput.value = appState.fromCountry.name;
  }
  if (destInput && !destInput.dataset.userEdited) {
    destInput.value = appState.toCountry.name;
  }

  const pkgSelect = document.getElementById('pickupPackageType');
  if (pkgSelect && ['document', 'parcel', 'medicine', 'ecommerce', 'bulk', 'other'].includes(pkg)) {
    pkgSelect.value = pkg;
  }

  const weightInputEl = document.getElementById('pickupWeightInput');
  if (weightInputEl && !weightInputEl.dataset.userEdited) {
    weightInputEl.value = String(weight);
  }

  const unitSelectEl = document.getElementById('pickupWeightUnit');
  if (unitSelectEl && !unitSelectEl.dataset.userEdited && (unit === 'kg' || unit === 'lb')) {
    unitSelectEl.value = unit;
  }

  const weightField = document.getElementById('pickupWeightDisplay');
  if (weightField) {
    weightField.value = `${weight} ${unit}`;
  }

  const dateEl = document.getElementById('pickupDate');
  if (dateEl && !dateEl.value) {
    const todayIso = new Date().toISOString().split('T')[0];
    dateEl.value = todayIso;
    dateEl.min = todayIso;
  }

  const summaryEl = document.getElementById('pickupOrderSummary');
  if (summaryEl) {
    const numW = parseFloat(weight) || 1;
    const actualKg = unit === 'lb' ? +(numW * 0.453592).toFixed(2) : +numW.toFixed(2);
    summaryEl.innerHTML = `
      <div class="summary-row"><span>Origin Country</span><strong>${escapeHtml(appState.fromCountry.name)} (${escapeHtml(appState.fromCountry.code)})</strong></div>
      <div class="summary-row"><span>Destination Country</span><strong>${escapeHtml(appState.toCountry.name)} (${escapeHtml(appState.toCountry.code)})</strong></div>
      <div class="summary-row"><span>Package Type</span><strong>${escapeHtml(pkgLabel)} (${escapeHtml(pkg)})</strong></div>
      <div class="summary-row"><span>Weight &amp; Unit</span><strong>${escapeHtml(String(weight))} ${escapeHtml(unit)} (${actualKg} kg)</strong></div>
    `;
  }
  syncUrlWithCurrentForm();
}

function syncPickupFieldsToState() {
  const originInput = document.getElementById('pickupOriginCountry');
  const destInput = document.getElementById('pickupDestCountry');
  const pkgSelect = document.getElementById('pickupPackageType');
  const weightInputEl = document.getElementById('pickupWeightInput');
  const unitSelectEl = document.getElementById('pickupWeightUnit');

  if (originInput && originInput.value.trim()) {
    originInput.dataset.userEdited = 'true';
    const foundFrom = findCountryByNameOrCode(originInput.value.trim());
    if (foundFrom) {
      appState.fromCountry = { code: foundFrom.code, name: foundFrom.name, flagSvg: getFlagSvg(foundFrom.code) };
    } else {
      appState.fromCountry = { code: 'IN', name: originInput.value.trim(), flagSvg: getFlagSvg('IN') };
    }
  }
  if (destInput && destInput.value.trim()) {
    destInput.dataset.userEdited = 'true';
    const foundTo = findCountryByNameOrCode(destInput.value.trim());
    if (foundTo) {
      appState.toCountry = { code: foundTo.code, name: foundTo.name, flagSvg: getFlagSvg(foundTo.code) };
    } else {
      appState.toCountry = { code: 'GB', name: destInput.value.trim(), flagSvg: getFlagSvg('GB') };
    }
  }
  if (pkgSelect && pkgSelect.value) {
    appState.selectedPackage = pkgSelect.value;
    appState.packageType = pkgSelect.value;
  }
  if (weightInputEl && parseFloat(weightInputEl.value) > 0) {
    weightInputEl.dataset.userEdited = 'true';
    appState.weight = String(parseFloat(weightInputEl.value));
  }
  if (unitSelectEl && (unitSelectEl.value === 'kg' || unitSelectEl.value === 'lb')) {
    unitSelectEl.dataset.userEdited = 'true';
    appState.weightUnit = unitSelectEl.value;
  }

  const pkg = (appState.selectedPackage || 'document').toLowerCase();
  const pkgLabel = (PACKAGE_TYPE_CONFIG[pkg] && PACKAGE_TYPE_CONFIG[pkg].label) || 'Document';
  const weight = appState.weight || '1';
  const unit = appState.weightUnit || 'kg';
  const numW = parseFloat(weight) || 1;
  const actualKg = unit === 'lb' ? +(numW * 0.453592).toFixed(2) : +numW.toFixed(2);

  const weightField = document.getElementById('pickupWeightDisplay');
  if (weightField) weightField.value = `${weight} ${unit}`;

  const summaryEl = document.getElementById('pickupOrderSummary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="summary-row"><span>Origin Country</span><strong>${escapeHtml(appState.fromCountry.name)} (${escapeHtml(appState.fromCountry.code)})</strong></div>
      <div class="summary-row"><span>Destination Country</span><strong>${escapeHtml(appState.toCountry.name)} (${escapeHtml(appState.toCountry.code)})</strong></div>
      <div class="summary-row"><span>Package Type</span><strong>${escapeHtml(pkgLabel)} (${escapeHtml(pkg)})</strong></div>
      <div class="summary-row"><span>Weight &amp; Unit</span><strong>${escapeHtml(String(weight))} ${escapeHtml(unit)} (${actualKg} kg)</strong></div>
    `;
  }
  syncUrlWithCurrentForm();
}

async function submitDedicatedPickupForm() {
  if (appState.isSubmittingPickup) return;

  const nameEl = document.getElementById('senderName');
  const phoneEl = document.getElementById('senderPhone');
  const emailEl = document.getElementById('senderEmail');
  const addressEl = document.getElementById('pickupAddress');
  const originEl = document.getElementById('pickupOriginCountry');
  const destEl = document.getElementById('pickupDestCountry');
  const dateEl = document.getElementById('pickupDate');
  const slotEl = document.getElementById('pickupSlot');
  const pkgEl = document.getElementById('pickupPackageType');
  const weightEl = document.getElementById('pickupWeightInput');
  const unitEl = document.getElementById('pickupWeightUnit');
  const notesEl = document.getElementById('pickupSpecialInstructions');
  const errorBox = document.getElementById('pickupFormError');
  const confirmBox = document.getElementById('pickupConfirmationBox');
  const submitBtn = document.getElementById('pickupSubmitBtn');

  [nameEl, phoneEl, emailEl, addressEl, originEl, destEl, dateEl, slotEl, weightEl].forEach(el => {
    if (el) el.classList.remove('has-field-error');
  });

  const fail = (el, msg) => {
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = msg;
    }
    if (confirmBox) confirmBox.hidden = true;
    if (el) {
      el.classList.add('has-field-error');
      el.focus();
    }
  };

  const senderName = (nameEl?.value || '').trim();
  const senderPhone = (phoneEl?.value || '').trim();
  const senderEmail = (emailEl?.value || '').trim();
  const pickupAddress = (addressEl?.value || '').trim();
  const originCountry = (originEl?.value || appState.fromCountry.name || 'India').trim();
  const destCountry = (destEl?.value || appState.toCountry.name || 'United Kingdom').trim();
  const pickupDate = (dateEl?.value || '').trim();
  const pickupTimeSlot = (slotEl?.value || '').trim();
  const packageType = (pkgEl?.value || appState.selectedPackage || 'document').trim().toLowerCase();
  const weightVal = parseFloat(weightEl ? weightEl.value : appState.weight);
  const weightUnit = (unitEl?.value || appState.weightUnit || 'kg').trim().toLowerCase();
  const specialInstructions = (notesEl?.value || '').trim();

  if (!senderName) return fail(nameEl, 'Please enter the Sender Full Name.');
  if (senderPhone.replace(/\D/g, '').length < 7) return fail(phoneEl, 'Please enter a valid mobile or WhatsApp contact number (at least 7 digits).');
  if (senderEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(senderEmail)) return fail(emailEl, 'Please enter a valid sender email address (or leave optional email blank).');
  if (!pickupAddress || pickupAddress.length < 5) return fail(addressEl, 'Please enter a complete pickup address including street, city, and PIN/postal code.');
  if (!originCountry) return fail(originEl, 'Please enter the origin country.');
  if (!destCountry) return fail(destEl, 'Please enter the destination country.');
  if (originCountry.toLowerCase() === destCountry.toLowerCase()) return fail(destEl, `Origin and destination cannot both be ${originCountry}.`);
  if (!pickupDate) return fail(dateEl, 'Please select a preferred pickup date.');
  if (!pickupTimeSlot) return fail(slotEl, 'Please select a preferred pickup time slot.');
  if (!Number.isFinite(weightVal) || weightVal <= 0) return fail(weightEl, 'Please enter a valid positive package weight greater than 0.');

  const actualKg = weightUnit === 'lb' ? +(weightVal * 0.453592).toFixed(2) : weightVal;
  const maxKg = PACKAGE_WEIGHT_LIMITS_KG[packageType] || 70;
  if (actualKg > maxKg) {
    return fail(weightEl, `Selected package type supports up to ${maxKg} kg. Your entered weight (${actualKg} kg) exceeds this limit.`);
  }

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  syncPickupFieldsToState();

  appState.isSubmittingPickup = true;
  const origBtn = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Scheduling Pickup Request...</span>';
  }

  try {
    const res = await fetch('/api/pickups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderName,
        senderPhone,
        senderEmail,
        pickupAddress,
        originCountry,
        destCountry,
        pickupDate,
        pickupTimeSlot,
        packageType,
        weight: weightVal,
        weightUnit,
        specialInstructions
      })
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) {
      return fail(null, (data && data.error) || `Server returned status ${res.status}. Pickup request could not be saved.`);
    }

    const pkp = data.pickup;
    const statusRefInput = document.getElementById('pickupStatusRefInput');
    if (statusRefInput) statusRefInput.value = pkp.pickupRef;

    if (confirmBox) {
      confirmBox.hidden = false;
      confirmBox.innerHTML = `
        <div class="pickup-confirmed-banner" style="margin-top:14px;">
          <strong>Doorstep Pickup Request Scheduled — Reference: ${escapeHtml(pkp.pickupRef)}</strong>
          <p style="margin-top:6px;">
            Sender <b>${escapeHtml(pkp.senderName)}</b> (${escapeHtml(pkp.senderPhone)}) at <b>${escapeHtml(pkp.pickupAddress)}</b> —
            Scheduled for <b>${escapeHtml(pkp.pickupDate)}</b> (${escapeHtml(pkp.pickupTimeSlot)}).
          </p>
          <p style="margin-top:6px;">
            Route: <b>${escapeHtml(pkp.originCountry)} ➔ ${escapeHtml(pkp.destCountry)}</b> • Package: <b>${escapeHtml(pkp.packageTypeLabel)}</b> (${pkp.weight} ${escapeHtml(pkp.weightUnit)}, chargeable ${pkp.chargeableWeightKg} kg) • Status: <b>${escapeHtml(pkp.status)}</b>.
          </p>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
            <a href="/track?awb=${encodeURIComponent(pkp.pickupRef)}" class="btn btn-primary btn-sm">Track Pickup Reference (${escapeHtml(pkp.pickupRef)}) →</a>
            <button type="button" class="btn btn-outline btn-sm" onclick="lookupPickupRequestStatus('${escapeHtml(pkp.pickupRef)}')">View Pickup Status in Sidebar</button>
          </div>
        </div>
      `;
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(`Pickup request ${pkp.pickupRef} scheduled!`);
  } catch (_) {
    fail(null, 'Unable to reach the backend server to schedule your pickup. Please try again.');
  } finally {
    appState.isSubmittingPickup = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtn;
    }
  }
}

async function lookupPickupRequestStatus(optionalRef) {
  const refInput = document.getElementById('pickupStatusRefInput');
  const errEl = document.getElementById('pickupStatusError');
  const resBox = document.getElementById('pickupStatusResultBox');
  const ref = (optionalRef !== undefined ? String(optionalRef) : (refInput ? refInput.value : '')).trim().toUpperCase();

  if (!ref) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = 'Please enter a valid Pickup Reference ID (e.g. TRISYS-PKP-XXXXXX).';
    }
    if (resBox) resBox.hidden = true;
    return;
  }

  if (errEl) {
    errEl.hidden = true;
    errEl.textContent = '';
  }

  try {
    const res = await fetch(`/api/pickups/status?ref=${encodeURIComponent(ref)}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) {
      if (resBox) resBox.hidden = true;
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = (data && data.error) || 'Pickup reference not found.';
      }
      return;
    }
    const p = data.pickup;
    if (resBox) {
      resBox.hidden = false;
      resBox.innerHTML = `
        <div class="pickup-order-summary" style="font-size:12.5px;">
          <div class="summary-row"><span>Reference ID</span><strong>${escapeHtml(p.pickupRef)}</strong></div>
          <div class="summary-row"><span>Status</span><strong style="color:var(--primary-red);">${escapeHtml(p.status)}</strong></div>
          <div class="summary-row"><span>Sender</span><strong>${escapeHtml(p.senderName)} (${escapeHtml(p.senderPhone)})</strong></div>
          <div class="summary-row"><span>Pickup Slot</span><strong>${escapeHtml(p.pickupDate)} • ${escapeHtml(p.pickupTimeSlot)}</strong></div>
          <div class="summary-row"><span>Corridor</span><strong>${escapeHtml(p.originCountry)} ➔ ${escapeHtml(p.destCountry)} (${escapeHtml(p.packageTypeLabel)}, ${p.weight} ${escapeHtml(p.weightUnit)})</strong></div>
        </div>
      `;
    }
  } catch (_) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = 'Unable to query pickup status right now.';
    }
  }
}

const RATES_PACKAGE_RULES_UI = {
  document: {
    title: 'Document Courier Rules:',
    note: 'Non-negotiable documents, contracts, academic transcripts & certificates up to 5 kg (11 lb) per envelope.',
    showDimensions: false
  },
  parcel: {
    title: 'Parcel Shipping Rules:',
    note: 'Personal gifts, excess baggage & commercial samples up to 70 kg (154 lb) per piece. Volumetric divisor: L × W × H (cm) ÷ 5000.',
    showDimensions: true
  },
  medicine: {
    title: 'Medicine Courier Compliance:',
    note: "Prescription & OTC pharmaceuticals up to 90-day personal supply (max 70 kg). Requires valid Doctor's Prescription & Pharmacy Invoice.",
    showDimensions: true
  },
  ecommerce: {
    title: 'E-commerce Logistics Rules:',
    note: 'Cross-border D2C store parcels & CSB-V commercial exports up to 70 kg per parcel. Volumetric divisor: L × W × H (cm) ÷ 5000.',
    showDimensions: true
  },
  bulk: {
    title: 'Bulk & Commercial Cargo Rules:',
    note: 'Palletized commercial freight, skids & master cartons up to 5,000 kg. Air cargo volumetric divisor: L × W × H (cm) ÷ 6000.',
    showDimensions: true
  },
  other: {
    title: 'Specialized Cargo Rules:',
    note: 'Fragile, oversized, or custom-classified consignments up to 100 kg. Volumetric divisor: L × W × H (cm) ÷ 5000.',
    showDimensions: true
  }
};

function updateRatesPackageContextUI(pkgType) {
  const bar = document.getElementById('ratesPackageContextBar');
  const titleEl = document.getElementById('ratesPkgRuleTitle');
  const textEl = document.getElementById('ratesPkgRuleText');
  const dimGroup = document.getElementById('ratesDimensionsGroup');
  if (!bar) return;

  const info = RATES_PACKAGE_RULES_UI[pkgType] || RATES_PACKAGE_RULES_UI.document;
  bar.hidden = false;
  if (titleEl) titleEl.textContent = info.title;
  if (textEl) textEl.textContent = info.note;
  if (dimGroup) dimGroup.hidden = !info.showDimensions;
}

async function handleUpdateRatesParameters() {
  const errEl = document.getElementById('ratesFormError');
  const check = validateQuoteInputs();

  if (!check.valid) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = check.error;
    }
    const weightInput = document.getElementById('weightInput');
    if (weightInput) weightInput.focus();
    return;
  }

  const pkgType = (appState.selectedPackage || appState.packageType || 'document').toLowerCase();
  const lenRaw = (document.getElementById('ratesLengthInput')?.value || '').trim();
  const widRaw = (document.getElementById('ratesWidthInput')?.value || '').trim();
  const hgtRaw = (document.getElementById('ratesHeightInput')?.value || '').trim();
  if (pkgType !== 'document' && (lenRaw || widRaw || hgtRaw)) {
    const l = parseFloat(lenRaw);
    const w = parseFloat(widRaw);
    const h = parseFloat(hgtRaw);
    if (!Number.isFinite(l) || l <= 0 || !Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = 'When entering optional dimensions, Length, Width, and Height (cm) must all be positive numbers greater than 0.';
      }
      return;
    }
  }

  if (errEl) {
    errEl.hidden = true;
    errEl.textContent = '';
  }

  await renderDedicatedRatesPage(true);
  showToast('Rate query parameters updated!');
}

async function renderDedicatedRatesPage(fromUserAction = false) {
  const weightInput = document.getElementById('weightInput');
  const rawVal = weightInput ? String(weightInput.value).trim() : String(appState.weight || '1').trim();
  const parsedWeight = parseFloat(rawVal);
  const weight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : (parseFloat(appState.weight) > 0 ? parseFloat(appState.weight) : 1);
  const unit = appState.weightUnit || 'kg';
  const pkgType = (appState.selectedPackage || appState.packageType || 'document').toLowerCase();
  const pkgLabel = (PACKAGE_TYPE_CONFIG[pkgType] && PACKAGE_TYPE_CONFIG[pkgType].label) || 'Document';

  updateRatesPackageContextUI(pkgType);

  const check = validateQuoteInputs();
  const errEl = document.getElementById('ratesFormError');
  if (!check.valid) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = check.error;
    }
    return;
  }
  if (errEl && !fromUserAction) {
    errEl.hidden = true;
    errEl.textContent = '';
  }

  syncUrlWithCurrentForm();

  // Update action links on the Rates page to carry current parameters
  document.querySelectorAll('.js-open-quote-with-params').forEach(link => {
    link.href = buildQuoteUrl('/quote');
  });
  document.querySelectorAll('.js-proceed-pickup-link').forEach(link => {
    link.href = buildQuoteUrl('/schedule-pickup');
  });

  const actualKg = unit === 'lb' ? +(weight * 0.453592).toFixed(2) : +weight.toFixed(2);
  const actualLb = unit === 'lb' ? +weight.toFixed(2) : +(weight * 2.20462).toFixed(2);

  const summaryEl = document.getElementById('ratesQuerySummary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="summary-row"><span>Origin Country</span><strong>${escapeHtml(appState.fromCountry.name)} (${escapeHtml(appState.fromCountry.code)})</strong></div>
      <div class="summary-row"><span>Destination Country</span><strong>${escapeHtml(appState.toCountry.name)} (${escapeHtml(appState.toCountry.code)})</strong></div>
      <div class="summary-row"><span>Package Type</span><strong>${escapeHtml(pkgLabel)} (${escapeHtml(pkgType)})</strong></div>
      <div class="summary-row"><span>Entered Weight &amp; Unit</span><strong>${escapeHtml(String(weight))} ${escapeHtml(unit)} (${actualKg} kg / ${actualLb} lb)</strong></div>
    `;
  }

  // Query backend /api/rates for verified service tiers & chargeable weight calculation
  const tiersContainer = document.getElementById('ratesServiceTiersContainer');
  const statusBannerText = document.getElementById('ratesApiStatusText');
  try {
    const qs = new URLSearchParams({
      from: appState.fromCountry.name,
      to: appState.toCountry.name,
      type: pkgType,
      weight: String(weight),
      unit
    });
    const lenRaw = (document.getElementById('ratesLengthInput')?.value || '').trim();
    const widRaw = (document.getElementById('ratesWidthInput')?.value || '').trim();
    const hgtRaw = (document.getElementById('ratesHeightInput')?.value || '').trim();
    if (pkgType !== 'document' && lenRaw && widRaw && hgtRaw) {
      qs.set('length', lenRaw);
      qs.set('width', widRaw);
      qs.set('height', hgtRaw);
    }

    const res = await fetch(`/api/rates?${qs.toString()}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data && data.ok && data.query) {
      const q = data.query;
      if (summaryEl) {
        summaryEl.innerHTML = `
          <div class="summary-row"><span>Origin Country</span><strong>${escapeHtml(appState.fromCountry.name)} (${escapeHtml(appState.fromCountry.code)})</strong></div>
          <div class="summary-row"><span>Destination Country</span><strong>${escapeHtml(appState.toCountry.name)} (${escapeHtml(appState.toCountry.code)})</strong></div>
          <div class="summary-row"><span>Package Type</span><strong>${escapeHtml(q.typeLabel)} (${escapeHtml(q.type)})</strong></div>
          <div class="summary-row"><span>Entered Weight &amp; Unit</span><strong>${escapeHtml(String(q.weight))} ${escapeHtml(q.unit)} (${q.actualWeightKg} kg / ${q.actualWeightLb} lb)</strong></div>
          ${q.volumetricWeightKg !== null ? `<div class="summary-row"><span>Volumetric Weight</span><strong>${q.volumetricWeightKg} kg</strong></div>` : ''}
          <div class="summary-row total"><span>Chargeable Weight</span><strong>${q.chargeableWeightKg} kg (${q.chargeableWeightLb} lb)</strong></div>
        `;
      }
      if (tiersContainer && Array.isArray(data.serviceTiers)) {
        tiersContainer.innerHTML = `
          <h3 style="font-size:15px; font-weight:700; color:var(--slate-900); margin-bottom:10px;">Available Courier &amp; Freight Service Tiers (${escapeHtml(appState.fromCountry.name)} ➔ ${escapeHtml(appState.toCountry.name)})</h3>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px;">
            ${data.serviceTiers.map(tier => `
              <div style="border:1px solid var(--slate-200); border-radius:12px; padding:14px; background:#f8fafc;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:6px;">
                  <strong style="font-size:14px; color:var(--slate-900);">${escapeHtml(tier.name)}</strong>
                  <span class="api-status-pill" style="font-size:11px;">${escapeHtml(tier.transitTime)}</span>
                </div>
                <p style="font-size:12.5px; color:var(--slate-600); margin:0 0 6px;">
                  ${escapeHtml(tier.pickupMode)} • ${escapeHtml(tier.customsClearance)}
                </p>
                <div style="font-size:12px; color:var(--slate-700); display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--slate-200); padding-top:8px; margin-top:6px;">
                  <span>Chargeable: <strong>${tier.chargeableWeightKg} kg</strong></span>
                  <span style="color:var(--primary-red); font-weight:600;">${escapeHtml(tier.rateStatus)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
      if (statusBannerText && data.statusMessage) {
        statusBannerText.textContent = data.statusMessage;
      }
    } else if (data && data.error && errEl) {
      errEl.hidden = false;
      errEl.textContent = data.error;
    }
  } catch (_) {
    // Non-blocking fallback
  }

  const tbody = document.getElementById('ratesComparisonBody');
  if (!tbody) return;

  tbody.innerHTML = supportedCountries.filter(c => c.code !== appState.fromCountry.code).map(c => {
    const query = [
      `from=${encodeURIComponent(appState.fromCountry.name)}`,
      `to=${encodeURIComponent(c.name)}`,
      `type=${encodeURIComponent(pkgType)}`,
      `weight=${encodeURIComponent(String(weight))}`,
      `unit=${encodeURIComponent(unit)}`
    ].join('&');
    const quoteLink = `/quote?${query}`;
    const isSelectedDest = c.code === appState.toCountry.code;
    return `
      <tr class="${isSelectedDest ? 'is-selected-row' : ''}">
        <td>
          <div class="rate-country-cell">
            <span class="flag-icon">${getFlagSvg(c.code)}</span>
            <div>
              <strong>${escapeHtml(c.name)}${isSelectedDest ? ' (Selected)' : ''}</strong>
              <small>${escapeHtml(c.zone)}</small>
            </div>
          </div>
        </td>
        <td><strong>${escapeHtml(pkgLabel)}</strong><small>${escapeHtml(String(weight))} ${escapeHtml(unit)} (${actualKg} kg)</small></td>
        <td><span class="api-status-pill">Requires Rate Calculation API</span></td>
        <td>
          <a href="${quoteLink}" class="btn btn-primary btn-sm">Open Route Quote</a>
        </td>
      </tr>
    `;
  }).join('');
}

/* --------------------------------------------------------------------------
   Quote calculation
   -------------------------------------------------------------------------- */
function calculateQuote() {
  navigateToQuotePage();
}

function highlightRateCard(element) {
  document.querySelectorAll('.rate-card').forEach(el => el.classList.remove('selected'));
  element.classList.add('selected');
}

function closeQuoteModal() {
  closeModal('quoteResultModal');
}

function proceedToBooking() {
  closeModal('quoteResultModal');
  window.location.href = buildQuoteUrl('/schedule-pickup');
}

/* --------------------------------------------------------------------------
   Tracking & pickup
   -------------------------------------------------------------------------- */
function simulateTracking() {
  navigateToTrackPage();
}

function closeTrackingModal() {
  closeModal('trackingModal');
}

function simulatePickup() {
  navigateToPickupPage();
}

/* --------------------------------------------------------------------------
   Destinations, services, auth, search
   -------------------------------------------------------------------------- */
// Global Destinations Grid Render
function renderDestinationsGrid() {
  const grid = document.getElementById('destinationsGrid');
  if (!grid) return;

  grid.innerHTML = '';
  supportedCountries.forEach(c => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'dest-card';
    card.innerHTML = `
      <span class="flag-icon">${getFlagSvg(c.code)}</span>
      <span>
        <span class="dest-name" style="display:block">${c.name}</span>
        <span class="dest-meta" style="display:block">${c.zone} • 3-5 days</span>
      </span>
    `;
    card.addEventListener('click', () => {
      appState.toCountry = { code: c.code, name: c.name, flagSvg: getFlagSvg(c.code) };
      updateCountryUI();
      closeModal('countriesModal');
      switchMainTab('quote');
      showToast(`Destination set to ${c.name}`);
    });
    grid.appendChild(card);
  });
}

function openCountriesModal() {
  closeMobileNav();
  openModal('countriesModal');
}

function closeCountriesModal() {
  closeModal('countriesModal');
}

// Services Details
function openServicesModal() {
  openCountriesModal();
}

function navigateToServicePage(serviceType) {
  const normalized = String(serviceType || 'document').toLowerCase();
  if (!['document', 'parcel', 'medicine', 'ecommerce', 'bulk', 'other'].includes(normalized)) return;

  appState.packageType = normalized;
  appState.selectedPackage = normalized;

  const pkgBtn = document.querySelector(`.pkg-btn[data-type="${normalized}"]`);
  selectPackageType(normalized, pkgBtn, false);

  const targetUrl = buildQuoteUrl('/quote');
  window.location.href = targetUrl;
}

function openServiceDetail(serviceType) {
  navigateToServicePage(serviceType);
}

// Auth Modal & Business Solutions Navigation
const BUSINESS_SOLUTIONS_CONFIG = {
  'volume-discounts': {
    route: '/business/volume-discounts',
    title: 'Volume Discounts — Business Shipping Programme | TRISYS EXPRESS',
    breadcrumb: 'Volume Discounts',
    badge: 'Corporate Volume Programme',
    heading: 'Volume Discounts Programme',
    subtitle: 'Tiered commercial shipping brackets based on your expected monthly shipments and cumulative chargeable weight.'
  },
  'ecommerce-integrations': {
    route: '/business/ecommerce-integrations',
    title: 'E-commerce Integrations — Shopify & WooCommerce | TRISYS EXPRESS',
    breadcrumb: 'E-commerce Integrations',
    badge: 'Store Plugins & Fulfilment API',
    heading: 'E-commerce Store Integrations',
    subtitle: 'Connect Shopify, WooCommerce, or custom storefronts for order sync, customs invoice prep, and label generation.'
  },
  'account-manager': {
    route: '/business/account-manager',
    title: 'Dedicated Account Manager — Corporate Support | TRISYS EXPRESS',
    breadcrumb: 'Dedicated Account Manager',
    badge: 'Single Point of Contact',
    heading: 'Dedicated Account Manager',
    subtitle: 'One dedicated logistics specialist for multi-city pickups, export customs clearance, and priority claims.'
  },
  'credit-billing': {
    route: '/business/credit-billing',
    title: 'Credit & Monthly Billing — GST Invoicing | TRISYS EXPRESS',
    breadcrumb: 'Credit & Monthly Billing',
    badge: 'Corporate Invoicing & Credit',
    heading: 'Credit & Monthly Consolidated Billing',
    subtitle: 'Consolidated GST-compliant tax invoicing and structured corporate credit underwriting.'
  },
  'register': {
    route: '/business/register',
    title: 'Open Business Account — Corporate Registration | TRISYS EXPRESS',
    breadcrumb: 'Open Business Account',
    badge: 'Corporate Account Onboarding',
    heading: 'Open a Trisys Express Business Account',
    subtitle: 'Submit your corporate KYC and shipping profile to apply for a verified business shipping account.'
  },
  'admin': {
    route: '/business/admin',
    title: 'Admin Review Portal — Business Submissions | TRISYS EXPRESS',
    breadcrumb: 'Admin Review Portal',
    badge: 'Authorized Administrator Portal',
    heading: 'Business Applications & Enquiries Review',
    subtitle: 'Restricted administrator dashboard to review and update the status of business applications and enquiries.'
  }
};

function navigateBusinessSolution(action) {
  closeModal('businessModal');
  const key = String(action || 'volume-discounts').trim().toLowerCase();

  if (key === 'bulk' || key === 'bulk-commercial') {
    navigateToServicePage('bulk');
    return;
  }

  const cfg = BUSINESS_SOLUTIONS_CONFIG[key] || BUSINESS_SOLUTIONS_CONFIG['volume-discounts'];
  const resolvedKey = BUSINESS_SOLUTIONS_CONFIG[key] ? key : 'volume-discounts';

  if (document.body.dataset.page === 'business') {
    switchBusinessSection(resolvedKey, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.location.href = cfg.route;
  }
}

function resolveBusinessSectionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const sectionParam = (params.get('section') || '').trim().toLowerCase();
  if (sectionParam && BUSINESS_SOLUTIONS_CONFIG[sectionParam]) {
    return sectionParam;
  }

  const path = (window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
  const pathMap = {
    '/business/volume-discounts': 'volume-discounts',
    '/volume-discounts': 'volume-discounts',
    '/business/ecommerce-integrations': 'ecommerce-integrations',
    '/ecommerce-integrations': 'ecommerce-integrations',
    '/business/account-manager': 'account-manager',
    '/account-manager': 'account-manager',
    '/dedicated-account-manager': 'account-manager',
    '/business/credit-billing': 'credit-billing',
    '/credit-billing': 'credit-billing',
    '/credit-monthly-billing': 'credit-billing',
    '/business/register': 'register',
    '/open-business-account': 'register',
    '/business-account': 'register',
    '/business/admin': 'admin',
    '/admin/business': 'admin'
  };
  return pathMap[path] || 'volume-discounts';
}

function renderDedicatedBusinessPage() {
  const sectionKey = resolveBusinessSectionFromUrl();
  switchBusinessSection(sectionKey, false);
}

function switchBusinessSection(sectionKey, pushHistory = false) {
  if (sectionKey === 'bulk') {
    navigateToServicePage('bulk');
    return;
  }

  const key = BUSINESS_SOLUTIONS_CONFIG[sectionKey] ? sectionKey : 'volume-discounts';
  const cfg = BUSINESS_SOLUTIONS_CONFIG[key];

  if (pushHistory && window.location.pathname !== cfg.route) {
    window.history.pushState({ businessSection: key }, '', cfg.route);
  }

  document.title = cfg.title;
  setActiveNav('business');

  const breadcrumbEl = document.getElementById('bizBreadcrumbCurrent');
  if (breadcrumbEl) breadcrumbEl.textContent = cfg.breadcrumb;

  const badgeEl = document.getElementById('bizHeroBadge');
  if (badgeEl) badgeEl.textContent = cfg.badge;

  const titleEl = document.getElementById('bizHeroTitle');
  if (titleEl) titleEl.textContent = cfg.heading;

  const subEl = document.getElementById('bizHeroSubtitle');
  if (subEl) subEl.textContent = cfg.subtitle;

  const shareInput = document.getElementById('shareUrlInput');
  if (shareInput) shareInput.value = window.location.href;

  document.querySelectorAll('#bizSubnavTabs .biz-tab-pill').forEach(pill => {
    const isMatch = pill.dataset.bizSection === key;
    pill.classList.toggle('active', isMatch);
    if (isMatch) pill.setAttribute('aria-current', 'page');
    else pill.removeAttribute('aria-current');
  });

  document.querySelectorAll('.biz-page-section').forEach(sec => {
    sec.hidden = sec.id !== `bizSection-${key}`;
  });

  if (key === 'volume-discounts') {
    updateVolumeBracketPreview();
  }
}

function updateVolumeBracketPreview() {
  const summaryBox = document.getElementById('volumeCalcSummary');
  if (!summaryBox) return;

  const shipments = Math.max(1, parseInt(document.getElementById('volMonthlyShipments')?.value || '75', 10) || 1);
  const avgWeight = Math.max(0.1, parseFloat(document.getElementById('volAvgWeight')?.value || '2.5') || 1);
  const category = document.getElementById('volPrimaryCategory')?.value || 'E-commerce Parcels (CSB-V / D2C)';

  let bracket = 'Tier 1: Starter Business (1–49 shipments/mo)';
  if (shipments >= 500) bracket = 'Tier 4: Enterprise Custom Contract (500+ shipments/mo)';
  else if (shipments >= 200) bracket = 'Tier 3: High-Volume Corporate (200–499 shipments/mo)';
  else if (shipments >= 50) bracket = 'Tier 2: Growth Commercial (50–199 shipments/mo)';

  const totalMonthlyKg = +(shipments * avgWeight).toFixed(2);

  summaryBox.innerHTML = `
    <div class="summary-row"><span>Expected Monthly Shipments</span><strong>${shipments} shipments / mo</strong></div>
    <div class="summary-row"><span>Average Shipment Weight</span><strong>${avgWeight} kg</strong></div>
    <div class="summary-row"><span>Estimated Monthly Volume</span><strong>${totalMonthlyKg} kg / month</strong></div>
    <div class="summary-row"><span>Primary Category</span><strong>${escapeHtml(category)}</strong></div>
    <div class="summary-row total"><span>Qualifying Volume Bracket</span><strong>${escapeHtml(bracket)}</strong></div>
  `;
}

async function submitVolumeDiscountForm() {
  if (appState.isSubmittingVolume) return;
  const companyEl = document.getElementById('volCompanyName');
  const contactEl = document.getElementById('volContactName');
  const emailEl = document.getElementById('volEmail');
  const phoneEl = document.getElementById('volPhone');
  const shipmentsEl = document.getElementById('volMonthlyShipments');
  const weightEl = document.getElementById('volAvgWeight');
  const categoryEl = document.getElementById('volPrimaryCategory');
  const corridorsEl = document.getElementById('volCorridors');
  const notesEl = document.getElementById('volNotes');
  const errorBox = document.getElementById('volFormError');
  const confirmBox = document.getElementById('volConfirmationBox');
  const submitBtn = document.getElementById('volSubmitBtn');

  [companyEl, contactEl, emailEl, phoneEl, shipmentsEl, weightEl, corridorsEl].forEach(el => {
    if (el) el.classList.remove('has-field-error');
  });

  const fail = (el, msg) => {
    if (errorBox) { errorBox.hidden = false; errorBox.textContent = msg; }
    if (confirmBox) confirmBox.hidden = true;
    if (el) { el.classList.add('has-field-error'); el.focus(); }
  };

  const companyName = (companyEl?.value || '').trim();
  const contactName = (contactEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  const phone = (phoneEl?.value || '').trim();
  const monthlyShipments = parseInt(shipmentsEl?.value || '', 10);
  const avgWeightKg = parseFloat(weightEl?.value || '');
  const primaryCategory = (categoryEl?.value || '').trim();
  const destinationCorridors = (corridorsEl?.value || '').trim();
  const notes = (notesEl?.value || '').trim();

  if (!companyName) return fail(companyEl, 'Please enter your Business or Company Name.');
  if (!contactName) return fail(contactEl, 'Please enter the Contact Person Name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(emailEl, 'Please enter a valid business email address.');
  if (phone.replace(/\D/g, '').length < 7) return fail(phoneEl, 'Please enter a valid contact phone number (at least 7 digits).');
  if (!Number.isFinite(monthlyShipments) || monthlyShipments < 1) return fail(shipmentsEl, 'Expected monthly shipments must be at least 1.');
  if (!Number.isFinite(avgWeightKg) || avgWeightKg <= 0) return fail(weightEl, 'Average weight per shipment (kg) must be greater than 0.');
  if (!destinationCorridors) return fail(corridorsEl, 'Please enter your primary destination countries or corridors.');

  if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
  appState.isSubmittingVolume = true;
  const origHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting Volume Pricing Request...</span>';
  }

  try {
    const resp = await fetch('/api/business/volume-discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName,
        contactName,
        email,
        phone,
        monthlyShipments,
        avgWeightKg,
        primaryCategory,
        destinationCorridors,
        notes
      })
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      return fail(null, (data && data.error) || `Request failed (${resp.status}). Please verify your inputs.`);
    }

    const rec = data.record;
    if (confirmBox) {
      confirmBox.hidden = false;
      confirmBox.innerHTML = `
        <div class="pickup-confirmed-banner">
          <strong>Volume Pricing Request Recorded — Reference: ${escapeHtml(rec.referenceId)} (Status: ${escapeHtml(rec.status)})</strong>
          <p style="margin-top:6px;">
            Company <b>${escapeHtml(rec.companyName)}</b> (${escapeHtml(rec.contactName)} • ${escapeHtml(rec.email)}) —
            <b>${rec.monthlyShipments} shipments/month</b> (~<b>${rec.estimatedMonthlyWeightKg} kg/mo</b>) classified under <b>${escapeHtml(rec.volumeBracket)}</b> for <b>${escapeHtml(rec.destinationCorridors)}</b>.
          </p>
          <p style="margin-top:6px;"><em>${escapeHtml(data.message)}</em></p>
        </div>
      `;
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(`Volume pricing request ${rec.referenceId} saved!`);
  } catch (err) {
    fail(null, 'Unable to reach the server. Your entered volume details have been preserved—please try again.');
  } finally {
    appState.isSubmittingVolume = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}

async function submitIntegrationRequestForm() {
  if (appState.isSubmittingIntegration) return;
  const companyEl = document.getElementById('intCompanyName');
  const contactEl = document.getElementById('intContactName');
  const emailEl = document.getElementById('intEmail');
  const phoneEl = document.getElementById('intPhone');
  const platformEl = document.getElementById('intPlatform');
  const urlEl = document.getElementById('intStoreUrl');
  const ordersEl = document.getElementById('intMonthlyOrders');
  const notesEl = document.getElementById('intNotes');
  const errorBox = document.getElementById('intFormError');
  const confirmBox = document.getElementById('intConfirmationBox');
  const submitBtn = document.getElementById('intSubmitBtn');

  [companyEl, contactEl, emailEl, phoneEl, urlEl].forEach(el => {
    if (el) el.classList.remove('has-field-error');
  });

  const fail = (el, msg) => {
    if (errorBox) { errorBox.hidden = false; errorBox.textContent = msg; }
    if (confirmBox) confirmBox.hidden = true;
    if (el) { el.classList.add('has-field-error'); el.focus(); }
  };

  const companyName = (companyEl?.value || '').trim();
  const contactName = (contactEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  const phone = (phoneEl?.value || '').trim();
  const platform = (platformEl?.value || '').trim();
  const storeUrl = (urlEl?.value || '').trim();
  const monthlyOrders = (ordersEl?.value || '').trim();
  const notes = (notesEl?.value || '').trim();
  const features = Array.from(document.querySelectorAll('input[name="intFeature"]:checked')).map(cb => cb.value);

  if (!companyName) return fail(companyEl, 'Please enter your Store or Brand Name.');
  if (!contactName) return fail(contactEl, 'Please enter the Contact Person Name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(emailEl, 'Please enter a valid business email address.');
  if (phone.replace(/\D/g, '').length < 7) return fail(phoneEl, 'Please enter a valid phone number (at least 7 digits).');
  if (!storeUrl || !storeUrl.includes('.')) return fail(urlEl, 'Please enter a valid store domain or URL (e.g. https://yourstore.myshopify.com).');
  if (!features.length) return fail(null, 'Please select at least one required integration capability.');

  if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
  appState.isSubmittingIntegration = true;
  const origHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting Integration Request...</span>';
  }

  try {
    const resp = await fetch('/api/business/integration-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName,
        contactName,
        email,
        phone,
        platform,
        storeUrl,
        monthlyOrders,
        features,
        notes
      })
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      return fail(null, (data && data.error) || `Request failed (${resp.status}). Please verify your inputs.`);
    }

    const rec = data.record;
    if (confirmBox) {
      confirmBox.hidden = false;
      confirmBox.innerHTML = `
        <div class="pickup-confirmed-banner">
          <strong>Integration Setup Request Recorded — Reference: ${escapeHtml(rec.referenceId)} (Status: ${escapeHtml(rec.status)})</strong>
          <p style="margin-top:6px;">
            Store <b>${escapeHtml(rec.companyName)}</b> on <b>${escapeHtml(rec.platform)}</b> (${escapeHtml(rec.storeUrl)}) —
            Capabilities requested: <b>${escapeHtml(rec.features.join(', '))}</b>.
          </p>
          <p style="margin-top:6px;"><em>${escapeHtml(data.message)}</em></p>
        </div>
      `;
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(`Integration request ${rec.referenceId} saved!`);
  } catch (err) {
    fail(null, 'Unable to reach the server. Your store integration details have been preserved—please try again.');
  } finally {
    appState.isSubmittingIntegration = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}

async function submitAccountManagerForm() {
  if (appState.isSubmittingAccountManager) return;
  const companyEl = document.getElementById('amCompanyName');
  const contactEl = document.getElementById('amContactName');
  const emailEl = document.getElementById('amEmail');
  const phoneEl = document.getElementById('amPhone');
  const shipmentsEl = document.getElementById('amMonthlyShipments');
  const reqEl = document.getElementById('amRequirements');
  const pickupEl = document.getElementById('amPickupRegions');
  const deliveryEl = document.getElementById('amDeliveryRegions');
  const notesEl = document.getElementById('amNotes');
  const errorBox = document.getElementById('amFormError');
  const confirmBox = document.getElementById('amConfirmationBox');
  const submitBtn = document.getElementById('amSubmitBtn');

  [companyEl, contactEl, emailEl, phoneEl, pickupEl, deliveryEl].forEach(el => {
    if (el) el.classList.remove('has-field-error');
  });

  const fail = (el, msg) => {
    if (errorBox) { errorBox.hidden = false; errorBox.textContent = msg; }
    if (confirmBox) confirmBox.hidden = true;
    if (el) { el.classList.add('has-field-error'); el.focus(); }
  };

  const companyName = (companyEl?.value || '').trim();
  const contactName = (contactEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  const phone = (phoneEl?.value || '').trim();
  const monthlyShipments = (shipmentsEl?.value || '').trim();
  const shippingRequirements = (reqEl?.value || '').trim();
  const pickupRegions = (pickupEl?.value || '').trim();
  const deliveryRegions = (deliveryEl?.value || '').trim();
  const notes = (notesEl?.value || '').trim();

  if (!companyName) return fail(companyEl, 'Please enter your Business Name.');
  if (!contactName) return fail(contactEl, "Please enter the Contact Person's Name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(emailEl, 'Please enter a valid business email address.');
  if (phone.replace(/\D/g, '').length < 7) return fail(phoneEl, 'Please enter a valid contact phone number (at least 7 digits).');
  if (!pickupRegions) return fail(pickupEl, 'Please enter your pickup cities or regions in India.');
  if (!deliveryRegions) return fail(deliveryEl, 'Please enter your destination delivery regions or countries.');

  if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
  appState.isSubmittingAccountManager = true;
  const origHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting Account Manager Request...</span>';
  }

  try {
    const resp = await fetch('/api/business/account-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName,
        contactName,
        email,
        phone,
        monthlyShipments,
        shippingRequirements,
        pickupRegions,
        deliveryRegions,
        notes
      })
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      return fail(null, (data && data.error) || `Request failed (${resp.status}). Please verify your inputs.`);
    }

    const rec = data.record;
    if (confirmBox) {
      confirmBox.hidden = false;
      confirmBox.innerHTML = `
        <div class="pickup-confirmed-banner">
          <strong>Dedicated Account Manager Enquiry Recorded — Reference: ${escapeHtml(rec.referenceId)} (Status: ${escapeHtml(rec.status)})</strong>
          <p style="margin-top:6px;">
            Business <b>${escapeHtml(rec.companyName)}</b> (${escapeHtml(rec.contactName)} • ${escapeHtml(rec.email)}) —
            Pickup Regions: <b>${escapeHtml(rec.pickupRegions)}</b> ➔ Delivery Regions: <b>${escapeHtml(rec.deliveryRegions)}</b> (${escapeHtml(rec.shippingRequirements)}).
          </p>
          <p style="margin-top:6px;"><em>${escapeHtml(data.message)}</em></p>
        </div>
      `;
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(`Account manager request ${rec.referenceId} saved!`);
  } catch (err) {
    fail(null, 'Unable to reach the server. Your entered details have been preserved—please try again.');
  } finally {
    appState.isSubmittingAccountManager = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}

async function submitCreditBillingForm() {
  if (appState.isSubmittingCredit) return;
  const companyEl = document.getElementById('crdCompanyName');
  const contactEl = document.getElementById('crdContactName');
  const emailEl = document.getElementById('crdEmail');
  const phoneEl = document.getElementById('crdPhone');
  const gstinEl = document.getElementById('crdGstin');
  const volumeEl = document.getElementById('crdMonthlyVolume');
  const addrEl = document.getElementById('crdBillingAddress');
  const cycleEl = document.getElementById('crdBillingCycle');
  const notesEl = document.getElementById('crdNotes');
  const errorBox = document.getElementById('crdFormError');
  const confirmBox = document.getElementById('crdConfirmationBox');
  const submitBtn = document.getElementById('crdSubmitBtn');

  [companyEl, contactEl, emailEl, phoneEl, gstinEl, addrEl].forEach(el => {
    if (el) el.classList.remove('has-field-error');
  });

  const fail = (el, msg) => {
    if (errorBox) { errorBox.hidden = false; errorBox.textContent = msg; }
    if (confirmBox) confirmBox.hidden = true;
    if (el) { el.classList.add('has-field-error'); el.focus(); }
  };

  const companyName = (companyEl?.value || '').trim();
  const contactName = (contactEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  const phone = (phoneEl?.value || '').trim();
  const gstin = (gstinEl?.value || '').trim().toUpperCase();
  const monthlyVolume = (volumeEl?.value || '').trim();
  const billingAddress = (addrEl?.value || '').trim();
  const billingCycle = (cycleEl?.value || '').trim();
  const notes = (notesEl?.value || '').trim();

  if (!companyName) return fail(companyEl, 'Please enter your Company or Business Name.');
  if (!contactName) return fail(contactEl, 'Please enter the Billing Contact Name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(emailEl, 'Please enter a valid billing email address.');
  if (phone.replace(/\D/g, '').length < 7) return fail(phoneEl, 'Please enter a valid billing phone number (at least 7 digits).');
  if (!/^[0-9A-Z\-]{6,20}$/.test(gstin)) return fail(gstinEl, 'Please enter a valid GSTIN or tax registration number (6–20 alphanumeric characters).');
  if (!billingAddress) return fail(addrEl, 'Please enter your registered business billing address.');

  if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
  appState.isSubmittingCredit = true;
  const origHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting Credit Application...</span>';
  }

  try {
    const resp = await fetch('/api/business/credit-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName,
        contactName,
        email,
        phone,
        gstin,
        monthlyVolume,
        billingAddress,
        billingCycle,
        notes
      })
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      return fail(null, (data && data.error) || `Application failed (${resp.status}). Please verify your inputs.`);
    }

    const rec = data.record;
    if (confirmBox) {
      confirmBox.hidden = false;
      confirmBox.innerHTML = `
        <div class="pickup-confirmed-banner">
          <strong>Credit &amp; Monthly Billing Application Submitted — Reference: ${escapeHtml(rec.referenceId)} (Status: ${escapeHtml(rec.status)})</strong>
          <p style="margin-top:6px;">
            Company <b>${escapeHtml(rec.companyName)}</b> (GSTIN: <b>${escapeHtml(rec.gstin)}</b> • Contact: ${escapeHtml(rec.contactName)}) —
            Requested Billing Mode: <b>${escapeHtml(rec.billingCycle)}</b>.
          </p>
          <p style="margin-top:6px;"><em>${escapeHtml(data.message)}</em></p>
        </div>
      `;
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const lookupRef = document.getElementById('lookupRefId');
    const lookupEmail = document.getElementById('lookupEmail');
    if (lookupRef) lookupRef.value = rec.referenceId;
    if (lookupEmail) lookupEmail.value = rec.email;
    showToast(`Credit application ${rec.referenceId} submitted!`);
  } catch (err) {
    fail(null, 'Unable to reach the server. Your application details have been preserved—please try again.');
  } finally {
    appState.isSubmittingCredit = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}

async function lookupBusinessApplicationStatus() {
  const refEl = document.getElementById('lookupRefId');
  const emailEl = document.getElementById('lookupEmail');
  const errEl = document.getElementById('lookupStatusError');
  const resEl = document.getElementById('lookupStatusResult');

  const ref = (refEl?.value || '').trim().toUpperCase();
  const email = (emailEl?.value || '').trim().toLowerCase();

  if (!ref || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = 'Please enter both your Reference ID (e.g. TRISYS-CRD-XXXXXX) and registered business email.';
    }
    if (resEl) resEl.hidden = true;
    return;
  }

  if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
  try {
    const resp = await fetch(`/api/business/application-status?ref=${encodeURIComponent(ref)}&email=${encodeURIComponent(email)}`);
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = (data && data.error) || 'No matching application found.';
      }
      if (resEl) resEl.hidden = true;
      return;
    }
    const rec = data.record;
    const statusClass = 'status-' + String(rec.status || 'Pending').toLowerCase().replace(/\s+/g, '-');
    if (resEl) {
      resEl.hidden = false;
      resEl.innerHTML = `
        <div class="pickup-order-summary">
          <div class="summary-row"><span>Reference ID</span><strong>${escapeHtml(rec.referenceId)}</strong></div>
          <div class="summary-row"><span>Type</span><strong>${escapeHtml(rec.requestTypeLabel || rec.requestType)}</strong></div>
          <div class="summary-row"><span>Company</span><strong>${escapeHtml(rec.companyName)}</strong></div>
          <div class="summary-row"><span>Current Status</span><span class="status-badge ${escapeHtml(statusClass)}">${escapeHtml(rec.status)}</span></div>
          ${rec.adminNotes ? `<div class="summary-row"><span>Admin Review Note</span><strong>${escapeHtml(rec.adminNotes)}</strong></div>` : ''}
        </div>
      `;
    }
  } catch (err) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = 'Unable to query application status at this moment.';
    }
  }
}

async function submitBusinessRegistrationForm() {
  if (appState.isSubmittingRegister) return;
  const companyEl = document.getElementById('regCompanyName');
  const typeEl = document.getElementById('regBusinessType');
  const contactEl = document.getElementById('regContactName');
  const emailEl = document.getElementById('regEmail');
  const phoneEl = document.getElementById('regPhone');
  const addrEl = document.getElementById('regAddress');
  const cityEl = document.getElementById('regCity');
  const stateEl = document.getElementById('regState');
  const pinEl = document.getElementById('regPinCode');
  const gstinEl = document.getElementById('regGstin');
  const volEl = document.getElementById('regMonthlyVolume');
  const passEl = document.getElementById('regPassword');
  const confirmPassEl = document.getElementById('regConfirmPassword');
  const termsEl = document.getElementById('regAcceptTerms');
  const errorBox = document.getElementById('regFormError');
  const confirmBox = document.getElementById('regConfirmationBox');
  const submitBtn = document.getElementById('regSubmitBtn');

  [companyEl, typeEl, contactEl, emailEl, phoneEl, addrEl, cityEl, stateEl, pinEl, gstinEl, volEl, passEl, confirmPassEl].forEach(el => {
    if (el) el.classList.remove('has-field-error');
  });

  const fail = (el, msg) => {
    if (errorBox) { errorBox.hidden = false; errorBox.textContent = msg; }
    if (confirmBox) confirmBox.hidden = true;
    if (el) { el.classList.add('has-field-error'); el.focus(); }
  };

  const companyName = (companyEl?.value || '').trim();
  const businessType = (typeEl?.value || '').trim();
  const contactName = (contactEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  const phone = (phoneEl?.value || '').trim();
  const address = (addrEl?.value || '').trim();
  const city = (cityEl?.value || '').trim();
  const state = (stateEl?.value || '').trim();
  const pinCode = (pinEl?.value || '').trim();
  const gstin = (gstinEl?.value || '').trim().toUpperCase();
  const monthlyVolume = (volEl?.value || '').trim();
  const preferredServices = Array.from(document.querySelectorAll('input[name="regService"]:checked')).map(cb => cb.value);
  const password = passEl?.value || '';
  const confirmPassword = confirmPassEl?.value || '';
  const acceptTerms = Boolean(termsEl?.checked);

  if (!companyName) return fail(companyEl, 'Please enter your Company or Business Name.');
  if (!businessType) return fail(typeEl, 'Please select your Business Entity Type.');
  if (!contactName) return fail(contactEl, "Please enter the Contact Person's Full Name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(emailEl, 'Please enter a valid business email address.');
  if (phone.replace(/\D/g, '').length < 7) return fail(phoneEl, 'Please enter a valid contact phone number (at least 7 digits).');
  if (!address) return fail(addrEl, 'Please enter your Business Street Address.');
  if (!city) return fail(cityEl, 'Please enter your City.');
  if (!state) return fail(stateEl, 'Please enter your State or Province.');
  if (!/^[0-9A-Za-z\-\s]{4,10}$/.test(pinCode)) return fail(pinEl, 'Please enter a valid PIN or postal code (4–10 characters).');
  if (!/^[0-9A-Z\-]{6,20}$/.test(gstin)) return fail(gstinEl, 'Please enter a valid GSTIN or tax registration / IEC number (6–20 alphanumeric characters).');
  if (!monthlyVolume) return fail(volEl, 'Please select your estimated monthly shipment volume.');
  if (!preferredServices.length) return fail(null, 'Please select at least one preferred shipping service.');
  if (password.length < 8) return fail(passEl, 'Portal password must be at least 8 characters long.');
  if (password !== confirmPassword) return fail(confirmPassEl, 'Password and confirmation password do not match.');
  if (!acceptTerms) return fail(termsEl, 'Please accept the Business Terms of Service and Privacy Policy to submit your application.');

  if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
  appState.isSubmittingRegister = true;
  const origHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting Business Account Application...</span>';
  }

  try {
    const resp = await fetch('/api/business/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName,
        businessType,
        contactName,
        email,
        phone,
        address,
        city,
        state,
        pinCode,
        gstin,
        monthlyVolume,
        preferredServices,
        password,
        confirmPassword,
        acceptTerms
      })
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      return fail(null, (data && data.error) || `Registration failed (${resp.status}). Please verify your details.`);
    }

    const acc = data.account;
    if (passEl) passEl.value = '';
    if (confirmPassEl) confirmPassEl.value = '';
    if (confirmBox) {
      confirmBox.hidden = false;
      confirmBox.innerHTML = `
        <div class="pickup-confirmed-banner">
          <strong>Business Account Application Submitted — Reference: ${escapeHtml(acc.referenceId)} (Status: ${escapeHtml(acc.status)})</strong>
          <p style="margin-top:6px;">
            Company <b>${escapeHtml(acc.companyName)}</b> (${escapeHtml(acc.businessType)}) • GSTIN: <b>${escapeHtml(acc.gstin)}</b> •
            Contact: <b>${escapeHtml(acc.contactName)}</b> (${escapeHtml(acc.email)}) • Location: <b>${escapeHtml(acc.city)}, ${escapeHtml(acc.state)} ${escapeHtml(acc.pinCode)}</b>.
          </p>
          <p style="margin-top:6px;">
            Preferred Services: <b>${escapeHtml(acc.preferredServices.join(', '))}</b> • Monthly Volume: <b>${escapeHtml(acc.monthlyVolume)}</b>.
          </p>
          <p style="margin-top:6px;"><em>${escapeHtml(data.message)}</em></p>
          <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
            <button type="button" class="btn btn-outline" onclick="openAuthModal('login')">Sign In to Check Application Status</button>
          </div>
        </div>
      `;
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(`Business account application ${acc.referenceId} submitted!`);
  } catch (err) {
    fail(null, 'Unable to reach the server. Your entered business details have been preserved—please try again.');
  } finally {
    appState.isSubmittingRegister = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}

// Admin Review Portal
let adminCachedSubmissions = [];

async function loadAdminSubmissions() {
  const passInput = document.getElementById('adminPasscodeInput');
  const errBox = document.getElementById('adminAuthError');
  const dashBox = document.getElementById('adminDashboardContent');
  const passcode = (passInput?.value || '').trim();

  if (!passcode) {
    if (errBox) {
      errBox.hidden = false;
      errBox.textContent = 'Please enter the Administrator Passcode (X-Admin-Key) to unlock business submissions.';
    }
    return;
  }

  if (errBox) { errBox.hidden = true; errBox.textContent = ''; }
  try {
    const resp = await fetch('/api/admin/business-submissions', {
      headers: { 'X-Admin-Key': passcode }
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      if (errBox) {
        errBox.hidden = false;
        errBox.textContent = (data && data.error) || 'Unauthorized administrator passcode.';
      }
      if (dashBox) dashBox.hidden = true;
      return;
    }

    const combined = [];
    (data.businessAccounts || []).forEach(acc => {
      combined.push({
        referenceId: acc.referenceId,
        requestType: 'business_account',
        requestTypeLabel: 'Business Account Registration',
        companyName: acc.companyName,
        contactInfo: `${acc.contactName} (${acc.email} • ${acc.phone})`,
        details: `${acc.businessType} • GSTIN: ${acc.gstin} • ${acc.city}, ${acc.state} • Vol: ${acc.monthlyVolume}`,
        createdAt: acc.createdAt,
        status: acc.status || 'Pending'
      });
    });
    (data.businessRecords || []).forEach(rec => {
      let detailStr = '';
      if (rec.requestType === 'volume_discount') {
        detailStr = `${rec.monthlyShipments} shipments/mo (${rec.estimatedMonthlyWeightKg} kg/mo) • ${rec.destinationCorridors}`;
      } else if (rec.requestType === 'ecommerce_integration') {
        detailStr = `${rec.platform} (${rec.storeUrl}) • ${(rec.features || []).join(', ')}`;
      } else if (rec.requestType === 'account_manager') {
        detailStr = `${rec.monthlyShipments} • Pickup: ${rec.pickupRegions} ➔ Delivery: ${rec.deliveryRegions}`;
      } else if (rec.requestType === 'credit_billing') {
        detailStr = `GSTIN: ${rec.gstin} • ${rec.billingCycle} • Vol: ${rec.monthlyVolume}`;
      }
      combined.push({
        referenceId: rec.referenceId,
        requestType: rec.requestType,
        requestTypeLabel: rec.requestTypeLabel || rec.requestType,
        companyName: rec.companyName,
        contactInfo: `${rec.contactName} (${rec.email} • ${rec.phone})`,
        details: detailStr,
        createdAt: rec.createdAt,
        status: rec.status || 'Pending'
      });
    });
    (data.serviceEnquiries || []).forEach(enq => {
      combined.push({
        referenceId: enq.enquiryId,
        requestType: 'service_enquiry',
        requestTypeLabel: enq.serviceType === 'bulk' ? 'Bulk & Commercial Cargo Enquiry' : 'E-commerce Fulfilment Enquiry',
        companyName: enq.companyName || enq.storeName || '—',
        contactInfo: `${enq.contactPerson || enq.contactName} (${enq.email} • ${enq.phone})`,
        details: `${enq.originCountry} ➔ ${enq.destCountry} • Chargeable: ${enq.chargeableWeightKg} kg`,
        createdAt: enq.createdAt,
        status: enq.status || 'Pending'
      });
    });
    (data.supportEnquiries || []).forEach(sup => {
      combined.push({
        referenceId: sup.ticketId,
        requestType: 'support_enquiry',
        requestTypeLabel: 'Customer Support Enquiry',
        companyName: sup.companyName || sup.customerName || '—',
        contactInfo: `${sup.customerName} (${sup.email} • ${sup.phone})`,
        details: `${sup.category} • ${sup.subject}`,
        createdAt: sup.createdAt,
        status: sup.status || 'Pending'
      });
    });
    (data.customsDocuments || []).forEach(doc => {
      combined.push({
        referenceId: doc.documentRefId,
        requestType: 'customs_document',
        requestTypeLabel: 'Customs Document Pre-Check',
        companyName: doc.senderName || '—',
        contactInfo: `${doc.senderName} (${doc.email} • ${doc.phone})`,
        details: `${doc.destinationCountry} • ${doc.documentType} (${doc.fileName})`,
        createdAt: doc.createdAt,
        status: doc.status || 'Pending'
      });
    });

    combined.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    adminCachedSubmissions = combined;
    if (dashBox) dashBox.hidden = false;
    renderAdminTables();
  } catch (err) {
    if (errBox) {
      errBox.hidden = false;
      errBox.textContent = 'Unable to load administrator submissions.';
    }
  }
}

function lockAdminDashboard() {
  adminCachedSubmissions = [];
  const passInput = document.getElementById('adminPasscodeInput');
  const dashBox = document.getElementById('adminDashboardContent');
  if (passInput) passInput.value = '';
  if (dashBox) dashBox.hidden = true;
}

function renderAdminTables() {
  const tbody = document.getElementById('adminSubmissionsBody');
  const countEl = document.getElementById('adminTotalCount');
  const filterVal = document.getElementById('adminFilterType')?.value || 'all';
  if (!tbody) return;

  const filtered = filterVal === 'all'
    ? adminCachedSubmissions
    : adminCachedSubmissions.filter(item => item.requestType === filterVal);

  if (countEl) countEl.textContent = String(filtered.length);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--slate-500);">No business submissions match the selected filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const statusClass = 'status-' + String(item.status || 'Pending').toLowerCase().replace(/\s+/g, '-');
    const dateShort = item.createdAt ? String(item.createdAt).slice(0, 10) : '—';
    const statuses = ['Pending', 'Under Review', 'Approved', 'Rejected'];
    return `
      <tr>
        <td><strong>${escapeHtml(item.referenceId)}</strong></td>
        <td>${escapeHtml(item.requestTypeLabel)}</td>
        <td><strong>${escapeHtml(item.companyName)}</strong></td>
        <td style="font-size:12.5px;">${escapeHtml(item.contactInfo)}</td>
        <td style="font-size:12.5px;">${escapeHtml(item.details)}</td>
        <td style="white-space:nowrap; font-size:12.5px;">${escapeHtml(dateShort)}</td>
        <td><span class="status-badge ${escapeHtml(statusClass)}">${escapeHtml(item.status)}</span></td>
        <td>
          <div style="display:flex; gap:6px; align-items:center;">
            <select class="standard-input js-admin-status-select" data-ref="${escapeHtml(item.referenceId)}" style="height:34px; font-size:12.5px; padding:0 8px; width:auto;">
              ${statuses.map(s => `<option value="${s}"${s === item.status ? ' selected' : ''}>${s}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-primary" style="padding:6px 10px; font-size:12px;" onclick="updateAdminSubmissionStatus('${escapeHtml(item.referenceId)}')">Save</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateAdminSubmissionStatus(refId) {
  const passInput = document.getElementById('adminPasscodeInput');
  const passcode = (passInput?.value || '').trim();
  const selectEl = document.querySelector(`.js-admin-status-select[data-ref="${refId}"]`);
  const newStatus = selectEl ? selectEl.value : 'Pending';

  try {
    const resp = await fetch('/api/admin/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': passcode
      },
      body: JSON.stringify({ referenceId: refId, status: newStatus })
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      showToast((data && data.error) || 'Failed to update status.');
      return;
    }
    showToast(`Updated ${refId} status to ${newStatus}`);
    await loadAdminSubmissions();
  } catch (err) {
    showToast('Error updating status.');
  }
}

function openAuthModal(type) {
  if (type === 'signup') {
    navigateBusinessSolution('register');
    return;
  }
  const errEl = document.getElementById('authModalError');
  const statusBox = document.getElementById('authModalStatusBox');
  if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
  if (statusBox) { statusBox.hidden = true; statusBox.innerHTML = ''; }
  document.getElementById('authModalTitle').textContent = 'Sign in to Trisys Express Business Portal';
  document.getElementById('nameFieldGroup').hidden = true;
  document.getElementById('authSubmitBtn').textContent = 'Login';
  openModal('authModal');
}

function closeAuthModal() {
  closeModal('authModal');
}

async function handleAuthSubmit() {
  const emailEl = document.getElementById('authEmail');
  const passEl = document.getElementById('authPassword');
  const errEl = document.getElementById('authModalError');
  const statusBox = document.getElementById('authModalStatusBox');
  const submitBtn = document.getElementById('authSubmitBtn');

  const email = (emailEl?.value || '').trim();
  const password = passEl?.value || '';

  if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
  if (statusBox) { statusBox.hidden = true; statusBox.innerHTML = ''; }

  if (submitBtn) submitBtn.disabled = true;
  try {
    const resp = await fetch('/api/business/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = (data && data.error) || 'Invalid email or password.';
      }
      return;
    }

    const acc = data.account;
    if (statusBox) {
      statusBox.hidden = false;
      statusBox.innerHTML = `
        <div class="pickup-confirmed-banner" style="margin-top:8px;">
          <strong>Signed in: ${escapeHtml(acc.companyName)} (${escapeHtml(acc.referenceId)})</strong>
          <p style="margin-top:4px; font-size:12.5px;">Application Status: <b>${escapeHtml(acc.status)}</b> • GSTIN: <b>${escapeHtml(acc.gstin)}</b></p>
        </div>
      `;
    }
    showToast(data.message);
  } catch (err) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = 'Unable to sign in right now. Please try again.';
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// Search: opens the search panel
function toggleSearch() {
  openSearch();
}

const SEARCH_INDEX = [
  { group: 'Ship', title: 'Get a Quote', sub: 'Instant international rates', action: () => goToTab('quote'), keys: 'quote price cost calculate ship send' },
  { group: 'Ship', title: 'Track Shipment', sub: 'Live status with AWB number', action: () => goToTab('track'), keys: 'track tracking awb status where' },
  { group: 'Ship', title: 'Schedule Pickup', sub: 'Doorstep collection', action: () => goToTab('pickup'), keys: 'pickup collect book slot doorstep' },
  { group: 'Ship', title: 'Find Rates', sub: 'Compare Economy, Express & NFO', action: () => goToTab('rates'), keys: 'rates tariff price compare' },
  { group: 'Services', title: 'Document Courier', sub: 'Certificates, contracts, passports', action: () => openServiceFromSearch('document'), keys: 'document papers certificate passport' },
  { group: 'Services', title: 'Parcel Shipping', sub: 'Personal & business parcels', action: () => openServiceFromSearch('parcel'), keys: 'parcel box package gift' },
  { group: 'Services', title: 'Medicine Courier', sub: 'Compliant prescription shipping', action: () => openServiceFromSearch('medicine'), keys: 'medicine pharma prescription drug' },
  { group: 'Services', title: 'E-commerce Logistics', sub: 'Cross-border store fulfilment', action: () => openServiceFromSearch('ecommerce'), keys: 'ecommerce shopify woocommerce store online' },
  { group: 'Services', title: 'Bulk & Commercial', sub: 'B2B cargo and pallets', action: () => openServiceFromSearch('bulk'), keys: 'bulk commercial cargo b2b pallet freight' },
  { group: 'Help', title: 'Business Solutions', sub: 'Volume pricing & integrations', action: () => openModal('businessModal'), keys: 'business account volume discount' },
  { group: 'Help', title: 'FAQs', sub: 'Answers to common questions', action: () => navigateToHelpPage('faqs'), keys: 'faq help question answers' },
  { group: 'Help', title: 'Customs & Documents', sub: 'What you need to ship abroad', action: () => navigateToHelpPage('customs'), keys: 'customs documents kyc id invoice packing list' },
  { group: 'Help', title: 'Contact Support', sub: '24/7 phone, email & WhatsApp', action: () => navigateToHelpPage('contact'), keys: 'contact support call email whatsapp phone' }
];

function openServiceFromSearch(service) {
  navigateToServicePage(service);
}

let searchResultsCache = [];

function openSearch() {
  closeMobileNav();
  const input = document.getElementById('searchInput');
  input.value = '';
  renderSearchResults('');
  openModal('searchModal');
}

function setupSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;

  input.addEventListener('input', () => renderSearchResults(input.value));
  input.addEventListener('keydown', (e) => {
    const items = Array.from(document.querySelectorAll('.search-result'));
    const current = items.findIndex(el => el.classList.contains('is-active'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      const next = e.key === 'ArrowDown'
        ? (current + 1) % items.length
        : (current - 1 + items.length) % items.length;
      items.forEach(el => el.classList.remove('is-active'));
      items[next].classList.add('is-active');
      items[next].scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearchResult(current >= 0 ? current : 0);
    }
  });

  // Ctrl/Cmd + K or "/" opens search from anywhere
  document.addEventListener('keydown', (e) => {
    const typing = /input|textarea|select/i.test(document.activeElement.tagName);
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      openSearch();
    }
  });
}

function renderSearchResults(query) {
  const box = document.getElementById('searchResults');
  const q = query.trim().toLowerCase();
  const results = [];

  // Looks like a tracking number? Offer to track it first
  if (q.length >= 6 && /\d/.test(q) && /^[a-z0-9-]+$/i.test(q)) {
    results.push({
      group: 'Tracking', title: `Track "${query.trim().toUpperCase()}"`, sub: 'Show live shipment status',
      action: () => {
        document.getElementById('trackingInput').value = query.trim().toUpperCase();
        switchMainTab('track');
        simulateTracking();
      }
    });
  }

  const pages = q
    ? SEARCH_INDEX.filter(i => (i.title + ' ' + i.sub + ' ' + i.keys).toLowerCase().includes(q))
    : SEARCH_INDEX.slice(0, 6);
  results.push(...pages);

  const countries = q
    ? supportedCountries.filter(c => c.name.toLowerCase().includes(q) || c.zone.toLowerCase().includes(q) || c.code.toLowerCase() === q)
    : [];
  countries.forEach(c => results.push({
    group: 'Countries', title: c.name, sub: `${c.zone} • Ship from India in 3–5 days`, flag: c.code,
    action: () => {
      appState.toCountry = { code: c.code, name: c.name, flagSvg: getFlagSvg(c.code) };
      updateCountryUI();
      goToTab('quote');
      showToast(`Destination set to ${c.name}`);
    }
  }));

  searchResultsCache = results;

  if (!results.length) {
    box.innerHTML = `<p class="search-empty">No results for "${escapeHtml(query)}". Try a service, a country, or a tracking number.</p>`;
    return;
  }

  let lastGroup = '';
  box.innerHTML = results.map((r, i) => {
    const heading = r.group !== lastGroup ? `<p class="search-group">${r.group}</p>` : '';
    lastGroup = r.group;
    const icon = r.flag
      ? `<span class="flag-icon">${getFlagSvg(r.flag)}</span>`
      : `<span class="search-dot"></span>`;
    return `${heading}<button type="button" class="search-result${i === 0 ? ' is-active' : ''}" data-index="${i}" role="option">
      ${icon}
      <span class="search-text"><strong>${escapeHtml(r.title)}</strong><small>${escapeHtml(r.sub)}</small></span>
      <svg class="search-go" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 8H13M9 4L13 8L9 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>`;
  }).join('');

  box.querySelectorAll('.search-result').forEach(btn => {
    btn.addEventListener('click', () => runSearchResult(Number(btn.dataset.index)));
    btn.addEventListener('mouseenter', () => {
      box.querySelectorAll('.search-result').forEach(el => el.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });
}

function runSearchResult(index) {
  const result = searchResultsCache[index];
  if (!result) return;
  closeModal('searchModal');
  setTimeout(result.action, 80);
}

/* --------------------------------------------------------------------------
   Layout helpers: mobile nav, sticky navbar, scroll reveal, counters
   -------------------------------------------------------------------------- */
// Mobile Nav Toggle
function setupMobileNav() {
  const toggle = document.getElementById('mobileToggle');
  const menu = document.getElementById('navMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('active');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Close after choosing a link
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileNav));

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('active') && !menu.contains(e.target) && !toggle.contains(e.target)) {
      closeMobileNav();
    }
  });
}

function closeMobileNav() {
  const toggle = document.getElementById('mobileToggle');
  const menu = document.getElementById('navMenu');
  if (menu) menu.classList.remove('active');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
  if (typeof closeAllDropdowns === 'function') closeAllDropdowns();
}

function setupNavbarShadow() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const update = () => navbar.classList.toggle('is-scrolled', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

function setupScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!('IntersectionObserver' in window) || reduceMotion) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      entry.target.querySelectorAll('[data-count]').forEach(animateCounter);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  items.forEach(el => observer.observe(el));
}

// Count-up animation for numeric stats (e.g. 10,000+)
function animateCounter(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  if (!target) return;

  const duration = 1400;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased).toLocaleString('en-US') + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Small utility to keep user input out of innerHTML
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

/* ==========================================================================
   HELP CENTRE (FAQs, Customs & Documents, Contact Support)
   ========================================================================== */
const HELP_SECTION_CONFIG = {
  faqs: {
    key: 'faqs',
    path: '/help/faqs',
    pageTitle: 'FAQs — Answers to Common Questions | TRISYS EXPRESS Help Centre',
    breadcrumb: 'FAQs — Answers to Common Questions',
    badge: 'FAQs • Answers to Common Questions',
    heading: 'Frequently Asked Questions (FAQs)',
    subtitle: 'Search verified answers covering shipment creation, domestic & international shipping, live AWB tracking, delivery estimates, volumetric weight, customs clearance, required documents, prohibited items, claims, and business accounts.'
  },
  customs: {
    key: 'customs',
    path: '/help/customs-documents',
    pageTitle: 'Customs & Documents — What You Need to Ship Abroad | TRISYS EXPRESS',
    breadcrumb: 'Customs & Documents — What You Need to Ship Abroad',
    badge: 'Export Compliance & Customs Documentation',
    heading: 'Customs & Documents — What You Need to Ship Abroad',
    subtitle: 'Complete guide to Commercial & Proforma Invoices, Packing Lists, CSB-IV/CSB-V declarations, mandatory Indian KYC, prescription medicine rules, prohibited goods, destination-country notes, downloadable templates, and document pre-check.'
  },
  contact: {
    key: 'contact',
    path: '/help/contact-support',
    pageTitle: 'Contact Support — 24/7 Phone, Email & WhatsApp | TRISYS EXPRESS',
    breadcrumb: 'Contact Support — 24/7 Phone, Email & WhatsApp',
    badge: '24/7 Customer & Customs Support Desk',
    heading: 'Contact Support — 24/7 Phone, Email & WhatsApp',
    subtitle: 'Reach our support desk directly via toll-free phone, email, or WhatsApp, submit a structured support enquiry for shipment tracking, customs holds, pickup rescheduling, or billing, and look up your live ticket status.'
  }
};

const CUSTOMS_COUNTRY_GUIDES = {
  US: {
    country: 'United States (USA)',
    code: 'US',
    corridorSummary: 'Express Air: 3–4 business days • Economy: 6–8 business days • Next Flight Out: 2–3 business days',
    requiredDocs: [
      'Sender KYC: Government Photo ID (Aadhaar / Passport / PAN) for personal shipments; IEC + GSTIN + AD Code for commercial exports.',
      'Invoice: 3 copies of Commercial or Proforma Invoice in USD with 6–8 digit HS codes and country of origin ("Made in India").',
      'Medicines & Food Items: Prescription medicines require Doctor Prescription + Pharmacy Tax Bill; food/dietary supplements require US FDA Prior Notice guidance.'
    ],
    regulatoryNote: 'US CBP Section 321 de minimis threshold generally applies up to USD 800 for eligible non-restricted shipments, subject to commodity-specific CBP/FDA regulations and HS classification.'
  },
  GB: {
    country: 'United Kingdom (UK)',
    code: 'GB',
    corridorSummary: 'Express Air: 3–4 business days • Economy: 6–8 business days • Next Flight Out: 2–3 business days',
    requiredDocs: [
      'Sender KYC: Valid Indian Government Photo ID + signed Proforma/Commercial Invoice in GBP or USD.',
      'B2B & E-commerce: UK recipient EORI number is required for B2B cargo; UK VAT / HMRC rules apply to commercial e-commerce orders.',
      'Packing List: Mandatory for multi-box parcels, student relocations, and commercial consignments.'
    ],
    regulatoryNote: 'UK HMRC assesses import VAT and applicable customs duty based on CIF value, commodity HS code, and whether the shipment is declared as a personal gift, personal effects, or commercial sale.'
  },
  AE: {
    country: 'United Arab Emirates (UAE — Dubai / Abu Dhabi)',
    code: 'AE',
    corridorSummary: 'Express Air: 2–3 business days • Economy: 4–6 business days • Next Flight Out: 1–2 business days',
    requiredDocs: [
      'Sender KYC & Invoice: Government Photo ID + itemized Commercial/Proforma Invoice in AED or USD.',
      'Recipient Details: Active UAE mobile number (+971), P.O. Box or Makani number, and Emirates ID / Trade License for commercial imports.',
      'Medicine Shipments: Strict MOHAP compliance—must include original doctor prescription, hospital/clinic stamp, and pharmacy invoice; controlled psychotropics are prohibited.'
    ],
    regulatoryNote: 'UAE Federal Customs Authority applies standard 5% VAT and GCC customs tariff rules based on declared CIF value and HS tariff heading.'
  },
  CA: {
    country: 'Canada',
    code: 'CA',
    corridorSummary: 'Express Air: 3–5 business days • Economy: 6–8 business days • Next Flight Out: 2–3 business days',
    requiredDocs: [
      'Sender KYC & Invoice: Government Photo ID + detailed Commercial/Proforma Invoice in CAD or USD.',
      'Recipient Contact: Complete Canadian street address, 6-character alphanumeric postal code (e.g. M5V 2T6), and recipient phone/email for CBSA carrier notifications.',
      'Commercial Imports: Canadian Business Number (BN) / CARM registration is required for B2B commercial importers.'
    ],
    regulatoryNote: 'Canada Border Services Agency (CBSA) assesses applicable GST/PST/HST and duties on imported goods above low-value thresholds depending on origin and classification.'
  },
  AU: {
    country: 'Australia',
    code: 'AU',
    corridorSummary: 'Express Air: 4–5 business days • Economy: 6–9 business days • Next Flight Out: 2–3 business days',
    requiredDocs: [
      'Sender KYC & Invoice: Government Photo ID + itemized Commercial/Proforma Invoice in AUD or USD.',
      'Biosecurity & Quarantine Declaration: Strict Australian Border Force (ABF) and DAFF biosecurity rules apply to food, wooden handicrafts, plant products, and seeds.',
      'Medicines: TGA personal importation scheme allows up to 3 months personal supply with a valid doctor prescription and pharmacy bill.'
    ],
    regulatoryNote: 'Australian Border Force (ABF) and DAFF inspect all incoming parcels for biosecurity compliance. Undeclared food, dairy, seeds, or untreated wood face mandatory quarantine seizure.'
  },
  DE: {
    country: 'Germany & European Union (EU)',
    code: 'DE',
    corridorSummary: 'Express Air: 3–4 business days • Economy: 6–8 business days • Next Flight Out: 2–3 business days',
    requiredDocs: [
      'ICS2 Compliance: Accurate 6-digit HS code and detailed plain-English item description are mandatory under EU Import Control System 2 (ICS2).',
      'E-commerce & B2B: Provide IOSS number (for B2C orders ≤ EUR 150) or recipient EORI number + VAT ID for B2B commercial shipments.',
      'Medicines Warning: Several EU member states (including Germany) restrict personal importation of medicines by post/courier unless authorized; contact our customs desk before shipping pharmaceuticals to the EU.'
    ],
    regulatoryNote: 'All shipments into the European Union are subject to import VAT from the first Euro unless cleared via a registered IOSS number, plus customs duty above EUR 150.'
  },
  SG: {
    country: 'Singapore',
    code: 'SG',
    corridorSummary: 'Express Air: 2–3 business days • Economy: 4–6 business days • Next Flight Out: 1–2 business days',
    requiredDocs: [
      'Sender KYC & Invoice: Government Photo ID + itemized Commercial/Proforma Invoice in SGD or USD.',
      'Recipient Address: 6-digit Singapore postal code and active recipient mobile number (+65).',
      'Medicines: Health Sciences Authority (HSA) rules require doctor prescription and pharmacy bill for personal medication up to 3 months supply.'
    ],
    regulatoryNote: 'Singapore Customs applies Goods and Services Tax (GST) on imported low-value and commercial goods in accordance with IRAS/Singapore Customs regulations.'
  },
  SA: {
    country: 'Saudi Arabia (KSA)',
    code: 'SA',
    corridorSummary: 'Express Air: 3–4 business days • Economy: 5–7 business days • Next Flight Out: 2–3 business days',
    requiredDocs: [
      'Sender KYC & Invoice: Government Photo ID + itemized Commercial/Proforma Invoice in SAR or USD.',
      'Recipient National Address & ID: ZATCA customs clearance requires the recipient Saudi National Short Address, active mobile number (+966), and National ID / Iqama number (or CR + VAT number for B2B).',
      'Commercial Cargo: SABER / SALEEM product conformity certificates apply to regulated commercial categories.'
    ],
    regulatoryNote: 'ZATCA (Zakat, Tax and Customs Authority) requires recipient National ID / Iqama verification via SMS link before final customs release in Saudi Arabia.'
  }
};

let activeFaqCategory = 'all';

function normalizeHelpSection(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'faq' || s === 'faqs') return 'faqs';
  if (s === 'customs' || s === 'customs-documents' || s === 'documents') return 'customs';
  if (s === 'contact' || s === 'contact-support' || s === 'support') return 'contact';
  return 'faqs';
}

function resolveHelpSectionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const sectionParam = params.get('section') || params.get('tab');
  if (sectionParam) return normalizeHelpSection(sectionParam);

  const path = (window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
  if (path === '/help/customs-documents' || path === '/customs-documents' || path === '/customs') {
    return 'customs';
  }
  if (path === '/help/contact-support' || path === '/contact-support' || path === '/support' || path === '/contact') {
    return 'contact';
  }
  return 'faqs';
}

function navigateToHelpPage(section) {
  const norm = normalizeHelpSection(section);
  const cfg = HELP_SECTION_CONFIG[norm] || HELP_SECTION_CONFIG.faqs;

  closeModal('helpModal');
  closeAllDropdowns();
  closeMobileNav();

  if (document.body.dataset.page === 'help') {
    switchHelpSection(norm, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  window.location.href = cfg.path;
}

function renderDedicatedHelpPage() {
  const activeSection = resolveHelpSectionFromUrl();
  switchHelpSection(activeSection, false);
  renderCustomsCountryGuide();

  const fileInput = document.getElementById('docFileInput') || document.getElementById('customsDocFile');
  if (fileInput && !fileInput.dataset.bound) {
    fileInput.dataset.bound = 'true';
    fileInput.addEventListener('change', () => onCustomsFileChange(fileInput));
  }
}

function switchHelpSection(section, pushHistory = true) {
  const norm = normalizeHelpSection(section);
  const cfg = HELP_SECTION_CONFIG[norm] || HELP_SECTION_CONFIG.faqs;

  document.title = cfg.pageTitle;

  const breadcrumbEl = document.getElementById('helpBreadcrumbCurrent');
  if (breadcrumbEl) breadcrumbEl.textContent = cfg.breadcrumb;

  const badgeEl = document.getElementById('helpHeroBadge');
  if (badgeEl) badgeEl.textContent = cfg.badge;

  const headingEl = document.getElementById('helpHeroTitle') || document.getElementById('helpHeroHeading');
  if (headingEl) headingEl.textContent = cfg.heading;

  const subtitleEl = document.getElementById('helpHeroSubtitle');
  if (subtitleEl) subtitleEl.textContent = cfg.subtitle;

  ['faqs', 'customs', 'contact'].forEach(key => {
    const secEl = document.getElementById(`helpSection-${key}`);
    if (secEl) secEl.hidden = (key !== norm);
  });

  document.querySelectorAll('#helpSubnavTabs .biz-tab-pill, #helpSectionTabs .biz-tab-pill').forEach(btn => {
    const isMatch = btn.dataset.helpSection === norm;
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-selected', String(isMatch));
  });

  setActiveNav('help');
  document.querySelectorAll('#dd-help .dropdown-link').forEach(link => {
    const linkSec = normalizeHelpSection(link.dataset.helpPage || link.dataset.help);
    const isSelected = linkSec === norm;
    link.classList.toggle('active', isSelected);
    link.classList.toggle('is-selected', isSelected);
    if (isSelected) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  if (pushHistory && window.location.pathname !== cfg.path) {
    window.history.pushState({ helpSection: norm }, '', cfg.path);
  }
  const shareInput = document.getElementById('shareUrlInput');
  if (shareInput) shareInput.value = window.location.href;
}

window.addEventListener('popstate', () => {
  if (document.body.dataset.page === 'help') {
    const sec = resolveHelpSectionFromUrl();
    switchHelpSection(sec, false);
  }
});

// FAQ Search, Category Filter & Accordion Controls
function selectFaqCategory(category, btnEl) {
  activeFaqCategory = category || 'all';
  document.querySelectorAll('#faqCategoryBar .faq-cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn === btnEl || btn.dataset.faqCat === activeFaqCategory);
  });
  filterFaqItems();
}

function filterFaqItems() {
  const input = document.getElementById('faqSearchInput');
  const query = (input?.value || '').trim().toLowerCase();
  const items = Array.from(document.querySelectorAll('#faqAccordionList .faq-item'));
  const countEl = document.getElementById('faqMatchCount') || document.getElementById('faqVisibleCount');
  const emptyEl = document.getElementById('faqEmptyState');

  let visibleCount = 0;
  items.forEach(item => {
    const cat = item.dataset.faqCat || item.dataset.category || '';
    const catMatch = activeFaqCategory === 'all' || cat === activeFaqCategory;
    const textMatch = !query || item.textContent.toLowerCase().includes(query);
    const show = catMatch && textMatch;
    item.hidden = !show;
    if (show) {
      visibleCount++;
      if (query.length >= 2) {
        item.open = true;
      }
    }
  });

  if (countEl) {
    countEl.textContent = `Showing ${visibleCount} of ${items.length} questions`;
    countEl.dataset.visibleCount = String(visibleCount);
  }
  if (emptyEl) emptyEl.hidden = visibleCount > 0;
}

function toggleAllFaqs(openState) {
  document.querySelectorAll('#faqAccordionList .faq-item').forEach(item => {
    if (!item.hidden) item.open = Boolean(openState);
  });
}

function resetFaqFilters() {
  const input = document.getElementById('faqSearchInput');
  if (input) input.value = '';
  activeFaqCategory = 'all';
  document.querySelectorAll('#faqCategoryBar .faq-cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.faqCat === 'all');
  });
  filterFaqItems();
}

// Country-Specific Customs Guide
function renderCustomsCountryGuide() {
  const selectEl = document.getElementById('customsCountrySelect');
  const boxEl = document.getElementById('customsCountryDetails');
  if (!selectEl || !boxEl) return;

  const rawVal = (selectEl.value || 'United Kingdom').trim();
  const nameToCode = {
    'united states': 'US',
    'us': 'US',
    'united kingdom': 'GB',
    'gb': 'GB',
    'united arab emirates': 'AE',
    'ae': 'AE',
    'canada': 'CA',
    'ca': 'CA',
    'australia': 'AU',
    'au': 'AU',
    'germany': 'DE',
    'de': 'DE',
    'singapore': 'SG',
    'sg': 'SG',
    'saudi arabia': 'SA',
    'sa': 'SA'
  };
  const code = nameToCode[rawVal.toLowerCase()] || 'GB';
  const info = CUSTOMS_COUNTRY_GUIDES[code] || CUSTOMS_COUNTRY_GUIDES.GB;

  boxEl.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="flag-icon">${getFlagSvg(info.code)}</span>
        <strong style="font-size:15px; color:var(--slate-900);">India ➔ ${escapeHtml(info.country)} Customs &amp; Documentation Checklist</strong>
      </div>
      <span class="modal-badge">${escapeHtml(info.corridorSummary)}</span>
    </div>
    <ul class="subpage-checklist" style="margin-bottom:10px;">
      ${info.requiredDocs.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
    <p style="font-size:12.5px; color:var(--slate-600); margin:0;">
      <strong>Destination Customs &amp; Tax Note:</strong> ${escapeHtml(info.regulatoryNote)}
    </p>
  `;
}

function onCustomsFileChange(inputEl) {
  const metaEl = document.getElementById('customsFileMetaText');
  if (!metaEl) return;
  const file = inputEl?.files && inputEl.files[0];
  if (!file) {
    metaEl.hidden = true;
    metaEl.textContent = '';
    return;
  }
  const sizeKb = Math.max(0.1, file.size / 1024).toFixed(1);
  metaEl.hidden = false;
  metaEl.textContent = `Selected file: ${file.name} (${sizeKb} KB)`;
}

async function submitCustomsDocumentForm() {
  if (appState.isSubmittingCustomsDoc) return;

  const senderEl = document.getElementById('docSenderName') || document.getElementById('customsSenderName');
  const emailEl = document.getElementById('docEmail') || document.getElementById('customsSenderEmail');
  const phoneEl = document.getElementById('docPhone') || document.getElementById('customsSenderPhone');
  const countryEl = document.getElementById('docDestCountry') || document.getElementById('customsDestCountry');
  const catEl = document.getElementById('docShipmentCategory') || document.getElementById('customsShipmentCategory');
  const docTypeEl = document.getElementById('docTypeSelect') || document.getElementById('customsDocType');
  const fileEl = document.getElementById('docFileInput') || document.getElementById('customsDocFile');
  const refEl = document.getElementById('docShipmentRef') || document.getElementById('customsShipmentRef');
  const notesEl = document.getElementById('docNotes') || document.getElementById('customsDocNotes');
  const errEl = document.getElementById('docFormError') || document.getElementById('customsDocError');
  const successEl = document.getElementById('docConfirmationBox') || document.getElementById('customsDocSuccess');
  const submitBtn = document.getElementById('docSubmitBtn') || document.getElementById('customsDocSubmitBtn');

  const senderName = (senderEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  const phone = (phoneEl?.value || '').trim();
  const destinationCountry = (countryEl?.value || '').trim();
  const shipmentCategory = (catEl?.value || '').trim();
  const documentType = (docTypeEl?.value || '').trim();
  const shipmentRef = (refEl?.value || '').trim();
  const notes = (notesEl?.value || '').trim();

  const fileObj = fileEl?.files && fileEl.files[0];
  const fileName = fileObj ? fileObj.name : (fileEl?.dataset.testFileName || '').trim();
  const fileSizeKb = fileObj ? Math.max(0.1, file.size / 1024) : (parseFloat(fileEl?.dataset.testFileSizeKb || '0') || 12.4);

  const fail = (el, msg) => {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = msg;
    }
    if (el && typeof el.focus === 'function') el.focus();
  };

  if (!senderName) return fail(senderEl, 'Please enter the sender or exporter full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(emailEl, 'Please enter a valid email address.');
  if (phone.replace(/\D/g, '').length < 7) return fail(phoneEl, 'Please enter a valid phone or WhatsApp number (at least 7 digits).');
  if (!destinationCountry) return fail(countryEl, 'Please select or enter the destination country.');
  if (!shipmentCategory) return fail(catEl, 'Please select the shipment category.');
  if (!documentType) return fail(docTypeEl, 'Please select the document type being submitted.');
  if (!fileName) return fail(fileEl, 'Please attach a document file (PDF, JPG, PNG, CSV, or DOCX) for pre-check.');

  if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
  appState.isSubmittingCustomsDoc = true;
  const origHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting Document for Pre-Check...</span>';
  }

  try {
    const resp = await fetch('/api/help/customs-document-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderName,
        email,
        phone,
        destinationCountry,
        shipmentCategory,
        documentType,
        fileName,
        fileSizeKb,
        shipmentRef,
        notes
      })
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      return fail(null, (data && data.error) || `Submission failed (${resp.status}). Please verify your entries.`);
    }

    const rec = data.documentRecord;
    if (successEl) {
      successEl.hidden = false;
      successEl.innerHTML = `
        <div class="pickup-confirmed-banner">
          <strong>Customs Document Pre-Check Logged — Reference: ${escapeHtml(rec.documentRefId)} (Status: ${escapeHtml(rec.status)})</strong>
          <p style="margin-top:6px;">
            Exporter: <b>${escapeHtml(rec.senderName)}</b> (${escapeHtml(rec.email)}) • Destination: <b>${escapeHtml(rec.destinationCountry)}</b> •
            Category: <b>${escapeHtml(rec.shipmentCategory)}</b>
          </p>
          <p style="margin-top:6px;">
            Document: <b>${escapeHtml(rec.documentType)}</b> — File: <b>${escapeHtml(rec.fileName)}</b> (${escapeHtml(String(rec.fileSizeKb))} KB)
          </p>
          <p style="margin-top:6px;"><em>${escapeHtml(data.message)}</em></p>
        </div>
      `;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(`Customs document ${rec.documentRefId} submitted!`);
  } catch (err) {
    fail(null, 'Unable to reach the server. Your entered details have been preserved—please try again.');
  } finally {
    appState.isSubmittingCustomsDoc = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}

// Contact Support Enquiry & Live Ticket Lookup
function prefillSupportCategory(category, defaultSubject) {
  switchHelpSection('contact', true);
  const catEl = document.getElementById('supCategory');
  const subjEl = document.getElementById('supSubject');
  const cardEl = document.getElementById('supportEnquiryForm');
  const nameEl = document.getElementById('supCustomerName');

  if (catEl && category) catEl.value = category;
  if (subjEl && defaultSubject && !subjEl.value.trim()) subjEl.value = defaultSubject;
  if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (nameEl) setTimeout(() => nameEl.focus(), 250);
}

async function submitSupportEnquiryForm() {
  if (appState.isSubmittingSupportEnquiry) return;

  const nameEl = document.getElementById('supCustomerName');
  const compEl = document.getElementById('supCompanyName');
  const emailEl = document.getElementById('supEmail');
  const phoneEl = document.getElementById('supPhone');
  const catEl = document.getElementById('supCategory');
  const refEl = document.getElementById('supShipmentRef');
  const subjEl = document.getElementById('supSubject');
  const msgEl = document.getElementById('supMessage');
  const errEl = document.getElementById('supFormError') || document.getElementById('supportEnquiryError');
  const successEl = document.getElementById('supConfirmationBox') || document.getElementById('supportEnquirySuccess');
  const submitBtn = document.getElementById('supSubmitBtn') || document.getElementById('supportEnquirySubmitBtn');

  const customerName = (nameEl?.value || '').trim();
  const companyName = (compEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();
  const phone = (phoneEl?.value || '').trim();
  const category = (catEl?.value || '').trim();
  const shipmentRef = (refEl?.value || '').trim();
  const subject = (subjEl?.value || '').trim();
  const message = (msgEl?.value || '').trim();

  const fail = (el, msg) => {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = msg;
    }
    if (el && typeof el.focus === 'function') el.focus();
  };

  if (!customerName) return fail(nameEl, 'Please enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(emailEl, 'Please enter a valid email address.');
  if (phone.replace(/\D/g, '').length < 7) return fail(phoneEl, 'Please enter a valid phone or WhatsApp number (at least 7 digits).');
  if (!category) return fail(catEl, 'Please select an enquiry category.');
  if (!subject) return fail(subjEl, 'Please enter a brief subject for your support request.');
  if (message.length < 10) return fail(msgEl, 'Please enter a detailed support message (at least 10 characters).');

  if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
  appState.isSubmittingSupportEnquiry = true;
  const origHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting Support Enquiry...</span>';
  }

  try {
    const resp = await fetch('/api/help/support-enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        companyName,
        email,
        phone,
        category,
        shipmentRef,
        subject,
        message
      })
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      return fail(null, (data && data.error) || `Submission failed (${resp.status}). Please check your entries.`);
    }

    const t = data.ticket;
    if (successEl) {
      successEl.hidden = false;
      successEl.innerHTML = `
        <div class="pickup-confirmed-banner">
          <strong>Support Ticket Created — Reference: ${escapeHtml(t.ticketId)} (Status: ${escapeHtml(t.status)})</strong>
          <p style="margin-top:6px;">
            Customer: <b>${escapeHtml(t.customerName)}</b> (${escapeHtml(t.email)} • ${escapeHtml(t.phone)}) •
            Category: <b>${escapeHtml(t.category)}</b>${t.shipmentRef ? ` • Shipment Ref: <b>${escapeHtml(t.shipmentRef)}</b>` : ''}
          </p>
          <p style="margin-top:6px;">
            Subject: <b>${escapeHtml(t.subject)}</b>
          </p>
          <p style="margin-top:6px;"><em>${escapeHtml(data.message)}</em></p>
        </div>
      `;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const lookupIdEl = document.getElementById('supLookupTicketId') || document.getElementById('lookupTicketId');
    const lookupEmailEl = document.getElementById('supLookupEmail') || document.getElementById('lookupTicketEmail');
    if (lookupIdEl) lookupIdEl.value = t.ticketId;
    if (lookupEmailEl) lookupEmailEl.value = t.email;

    showToast(`Support ticket ${t.ticketId} submitted!`);
  } catch (err) {
    fail(null, 'Unable to reach the server. Your entered message has been preserved—please try again.');
  } finally {
    appState.isSubmittingSupportEnquiry = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}

async function lookupSupportTicketStatus() {
  const idEl = document.getElementById('supLookupTicketId') || document.getElementById('lookupTicketId');
  const emailEl = document.getElementById('supLookupEmail') || document.getElementById('lookupTicketEmail');
  const errEl = document.getElementById('supLookupError') || document.getElementById('lookupTicketError');
  const resEl = document.getElementById('supLookupResult') || document.getElementById('lookupTicketResult');

  const ticket = (idEl?.value || '').trim().toUpperCase();
  const email = (emailEl?.value || '').trim();

  if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
  if (resEl) { resEl.hidden = true; resEl.innerHTML = ''; }

  if (!ticket) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = 'Please enter your Support Ticket ID (TRISYS-SUP-...) or Customs Document Ref (TRISYS-DOC-...).';
    }
    return;
  }

  try {
    const qs = new URLSearchParams({ ticket });
    if (email) qs.set('email', email);
    const resp = await fetch(`/api/help/support-status?${qs.toString()}`);
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || !data.ok) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = (data && data.error) || 'Ticket not found. Please check your reference ID and email.';
      }
      return;
    }

    if (resEl) {
      resEl.hidden = false;
      const rec = data.ticket || data.record || {};
      resEl.innerHTML = `
        <div class="pickup-confirmed-banner">
          <strong>Reference ${escapeHtml(rec.ticketId || rec.documentRefId || ticket)} — Status: ${escapeHtml(rec.status || 'Open')}</strong>
          <p style="margin-top:4px; font-size:12.8px;">
            Category: <b>${escapeHtml(rec.category || rec.documentType || 'Support')}</b> • Subject: <b>${escapeHtml(rec.subject || rec.fileName || '')}</b> • Logged: <b>${escapeHtml(String(rec.createdAt || '').slice(0, 10))}</b>
          </p>
        </div>
      `;
    }
  } catch (err) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = 'Unable to look up ticket status right now. Please try again.';
    }
  }
}
