import './data-request-owner.js';
import { views } from './views.js';
import { dataView } from './data-live.js';

const root = document.getElementById('view-root');
const overlay = document.getElementById('overlay');
const drawers = {
  advanced: document.getElementById('advanced-drawer'),
  notifications: document.getElementById('notification-drawer'),
  more: document.getElementById('mobile-more'),
  command: document.getElementById('command-menu'),
};
let lastFocused = null;

function currentRoute() {
  const value = location.hash.replace(/^#\/?/, '').split(/[?\/]/)[0];
  return views[value] ? value : 'home';
}


function syncNavigation(route) {
  document.querySelectorAll('[aria-current="page"]').forEach((item) => {
    item.removeAttribute('aria-current');
  });

  const mobile = window.matchMedia('(max-width: 860px)').matches;
  if (mobile) {
    const direct = document.querySelector(`.mobile-nav [data-route="${route}"]`);
    if (direct) {
      direct.setAttribute('aria-current', 'page');
    } else {
      document.querySelector('.mobile-nav [data-action="open-mobile-more"]')?.setAttribute('aria-current', 'page');
      document.querySelector(`#mobile-more [data-route="${route}"]`)?.setAttribute('aria-current', 'page');
    }
    return;
  }

  document.querySelector(`.sidebar [data-route="${route}"]`)?.setAttribute('aria-current', 'page');
}

function render() {
  const route = currentRoute();
  root.innerHTML = route === 'data' ? dataView() : views[route]();
  syncNavigation(route);
  document.title = `${route[0].toUpperCase()}${route.slice(1)} — VOID App Shell`;
  root.querySelectorAll('[data-demo-toast]').forEach((button) => {
    button.addEventListener('click', () => toast(button.dataset.demoToast));
  });
  document.getElementById('app-main').focus({ preventScroll: true });
  closeAll(false);
}

function setExpanded(name, value) {
  const action = {
    advanced: 'open-advanced',
    notifications: 'open-notifications',
    more: 'open-mobile-more',
    command: 'open-command',
  }[name];
  if (!action) return;
  document.querySelectorAll(`[data-action="${action}"]`).forEach((trigger) => {
    trigger.setAttribute('aria-expanded', String(value));
  });
}

function openLayer(name) {
  lastFocused = document.activeElement;
  overlay.hidden = false;
  Object.entries(drawers).forEach(([key, element]) => {
    element.hidden = key !== name;
    setExpanded(key, key === name);
  });
  document.body.style.overflow = 'hidden';
  const target = drawers[name];
  requestAnimationFrame(() => target.querySelector('button, input, a')?.focus());
}

function closeAll(restore = true) {
  overlay.hidden = true;
  Object.entries(drawers).forEach(([key, element]) => {
    element.hidden = true;
    setExpanded(key, false);
  });
  document.body.style.overflow = '';
  if (restore) lastFocused?.focus?.();
}

function activeLayer() {
  return Object.values(drawers).find((element) => !element.hidden) || null;
}

function trapFocus(event) {
  if (event.key !== 'Tab') return;
  const layer = activeLayer();
  if (!layer) return;
  const focusable = [...layer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.getClientRects().length > 0);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function toast(message) {
  const region = document.getElementById('toast-region');
  const item = document.createElement('div');
  item.className = 'toast';
  item.innerHTML = `<span class="status-icon">i</span><div><strong>Foundation preview</strong><p>${message}</p></div>`;
  region.appendChild(item);
  setTimeout(() => item.remove(), 3600);
}

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'open-advanced') openLayer('advanced');
  if (action === 'open-notifications') openLayer('notifications');
  if (action === 'open-mobile-more') openLayer('more');
  if (action === 'open-command') openLayer('command');
  if (action === 'open-network') location.hash = '#/network';
  if (action === 'open-account') toast('Account menu is a Wave 1 shell slot.');
  if (action === 'close-overlay') closeAll();
});

overlay.addEventListener('click', () => closeAll());
window.addEventListener('hashchange', render);
window.addEventListener('resize', () => syncNavigation(currentRoute()));
window.addEventListener('keydown', (event) => {
  trapFocus(event);
  if (event.key === 'Escape') closeAll();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openLayer('command');
  }
});

document.querySelectorAll('.command-results a, .mobile-more-grid a').forEach((link) => {
  link.addEventListener('click', () => closeAll(false));
});

if (!location.hash) location.hash = '#/home';
else render();
