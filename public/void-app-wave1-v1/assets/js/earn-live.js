const EARN_ENDPOINT = '/__void/ui/wave4/earn.json';
const EARN_MARKER = 'VOID_UI_WAVE4_EARN_READONLY_V1';
const EARN_ACCOUNT_STORAGE_KEY = 'void.ui.wave4.earn.account.v1';
const WALLET_ACCOUNT_STORAGE_KEY = 'void.ui.wave3.wallet.account.v1';
const ACCOUNT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

const setText = (selector, value, fallback = '—') => {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent =
      value === null || value === undefined || value === ''
        ? fallback
        : String(value);
  });
};

const setChip = (node, tone, label) => {
  if (!node) return;

  node.className = `status-chip status-chip--${tone}`;
  node.textContent = label;
};

const formatNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString('en-US', {
        maximumFractionDigits: 9,
      })
    : '—';
};

const formatTime = (value) => {
  if (!value) return 'Time unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Time unavailable';

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const sourceLabel = (source) => {
  const status = Number(source?.status ?? 0);

  return status === 200
    ? 'Available'
    : status
      ? `HTTP ${status}`
      : 'Unavailable';
};

const currentRoute = () => {
  return location.hash.replace(/^#\/?/, '').split(/[?\/]/)[0] || 'home';
};

const resetEarnView = (
  message = 'Enter a participant account ID to inspect earning state.'
) => {
  setChip(
    document.querySelector('[data-earn-state-chip]'),
    'info',
    'No account loaded'
  );

  setText('[data-earn-message]', message);
  setText('[data-earn-account-id]', '—');
  setText('[data-earn-status]', 'Not checked');
  setText('[data-earn-approved-work]', 'Not checked');
  setText('[data-earn-policy]', 'Not checked');
  setText('[data-earn-safe-mode]', 'Not checked');
  setText('[data-earn-background]', 'Not checked');
  setText('[data-earn-earned-wc]', '—');
  setText('[data-earn-redeemable-wc]', '—');
  setText('[data-earn-production-wc]', '—');
  setText('[data-earn-earned-meta]', 'No account loaded');
  setText('[data-earn-redeemable-meta]', 'Visibility only');
  setText('[data-earn-production-meta]', 'Non-spendable');
  setText('[data-earn-task-label]', 'No task selected');
  setText('[data-earn-task-reason]', 'Load an account to inspect policy selection.');
  setText('[data-earn-task-difficulty]', '—');
  setText('[data-earn-task-need]', '—');
  setText('[data-earn-last-hour]', '—');
  setText('[data-earn-last-credit]', 'No credit loaded');
  setText('[data-earn-last-credit-time]', '—');
  setText('[data-earn-jobs-count]', '0');
  setText('[data-earn-receipts-count]', '0');
  setText('[data-earn-datanet-status]', 'Not checked');
  setText('[data-earn-datanet-records]', '—');
  setText('[data-earn-account-events]', '—');

  for (const selector of [
    '[data-earn-source-runner]',
    '[data-earn-source-reward]',
    '[data-earn-source-redeemable]',
    '[data-earn-source-production]',
    '[data-earn-source-jobs]',
    '[data-earn-source-receipts]',
    '[data-earn-source-datanet]',
  ]) {
    setText(selector, 'Not checked');
  }

  document.querySelector('[data-earn-jobs-list]')?.replaceChildren();
  document.querySelector('[data-earn-receipts-list]')?.replaceChildren();

  const jobsEmpty = document.querySelector('[data-earn-jobs-empty]');
  const receiptsEmpty = document.querySelector('[data-earn-receipts-empty]');

  if (jobsEmpty) jobsEmpty.hidden = false;
  if (receiptsEmpty) receiptsEmpty.hidden = false;
};

const toneForStatus = (status) => {
  if (status === 'completed') return 'positive';
  if (status === 'failed') return 'warning';
  if (status === 'running') return 'info';

  return 'info';
};

const renderHistory = (selector, emptySelector, items, kind) => {
  const list = document.querySelector(selector);
  const empty = document.querySelector(emptySelector);

  if (!list) return;

  list.replaceChildren();

  const rows = Array.isArray(items) ? items : [];

  if (empty) empty.hidden = rows.length > 0;

  for (const item of rows) {
    const row = document.createElement('article');
    row.className = 'earn-history-row';

    const main = document.createElement('div');
    main.className = 'earn-history-main';

    const copy = document.createElement('div');
    copy.className = 'earn-history-copy';

    const title = document.createElement('strong');
    title.textContent = item?.task_label || 'Useful work';

    const meta = document.createElement('small');
    meta.textContent = [
      item?.status_label || 'Recorded',
      formatTime(item?.recorded_at),
      kind === 'receipt' && item?.bytes_display !== '—'
        ? `${item.bytes_display} bytes`
        : null,
    ].filter(Boolean).join(' · ');

    copy.append(title, meta);

    const chip = document.createElement('span');
    chip.className =
      `status-chip status-chip--${toneForStatus(item?.status)}`;
    chip.textContent =
      Number.isFinite(Number(item?.reward_wc))
        ? `+${formatNumber(item.reward_wc)} WC`
        : item?.result_label || item?.status_label || 'Recorded';

    main.append(copy, chip);

    const details = document.createElement('details');
    details.className = 'earn-reference-details';

    const summary = document.createElement('summary');
    summary.textContent = `Reference ${item?.short_reference || '—'}`;

    const code = document.createElement('code');
    code.className = 'mono';
    code.textContent = item?.reference || 'Reference unavailable';

    details.append(summary, code);
    row.append(main, details);
    list.append(row);
  }
};

const renderError = (message) => {
  setChip(
    document.querySelector('[data-earn-state-chip]'),
    'warning',
    'Earn state unavailable'
  );

  setText(
    '[data-earn-message]',
    message || 'The read-only Earn adapter did not respond.'
  );
};

const renderEarn = (snapshot) => {
  if (!snapshot || snapshot.marker !== EARN_MARKER) {
    throw new Error('Unexpected Earn adapter response');
  }

  const account = snapshot.account || {};
  const earning = snapshot.earning || {};
  const accounting = snapshot.accounting || {};
  const legacy = accounting.legacy_wc || {};
  const production = accounting.production_wc || {};
  const rewards = accounting.rewards_last_hour || {};
  const lastCredit = accounting.last_credit || {};
  const availableWork = earning.available_work || {};
  const jobs = snapshot.recent_jobs || {};
  const receipts = snapshot.verification_receipts || {};
  const datanet = snapshot.datanet || {};
  const sources = snapshot.sources || {};

  const statusTone =
    earning.status === 'active'
      ? 'positive'
      : earning.status === 'unavailable'
        ? 'warning'
        : 'info';

  setChip(
    document.querySelector('[data-earn-state-chip]'),
    statusTone,
    earning.status_label || 'Account loaded'
  );

  setText(
    '[data-earn-message]',
    earning.summary ||
      'Read-only earning state is available for this account.'
  );

  setText('[data-earn-account-id]', account.id);
  setText('[data-earn-status]', earning.status_label);
  setText(
    '[data-earn-approved-work]',
    Array.isArray(earning.approved_task_classes) &&
      earning.approved_task_classes.length
      ? earning.approved_task_classes
          .map((item) => item?.label)
          .filter(Boolean)
          .join(', ')
      : 'No approved class reported'
  );
  setText('[data-earn-policy]', earning.policy);
  setText(
    '[data-earn-safe-mode]',
    earning.safe_mode ? 'Enabled' : 'Not reported'
  );
  setText(
    '[data-earn-background]',
    earning.automatic_background ? 'Running' : 'Disabled'
  );

  setText('[data-earn-earned-wc]', legacy.earned_display);
  setText(
    '[data-earn-redeemable-wc]',
    legacy.redeemable_display
  );
  setText('[data-earn-production-wc]', production.display);

  setText(
    '[data-earn-earned-meta]',
    legacy.available
      ? `${formatNumber(legacy.redeemed)} redeemed historically · accounting only`
      : 'Legacy accounting unavailable'
  );

  setText(
    '[data-earn-redeemable-meta]',
    legacy.available
      ? 'Legacy redeemable accounting · no action in this view'
      : 'Visibility unavailable'
  );

  setText(
    '[data-earn-production-meta]',
    production.available
      ? `${formatNumber(production.entries)} entries · non-spendable canary`
      : 'Production accounting unavailable'
  );

  setText('[data-earn-task-label]', availableWork.task_label);
  setText('[data-earn-task-reason]', availableWork.reason);
  setText(
    '[data-earn-task-difficulty]',
    availableWork.difficulty
      ? availableWork.difficulty.toUpperCase()
      : '—'
  );
  setText(
    '[data-earn-task-need]',
    Number.isFinite(Number(availableWork.network_need_score))
      ? Number(availableWork.network_need_score).toFixed(2)
      : '—'
  );

  setText('[data-earn-last-hour]', rewards.total_display);
  setText(
    '[data-earn-last-credit]',
    lastCredit.available
      ? `+${lastCredit.amount_display} WC · ${lastCredit.task_label}`
      : 'No credit recorded'
  );
  setText(
    '[data-earn-last-credit-time]',
    lastCredit.available
      ? formatTime(lastCredit.recorded_at)
      : '—'
  );

  setText('[data-earn-jobs-count]', jobs.count ?? 0);
  setText('[data-earn-receipts-count]', receipts.count ?? 0);

  renderHistory(
    '[data-earn-jobs-list]',
    '[data-earn-jobs-empty]',
    jobs.items,
    'job'
  );

  renderHistory(
    '[data-earn-receipts-list]',
    '[data-earn-receipts-empty]',
    receipts.items,
    'receipt'
  );

  setText(
    '[data-earn-datanet-status]',
    datanet.status === 'available' ? 'Available' : 'Unavailable'
  );
  setText(
    '[data-earn-datanet-records]',
    formatNumber(datanet.receipt_store_records)
  );
  setText(
    '[data-earn-account-events]',
    formatNumber(datanet.account_wc_events)
  );

  setText(
    '[data-earn-source-runner]',
    sourceLabel(sources.runner_status)
  );
  setText(
    '[data-earn-source-reward]',
    sourceLabel(sources.reward_stats)
  );
  setText(
    '[data-earn-source-redeemable]',
    sourceLabel(sources.redeemable)
  );
  setText(
    '[data-earn-source-production]',
    sourceLabel(sources.production_wc)
  );
  setText('[data-earn-source-jobs]', sourceLabel(sources.jobs));
  setText(
    '[data-earn-source-receipts]',
    sourceLabel(sources.receipts)
  );
  setText(
    '[data-earn-source-datanet]',
    sourceLabel(sources.datanet_wc)
  );
};

const loadAccount = async (account, button) => {
  const value = String(account || '').trim();

  if (!ACCOUNT_PATTERN.test(value)) {
    renderError(
      'Use 1–128 letters, numbers, periods, underscores, colons, or hyphens.'
    );
    return;
  }

  if (button) button.disabled = true;

  setChip(
    document.querySelector('[data-earn-state-chip]'),
    'info',
    'Loading Earn state'
  );

  setText(
    '[data-earn-message]',
    'Reading one sanitized local adapter.'
  );

  try {
    const response = await fetch(
      `${EARN_ENDPOINT}?account=${encodeURIComponent(value)}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        signal: AbortSignal.timeout(7000),
      }
    );

    const body = await response.json();

    if (!response.ok || !body?.ok) {
      throw new Error(
        body?.error ||
        `Earn adapter returned HTTP ${response.status}`
      );
    }

    sessionStorage.setItem(EARN_ACCOUNT_STORAGE_KEY, value);
    renderEarn(body);
  } catch (error) {
    renderError(
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    if (button) button.disabled = false;
  }
};

const bindEarnView = () => {
  if (currentRoute() !== 'earn') return;

  const form = document.querySelector('[data-earn-account-form]');

  if (!form || form.dataset.earnBound === 'true') return;

  form.dataset.earnBound = 'true';

  const input = form.querySelector('[data-earn-account-input]');
  const button = form.querySelector('[data-earn-load]');
  const saved =
    sessionStorage.getItem(EARN_ACCOUNT_STORAGE_KEY) ||
    sessionStorage.getItem(WALLET_ACCOUNT_STORAGE_KEY) ||
    '';

  if (input && saved) input.value = saved;

  resetEarnView(
    saved
      ? 'Loading the participant account saved in this browser session.'
      : undefined
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    loadAccount(input?.value, button);
  });

  form.querySelector('[data-earn-clear]')?.addEventListener(
    'click',
    () => {
      sessionStorage.removeItem(EARN_ACCOUNT_STORAGE_KEY);

      if (input) input.value = '';

      resetEarnView();
      input?.focus();
    }
  );

  if (saved) {
    queueMicrotask(() => loadAccount(saved, button));
  }
};

const observer = new MutationObserver(() => bindEarnView());

const start = () => {
  bindEarnView();
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, {
    once: true,
  });
} else {
  start();
}
