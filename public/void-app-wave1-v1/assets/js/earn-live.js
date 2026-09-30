import {
  MAX_NETWORK_RESPONSE_BYTES,
  createNetworkRequestOwnerV1,
  readBoundedNetworkJsonV1,
} from './network-live.js';

const EARN_ENDPOINT = '/__void/ui/wave4/earn.json';
const EARN_MARKER = 'VOID_UI_WAVE4_EARN_READONLY_V1';
const EARN_ACCOUNT_STORAGE_KEY = 'void.ui.wave4.earn.account.v1';
const WALLET_ACCOUNT_STORAGE_KEY = 'void.ui.wave3.wallet.account.v1';
const ACCOUNT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
export const EARN_SNAPSHOT_MAX_AGE_MS = 30_000;
export const EARN_SNAPSHOT_MAX_FUTURE_SKEW_MS = 5_000;
export const EARN_MAX_RESPONSE_BYTES = MAX_NETWORK_RESPONSE_BYTES;
export const EARN_REQUEST_TIMEOUT_MS = 7_000;
const earnRequestOwner = createNetworkRequestOwnerV1();

let requestSerial = 0;
let earnViewPresent = false;

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

const finiteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;

const nonNegativeSafeInteger = (value) =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= 0
    ? value
    : null;

const formatNumber = (value) => {
  const number = finiteNumber(value);

  return number !== null
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
  const status = nonNegativeSafeInteger(source?.status);

  return status === 200
    ? 'Available'
    : status !== null && status > 0
      ? `HTTP ${status}`
      : 'Unavailable';
};

const plainRecord = (value) => (
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype
);

const exactKeys = (value, expected, label) => {
  if (!plainRecord(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label} shape mismatch`);
  }
};

const EARN_HISTORY_LIMIT = 5;
const EARN_REFERENCE_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/;
const EARN_TASK_LABELS = Object.freeze({
  publish: 'Publish data',
  verify: 'Verify data',
  redundancy: 'Check redundancy',
  work: 'Useful work',
});
const EARN_STATUS_LABELS = Object.freeze({
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  recorded: 'Recorded',
});
const EARN_EARNING_LABELS = Object.freeze({
  unavailable: 'Unavailable',
  stopped: 'Stopped',
  manual_only: 'Manual only',
  active: 'Active',
  configured: 'Configured',
});
const EARN_EARNING_SUMMARIES = Object.freeze({
  unavailable: 'Earning status is unavailable.',
  stopped: 'Earning is stopped for this account.',
  manual_only:
    'Earning is configured, but background execution is disabled. This Wave 4 view does not run work.',
  active:
    'The runner reports active earning. This Wave 4 view remains read-only.',
  configured:
    'Earning is configured. This Wave 4 view does not execute work.',
});
const EARN_REASON_LABELS = new Set([
  'Network currently favors a publish task.',
  'A stale object is available for verification.',
  'A redundancy check is currently preferred.',
  'Verified receipt credit.',
  'No selection reason is currently available.',
  'Useful-work policy selected this task.',
]);
const EARN_NODE_ROLES = new Set([
  'precision',
  'nimo',
  'alienware',
  'local',
]);
const EARN_SOURCE_ROUTES = Object.freeze({
  runner_status: '/wc/runner/status',
  reward_stats: '/wc/reward-stats',
  redeemable: '/wc/redeemable',
  production_wc: '/wc/production/balance',
  jobs: '/jobs',
  receipts: '/receipts',
  datanet_wc: '/__void/participant/datanet-wc/status',
});
const EARN_SANITIZATION_KEYS = Object.freeze([
  'raw_source_bodies',
  'absolute_paths',
  'wallet_addresses',
  'redeemed_event_wallets',
  'job_inputs',
  'job_meta',
  'receipt_roots',
  'receipt_leaves',
  'receipt_payloads',
]);
const EARN_BOUNDARY_KEYS = Object.freeze([
  'job_execution',
  'job_submission',
  'reward_award',
  'runner_activation',
  'runner_tick',
  'runner_config',
  'wc_redeem',
  'wc_send',
  'wc_to_void',
  'ledger_write',
  'browser_wallet_connection',
  'validator_mutation',
  'operator_mutation',
  'money_movement',
]);

const boundedEarnText = (value, label, max = 512, allowEmpty = false) => {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (!allowEmpty && value.length < 1)
  ) {
    throw new Error(label + ' invalid');
  }
  return value;
};

const nullableNonNegativeFinite = (value, label) => {
  if (value === null) return null;
  const number = finiteNumber(value);
  if (number === null || number < 0) {
    throw new Error(label + ' must be a nonnegative finite number or null');
  }
  return number;
};

const nullableNonNegativeSafeInteger = (value, label) => {
  if (value === null) return null;
  const number = nonNegativeSafeInteger(value);
  if (number === null) {
    throw new Error(label + ' must be a nonnegative safe integer or null');
  }
  return number;
};

const validateEarnBoolean = (value, label) => {
  if (typeof value !== 'boolean') {
    throw new Error(label + ' must be boolean');
  }
  return value;
};

const validateEarnCanonicalTimestampOrNull = (value, label) => {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error(label + ' invalid');
  const parsed = Date.parse(value);
  if (
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString() !== value
  ) {
    throw new Error(label + ' invalid');
  }
  return value;
};

const validateEarnTask = (task, label) => {
  if (
    typeof task !== 'string' ||
    !Object.hasOwn(EARN_TASK_LABELS, task)
  ) {
    throw new Error(label + ' invalid');
  }
  return task;
};

const validateEarnStatus = (status, label) => {
  if (
    typeof status !== 'string' ||
    !Object.hasOwn(EARN_STATUS_LABELS, status)
  ) {
    throw new Error(label + ' invalid');
  }
  return status;
};

const earnShortReference = (value) => {
  if (!value) return '—';
  return value.length <= 22
    ? value
    : value.slice(0, 10) + '…' + value.slice(-8);
};

const validateEarnReference = (value, label) => {
  if (
    typeof value !== 'string' ||
    (value !== '' && !EARN_REFERENCE_PATTERN.test(value))
  ) {
    throw new Error(label + ' invalid');
  }
  return value;
};

const validateEarnDisplay = (value, display, label) => {
  if (typeof display !== 'string' || display !== formatNumber(value)) {
    throw new Error(label + ' display mismatch');
  }
};

const earnHistoryResultLabel = (status, task, kind) => {
  if (status !== 'completed') return EARN_STATUS_LABELS[status];
  if (task === 'verify') return 'Verified';
  if (task === 'redundancy') return 'Checked';
  return kind === 'receipt' ? 'Accepted' : 'Stored';
};

const validateEarnJobRow = (row, index) => {
  const label = 'earn snapshot.recent_jobs.items[' + index + ']';
  exactKeys(
    row,
    [
      'reference',
      'short_reference',
      'receipt_reference',
      'short_receipt_reference',
      'task_class',
      'task_label',
      'status',
      'status_label',
      'result_label',
      'recorded_at',
      'reward_wc',
      'reward_display',
      'dataset_selected',
      'safe_mode',
    ],
    label,
  );
  const reference = validateEarnReference(row.reference, label + '.reference');
  const receiptReference = validateEarnReference(
    row.receipt_reference,
    label + '.receipt_reference',
  );
  if (
    row.short_reference !== earnShortReference(reference) ||
    row.short_receipt_reference !== earnShortReference(receiptReference)
  ) {
    throw new Error(label + ' short reference mismatch');
  }
  const task = validateEarnTask(row.task_class, label + '.task_class');
  if (row.task_label !== EARN_TASK_LABELS[task]) {
    throw new Error(label + ' task label mismatch');
  }
  const status = validateEarnStatus(row.status, label + '.status');
  if (
    row.status_label !== EARN_STATUS_LABELS[status] ||
    row.result_label !== earnHistoryResultLabel(status, task, 'job')
  ) {
    throw new Error(label + ' status label mismatch');
  }
  validateEarnCanonicalTimestampOrNull(
    row.recorded_at,
    label + '.recorded_at',
  );
  const reward = nullableNonNegativeFinite(
    row.reward_wc,
    label + '.reward_wc',
  );
  validateEarnDisplay(reward, row.reward_display, label + '.reward');
  validateEarnBoolean(row.dataset_selected, label + '.dataset_selected');
  if (row.safe_mode !== null && typeof row.safe_mode !== 'boolean') {
    throw new Error(label + '.safe_mode invalid');
  }
};

const validateEarnReceiptRow = (row, index) => {
  const label = 'earn snapshot.verification_receipts.items[' + index + ']';
  exactKeys(
    row,
    [
      'reference',
      'short_reference',
      'job_reference',
      'short_job_reference',
      'task_class',
      'task_label',
      'status',
      'status_label',
      'result_label',
      'recorded_at',
      'reward_wc',
      'reward_display',
      'bytes',
      'bytes_display',
    ],
    label,
  );
  const reference = validateEarnReference(row.reference, label + '.reference');
  const jobReference = validateEarnReference(
    row.job_reference,
    label + '.job_reference',
  );
  if (
    row.short_reference !== earnShortReference(reference) ||
    row.short_job_reference !== earnShortReference(jobReference)
  ) {
    throw new Error(label + ' short reference mismatch');
  }
  const task = validateEarnTask(row.task_class, label + '.task_class');
  if (row.task_label !== EARN_TASK_LABELS[task]) {
    throw new Error(label + ' task label mismatch');
  }
  const status = validateEarnStatus(row.status, label + '.status');
  if (
    row.status_label !== EARN_STATUS_LABELS[status] ||
    row.result_label !== earnHistoryResultLabel(status, task, 'receipt')
  ) {
    throw new Error(label + ' status label mismatch');
  }
  validateEarnCanonicalTimestampOrNull(
    row.recorded_at,
    label + '.recorded_at',
  );
  const reward = nullableNonNegativeFinite(
    row.reward_wc,
    label + '.reward_wc',
  );
  validateEarnDisplay(reward, row.reward_display, label + '.reward');
  const bytes = nullableNonNegativeSafeInteger(
    row.bytes,
    label + '.bytes',
  );
  const expectedBytesDisplay = bytes === null
    ? '—'
    : new Intl.NumberFormat('en-US').format(bytes);
  if (row.bytes_display !== expectedBytesDisplay) {
    throw new Error(label + ' bytes display mismatch');
  }
};

const validateEarnHistory = (value, label, rowValidator) => {
  exactKeys(value, ['available', 'count', 'limit', 'items'], label);
  validateEarnBoolean(value.available, label + '.available');
  const count = nonNegativeSafeInteger(value.count);
  if (
    count === null ||
    value.limit !== EARN_HISTORY_LIMIT ||
    !Array.isArray(value.items) ||
    value.items.length !== count ||
    count > EARN_HISTORY_LIMIT
  ) {
    throw new Error(label + ' history contract mismatch');
  }
  value.items.forEach((row, index) => rowValidator(row, index));
};

const validateEarnSource = (value, key) => {
  const label = 'earn snapshot.sources.' + key;
  exactKeys(value, ['route', 'ok', 'status'], label);
  if (value.route !== EARN_SOURCE_ROUTES[key]) {
    throw new Error(label + ' route mismatch');
  }
  validateEarnBoolean(value.ok, label + '.ok');
  if (
    !Number.isSafeInteger(value.status) ||
    value.status < 0 ||
    value.status > 599
  ) {
    throw new Error(label + '.status invalid');
  }
  const responseOk = value.status >= 200 && value.status <= 299;
  if (value.ok !== responseOk) {
    throw new Error(label + ' HTTP availability contradiction');
  }
};

const validateEarnGeneratedAtV1 = (
  raw,
  requestStartedAtMs,
  evaluatedAtMs,
) => {
  if (typeof raw !== 'string') {
    throw new Error('Earn generated timestamp invalid');
  }
  if (
    !Number.isSafeInteger(requestStartedAtMs) ||
    requestStartedAtMs < 0 ||
    !Number.isSafeInteger(evaluatedAtMs) ||
    evaluatedAtMs < requestStartedAtMs
  ) {
    throw new Error('Earn freshness context invalid');
  }

  const generated = new Date(raw);
  const generatedAtMs = generated.getTime();
  if (
    !Number.isFinite(generatedAtMs) ||
    generated.toISOString() !== raw
  ) {
    throw new Error('Earn generated timestamp invalid');
  }

  const ageAtRequestStartMs = requestStartedAtMs - generatedAtMs;
  const ageAtEvaluationMs = evaluatedAtMs - generatedAtMs;
  if (
    ageAtRequestStartMs < -EARN_SNAPSHOT_MAX_FUTURE_SKEW_MS ||
    ageAtRequestStartMs > EARN_SNAPSHOT_MAX_AGE_MS ||
    ageAtEvaluationMs < -EARN_SNAPSHOT_MAX_FUTURE_SKEW_MS ||
    ageAtEvaluationMs > EARN_SNAPSHOT_MAX_AGE_MS
  ) {
    throw new Error('Earn generated timestamp outside freshness window');
  }
};

export const validateEarnSnapshotV1 = (
  snapshot,
  expectedAccount,
  {
    requestStartedAtMs = Date.now(),
    evaluatedAtMs = requestStartedAtMs,
  } = {},
) => {
  exactKeys(
    snapshot,
    [
      'ok',
      'marker',
      'generated_at',
      'read_only',
      'network_name',
      'node',
      'account',
      'earning',
      'accounting',
      'recent_jobs',
      'verification_receipts',
      'datanet',
      'sources',
      'sanitization',
      'boundaries',
    ],
    'earn snapshot',
  );
  if (snapshot.ok !== true || snapshot.marker !== EARN_MARKER) {
    throw new Error('Unexpected Earn adapter response');
  }
  if (snapshot.read_only !== true || snapshot.network_name !== 'Mainnet-0') {
    throw new Error('Earn read-only/network contract mismatch');
  }
  if (
    typeof expectedAccount !== 'string' ||
    !ACCOUNT_PATTERN.test(expectedAccount)
  ) {
    throw new Error('Earn expected account invalid');
  }

  validateEarnGeneratedAtV1(
    snapshot.generated_at,
    requestStartedAtMs,
    evaluatedAtMs,
  );

  exactKeys(snapshot.node, ['label', 'role'], 'earn snapshot.node');
  boundedEarnText(snapshot.node.label, 'earn snapshot.node.label', 128);
  if (!EARN_NODE_ROLES.has(snapshot.node.role)) {
    throw new Error('Earn node role invalid');
  }

  exactKeys(snapshot.account, ['selected', 'id', 'label'], 'earn snapshot.account');
  if (
    snapshot.account.selected !== true ||
    snapshot.account.id !== expectedAccount ||
    snapshot.account.label !== expectedAccount ||
    !ACCOUNT_PATTERN.test(snapshot.account.id)
  ) {
    throw new Error('Earn response account does not match request');
  }

  exactKeys(
    snapshot.earning,
    [
      'source_available',
      'status',
      'status_label',
      'enabled',
      'manual_only',
      'automatic_background',
      'safe_mode',
      'policy',
      'approved_task_classes',
      'jobs_last_hour',
      'max_jobs_per_hour',
      'summary',
      'available_work',
    ],
    'earn snapshot.earning',
  );
  for (const key of [
    'source_available',
    'enabled',
    'manual_only',
    'automatic_background',
    'safe_mode',
  ]) {
    validateEarnBoolean(
      snapshot.earning[key],
      'earn snapshot.earning.' + key,
    );
  }
  if (
    snapshot.earning.manual_only && snapshot.earning.automatic_background ||
    !snapshot.earning.enabled &&
      (snapshot.earning.manual_only || snapshot.earning.automatic_background) ||
    !snapshot.earning.source_available && snapshot.earning.enabled
  ) {
    throw new Error('Earn earning state contradiction');
  }
  const expectedEarningStatus = !snapshot.earning.source_available
    ? 'unavailable'
    : !snapshot.earning.enabled
      ? 'stopped'
      : snapshot.earning.manual_only
        ? 'manual_only'
        : snapshot.earning.automatic_background
          ? 'active'
          : 'configured';
  if (
    snapshot.earning.status !== expectedEarningStatus ||
    snapshot.earning.status_label !==
      EARN_EARNING_LABELS[expectedEarningStatus] ||
    snapshot.earning.summary !==
      EARN_EARNING_SUMMARIES[expectedEarningStatus]
  ) {
    throw new Error('Earn earning status projection mismatch');
  }
  if (
    ![
      'Useful, verifiable work only',
      'Policy unavailable',
    ].includes(snapshot.earning.policy)
  ) {
    throw new Error('Earn policy label invalid');
  }
  if (
    !Array.isArray(snapshot.earning.approved_task_classes) ||
    snapshot.earning.approved_task_classes.length > 4
  ) {
    throw new Error('Earn approved task classes invalid');
  }
  const approvedTasks = new Set();
  for (const [index, row] of
    snapshot.earning.approved_task_classes.entries()) {
    const label = 'earn snapshot.earning.approved_task_classes[' + index + ']';
    exactKeys(row, ['task_class', 'label'], label);
    const task = validateEarnTask(row.task_class, label + '.task_class');
    if (row.label !== EARN_TASK_LABELS[task] || approvedTasks.has(task)) {
      throw new Error(label + ' invalid');
    }
    approvedTasks.add(task);
  }
  nullableNonNegativeSafeInteger(
    snapshot.earning.jobs_last_hour,
    'earn snapshot.earning.jobs_last_hour',
  );
  nullableNonNegativeSafeInteger(
    snapshot.earning.max_jobs_per_hour,
    'earn snapshot.earning.max_jobs_per_hour',
  );

  const work = snapshot.earning.available_work;
  exactKeys(
    work,
    [
      'available',
      'task_class',
      'task_label',
      'reason',
      'difficulty',
      'network_need_score',
      'dataset_selected',
      'execution_available',
    ],
    'earn snapshot.earning.available_work',
  );
  validateEarnBoolean(
    work.available,
    'earn snapshot.earning.available_work.available',
  );
  validateEarnBoolean(
    work.dataset_selected,
    'earn snapshot.earning.available_work.dataset_selected',
  );
  if (work.execution_available !== false) {
    throw new Error('Earn execution authority elevated');
  }
  if (!EARN_REASON_LABELS.has(work.reason)) {
    throw new Error('Earn available-work reason invalid');
  }
  if (
    work.difficulty !== null &&
    !['low', 'medium', 'high'].includes(work.difficulty)
  ) {
    throw new Error('Earn available-work difficulty invalid');
  }
  nullableNonNegativeFinite(
    work.network_need_score,
    'earn snapshot.earning.available_work.network_need_score',
  );
  if (work.available) {
    const task = validateEarnTask(
      work.task_class,
      'earn snapshot.earning.available_work.task_class',
    );
    if (work.task_label !== EARN_TASK_LABELS[task]) {
      throw new Error('Earn available-work task label mismatch');
    }
  } else if (
    work.task_class !== null ||
    work.task_label !== 'No task selected'
  ) {
    throw new Error('Earn unavailable-work projection mismatch');
  }

  exactKeys(
    snapshot.accounting,
    ['legacy_wc', 'production_wc', 'rewards_last_hour', 'last_credit'],
    'earn snapshot.accounting',
  );

  const legacy = snapshot.accounting.legacy_wc;
  exactKeys(
    legacy,
    [
      'available',
      'earned',
      'earned_display',
      'redeemed',
      'redeemed_display',
      'redeemable',
      'redeemable_display',
      'debited',
      'debited_display',
      'spendable_claimed',
      'redemption_action_available',
    ],
    'earn snapshot.accounting.legacy_wc',
  );
  validateEarnBoolean(
    legacy.available,
    'earn snapshot.accounting.legacy_wc.available',
  );
  const earned = nullableNonNegativeFinite(
    legacy.earned,
    'earn snapshot.accounting.legacy_wc.earned',
  );
  const redeemed = nullableNonNegativeFinite(
    legacy.redeemed,
    'earn snapshot.accounting.legacy_wc.redeemed',
  );
  const redeemable = nullableNonNegativeFinite(
    legacy.redeemable,
    'earn snapshot.accounting.legacy_wc.redeemable',
  );
  const debited = nullableNonNegativeFinite(
    legacy.debited,
    'earn snapshot.accounting.legacy_wc.debited',
  );
  if (legacy.available !== (earned !== null)) {
    throw new Error('Earn legacy-WC availability contradiction');
  }
  if (
    !legacy.available &&
    [earned, redeemed, redeemable, debited].some((value) => value !== null)
  ) {
    throw new Error('Earn unavailable legacy-WC values must remain null');
  }
  validateEarnDisplay(earned, legacy.earned_display, 'earn legacy earned');
  validateEarnDisplay(redeemed, legacy.redeemed_display, 'earn legacy redeemed');
  validateEarnDisplay(
    redeemable,
    legacy.redeemable_display,
    'earn legacy redeemable',
  );
  validateEarnDisplay(debited, legacy.debited_display, 'earn legacy debited');
  if (
    legacy.spendable_claimed !== false ||
    legacy.redemption_action_available !== false
  ) {
    throw new Error('Earn legacy-WC authority elevated');
  }

  const production = snapshot.accounting.production_wc;
  exactKeys(
    production,
    [
      'available',
      'balance',
      'display',
      'entries',
      'ledger_version',
      'spendable',
      'redeemable',
      'transferable',
      'included_in_legacy_balance',
    ],
    'earn snapshot.accounting.production_wc',
  );
  validateEarnBoolean(
    production.available,
    'earn snapshot.accounting.production_wc.available',
  );
  const productionBalance = nullableNonNegativeFinite(
    production.balance,
    'earn snapshot.accounting.production_wc.balance',
  );
  const productionEntries = nullableNonNegativeSafeInteger(
    production.entries,
    'earn snapshot.accounting.production_wc.entries',
  );
  if (production.available !== (productionBalance !== null)) {
    throw new Error('Earn production-WC availability contradiction');
  }
  if (
    !production.available &&
    (productionEntries !== null || production.ledger_version !== '')
  ) {
    throw new Error('Earn unavailable production-WC metadata invalid');
  }
  boundedEarnText(
    production.ledger_version,
    'earn snapshot.accounting.production_wc.ledger_version',
    128,
    !production.available,
  );
  validateEarnDisplay(
    productionBalance,
    production.display,
    'earn production balance',
  );
  for (const key of [
    'spendable',
    'redeemable',
    'transferable',
    'included_in_legacy_balance',
  ]) {
    if (production[key] !== false) {
      throw new Error('Earn production-WC authority elevated: ' + key);
    }
  }

  const rewards = snapshot.accounting.rewards_last_hour;
  exactKeys(
    rewards,
    ['total', 'total_display', 'publish', 'verify', 'redundancy'],
    'earn snapshot.accounting.rewards_last_hour',
  );
  const rewardTotal = nullableNonNegativeFinite(
    rewards.total,
    'earn snapshot.accounting.rewards_last_hour.total',
  );
  nullableNonNegativeFinite(
    rewards.publish,
    'earn snapshot.accounting.rewards_last_hour.publish',
  );
  nullableNonNegativeFinite(
    rewards.verify,
    'earn snapshot.accounting.rewards_last_hour.verify',
  );
  nullableNonNegativeFinite(
    rewards.redundancy,
    'earn snapshot.accounting.rewards_last_hour.redundancy',
  );
  validateEarnDisplay(
    rewardTotal,
    rewards.total_display,
    'earn rewards total',
  );

  const lastCredit = snapshot.accounting.last_credit;
  exactKeys(
    lastCredit,
    [
      'available',
      'amount',
      'amount_display',
      'task_class',
      'task_label',
      'reason',
      'recorded_at',
    ],
    'earn snapshot.accounting.last_credit',
  );
  validateEarnBoolean(
    lastCredit.available,
    'earn snapshot.accounting.last_credit.available',
  );
  const lastCreditAmount = nullableNonNegativeFinite(
    lastCredit.amount,
    'earn snapshot.accounting.last_credit.amount',
  );
  if (lastCredit.available !== (lastCreditAmount !== null)) {
    throw new Error('Earn last-credit availability contradiction');
  }
  validateEarnDisplay(
    lastCreditAmount,
    lastCredit.amount_display,
    'earn last credit',
  );
  if (lastCredit.available) {
    const task = validateEarnTask(
      lastCredit.task_class,
      'earn snapshot.accounting.last_credit.task_class',
    );
    if (
      lastCredit.task_label !== EARN_TASK_LABELS[task] ||
      !EARN_REASON_LABELS.has(lastCredit.reason)
    ) {
      throw new Error('Earn last-credit label mismatch');
    }
    validateEarnCanonicalTimestampOrNull(
      lastCredit.recorded_at,
      'earn snapshot.accounting.last_credit.recorded_at',
    );
  } else if (
    lastCredit.task_class !== null ||
    lastCredit.task_label !== 'No credit recorded' ||
    lastCredit.reason !== 'No credit recorded.' ||
    lastCredit.recorded_at !== null
  ) {
    throw new Error('Earn absent last-credit projection mismatch');
  }

  validateEarnHistory(
    snapshot.recent_jobs,
    'earn snapshot.recent_jobs',
    validateEarnJobRow,
  );
  validateEarnHistory(
    snapshot.verification_receipts,
    'earn snapshot.verification_receipts',
    validateEarnReceiptRow,
  );

  exactKeys(
    snapshot.datanet,
    [
      'source_available',
      'status',
      'receipt_store_records',
      'account_wc_events',
      'useful_work_policy',
      'mutation',
    ],
    'earn snapshot.datanet',
  );
  validateEarnBoolean(
    snapshot.datanet.source_available,
    'earn snapshot.datanet.source_available',
  );
  if (!['available', 'unavailable'].includes(snapshot.datanet.status)) {
    throw new Error('Earn DataNet status invalid');
  }
  nullableNonNegativeSafeInteger(
    snapshot.datanet.receipt_store_records,
    'earn snapshot.datanet.receipt_store_records',
  );
  nullableNonNegativeSafeInteger(
    snapshot.datanet.account_wc_events,
    'earn snapshot.datanet.account_wc_events',
  );
  if (
    ![
      'Useful, verifiable work only',
      'Policy unavailable',
    ].includes(snapshot.datanet.useful_work_policy) ||
    snapshot.datanet.mutation !== false
  ) {
    throw new Error('Earn DataNet policy/authority mismatch');
  }
  if (
    snapshot.datanet.status === 'available' &&
    snapshot.datanet.source_available !== true
  ) {
    throw new Error('Earn DataNet availability contradiction');
  }

  exactKeys(
    snapshot.sources,
    Object.keys(EARN_SOURCE_ROUTES),
    'earn snapshot.sources',
  );
  for (const key of Object.keys(EARN_SOURCE_ROUTES)) {
    validateEarnSource(snapshot.sources[key], key);
  }

  if (
    snapshot.earning.source_available &&
    (
      snapshot.sources.runner_status.status !== 200 ||
      snapshot.sources.runner_status.ok !== true
    )
  ) {
    throw new Error('Earn runner source availability contradiction');
  }
  if (
    legacy.available &&
    (
      snapshot.sources.redeemable.status !== 200 ||
      snapshot.sources.redeemable.ok !== true
    )
  ) {
    throw new Error('Earn legacy-WC source availability contradiction');
  }
  if (
    production.available &&
    (
      snapshot.sources.production_wc.status !== 200 ||
      snapshot.sources.production_wc.ok !== true
    )
  ) {
    throw new Error('Earn production-WC source availability contradiction');
  }
  if (
    snapshot.recent_jobs.available !==
      (snapshot.sources.jobs.status === 200) ||
    snapshot.verification_receipts.available !==
      (snapshot.sources.receipts.status === 200)
  ) {
    throw new Error('Earn history source availability contradiction');
  }
  if (
    snapshot.datanet.source_available &&
    (
      snapshot.sources.datanet_wc.status !== 200 ||
      snapshot.sources.datanet_wc.ok !== true
    )
  ) {
    throw new Error('Earn DataNet source availability contradiction');
  }

  exactKeys(
    snapshot.sanitization,
    EARN_SANITIZATION_KEYS,
    'earn snapshot.sanitization',
  );
  for (const key of EARN_SANITIZATION_KEYS) {
    if (snapshot.sanitization[key] !== false) {
      throw new Error('Earn sanitization boundary elevated: ' + key);
    }
  }

  exactKeys(
    snapshot.boundaries,
    EARN_BOUNDARY_KEYS,
    'earn snapshot.boundaries',
  );
  for (const key of EARN_BOUNDARY_KEYS) {
    if (snapshot.boundaries[key] !== false) {
      throw new Error('Earn authority boundary elevated: ' + key);
    }
  }

  return snapshot;
};

const currentRoute = () => {
  if (typeof window === 'undefined') return '';
  return String(window.location.hash || '')
    .replace(/^#\/?/, '')
    .split(/[?\/]/, 1)[0] || 'home';
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
      finiteNumber(item?.reward_wc) !== null
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

const renderEarn = (
  snapshot,
  expectedAccount,
  requestStartedAtMs = Date.now(),
) => {
  const checked = validateEarnSnapshotV1(snapshot, expectedAccount, {
    requestStartedAtMs,
    evaluatedAtMs: Date.now(),
  });

  const account = checked.account || {};
  const earning = checked.earning || {};
  const accounting = checked.accounting || {};
  const legacy = accounting.legacy_wc || {};
  const production = accounting.production_wc || {};
  const rewards = accounting.rewards_last_hour || {};
  const lastCredit = accounting.last_credit || {};
  const availableWork = earning.available_work || {};
  const jobs = checked.recent_jobs || {};
  const receipts = checked.verification_receipts || {};
  const datanet = checked.datanet || {};
  const sources = checked.sources || {};
  const networkNeedScore = finiteNumber(
    availableWork.network_need_score
  );
  const jobsCount = nonNegativeSafeInteger(jobs.count);
  const receiptsCount = nonNegativeSafeInteger(receipts.count);

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
    networkNeedScore !== null
      ? networkNeedScore.toFixed(2)
      : '—'
  );

  setText('[data-earn-last-hour]', rewards.total_display);
  setText(
    '[data-earn-last-credit]',
    lastCredit.available === true
      ? `+${lastCredit.amount_display} WC · ${lastCredit.task_label}`
      : 'No credit recorded'
  );
  setText(
    '[data-earn-last-credit-time]',
    lastCredit.available === true
      ? formatTime(lastCredit.recorded_at)
      : '—'
  );

  setText('[data-earn-jobs-count]', jobsCount);
  setText('[data-earn-receipts-count]', receiptsCount);

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

const invalidateEarnRequest = (reason) => {
  requestSerial += 1;
  earnRequestOwner.cancel(reason);
};

export const restoreEarnLoadControlV1 = (button) => {
  if (button) button.disabled = false;
};

export const clearEarnViewV1 = ({
  invalidate = invalidateEarnRequest,
  storage = sessionStorage,
  input = null,
  button = null,
  reset = resetEarnView,
} = {}) => {
  invalidate('earn cleared');
  storage.removeItem(EARN_ACCOUNT_STORAGE_KEY);
  if (input) input.value = '';
  reset();
  restoreEarnLoadControlV1(button);
  input?.focus();
};

const loadAccount = async (account, button) => {
  const value = String(account || '').trim();

  if (!ACCOUNT_PATTERN.test(value)) {
    renderError(
      'Use 1–128 letters, numbers, periods, underscores, colons, or hyphens.'
    );
    return;
  }

  const serial = ++requestSerial;
  const requestStartedAtMs = Date.now();
  earnRequestOwner.cancel('earn request replaced');

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

  const route = `${EARN_ENDPOINT}?account=${encodeURIComponent(value)}`;
  const expectedUrl = new URL(route, window.location.origin).href;

  try {
    const checked = await earnRequestOwner.run(
      route,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'error',
        mode: 'same-origin',
        referrerPolicy: 'no-referrer',
        signal: AbortSignal.timeout(EARN_REQUEST_TIMEOUT_MS),
      },
      async (response, signal, lifetime) => {
        if (response.url !== expectedUrl) {
          throw new Error('Earn adapter final URL mismatch');
        }
        const contentType = String(
          response.headers.get('content-type') || '',
        ).toLowerCase();
        if (!contentType.includes('application/json')) {
          throw new Error('Earn adapter content type mismatch');
        }

        const body = await readBoundedNetworkJsonV1(
          response,
          signal,
          lifetime,
        );

        if (!response.ok || !body?.ok) {
          throw new Error(
            body?.error ||
            `Earn adapter returned HTTP ${response.status}`
          );
        }

        return validateEarnSnapshotV1(body, value, {
          requestStartedAtMs,
          evaluatedAtMs: Date.now(),
        });
      },
    );

    if (serial !== requestSerial || currentRoute() !== 'earn') return;

    renderEarn(checked, value, requestStartedAtMs);
    sessionStorage.setItem(EARN_ACCOUNT_STORAGE_KEY, value);
  } catch (error) {
    if (serial !== requestSerial || currentRoute() !== 'earn') return;
    renderError(
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    if (serial === requestSerial && currentRoute() === 'earn') {
      restoreEarnLoadControlV1(button);
    }
  }
};

const bindEarnView = () => {
  if (currentRoute() !== 'earn') {
    if (earnViewPresent || earnRequestOwner.isActive()) {
      invalidateEarnRequest('earn route left');
    }
    earnViewPresent = false;
    return;
  }

  const form = document.querySelector('[data-earn-account-form]');

  if (!form) {
    if (earnViewPresent || earnRequestOwner.isActive()) {
      invalidateEarnRequest('earn view removed');
    }
    earnViewPresent = false;
    return;
  }
  earnViewPresent = true;

  if (form.dataset.earnBound === 'true') return;

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
      clearEarnViewV1({ input, button });
    }
  );

  if (saved) {
    queueMicrotask(() => {
      if (currentRoute() === 'earn') {
        loadAccount(saved, button);
      }
    });
  }
};

if (
  typeof document !== 'undefined' &&
  typeof MutationObserver !== 'undefined'
) {
  const observer = new MutationObserver(() => bindEarnView());
  window.addEventListener('hashchange', () => bindEarnView());

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
}
