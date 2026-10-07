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

const EARN_TOP_KEYS = Object.freeze([
  'account',
  'accounting',
  'boundaries',
  'datanet',
  'earning',
  'generated_at',
  'marker',
  'network_name',
  'node',
  'ok',
  'read_only',
  'recent_jobs',
  'sanitization',
  'sources',
  'verification_receipts',
]);
const EARN_NODE_KEYS = Object.freeze(['label', 'role']);
const EARN_ACCOUNT_KEYS = Object.freeze(['selected', 'id', 'label']);
const EARN_EARNING_KEYS = Object.freeze([
  'approved_task_classes',
  'automatic_background',
  'available_work',
  'enabled',
  'jobs_last_hour',
  'manual_only',
  'max_jobs_per_hour',
  'policy',
  'safe_mode',
  'source_available',
  'status',
  'status_label',
  'summary',
]);
const EARN_AVAILABLE_WORK_KEYS = Object.freeze([
  'available',
  'dataset_selected',
  'difficulty',
  'execution_available',
  'network_need_score',
  'reason',
  'task_class',
  'task_label',
]);
const EARN_ACCOUNTING_KEYS = Object.freeze([
  'last_credit',
  'legacy_wc',
  'production_wc',
  'rewards_last_hour',
]);
const EARN_LEGACY_KEYS = Object.freeze([
  'available',
  'debited',
  'debited_display',
  'earned',
  'earned_display',
  'redeemable',
  'redeemable_display',
  'redeemed',
  'redeemed_display',
  'redemption_action_available',
  'spendable_claimed',
]);
const EARN_PRODUCTION_KEYS = Object.freeze([
  'available',
  'balance',
  'display',
  'entries',
  'included_in_legacy_balance',
  'ledger_version',
  'redeemable',
  'spendable',
  'transferable',
]);
const EARN_REWARDS_KEYS = Object.freeze([
  'publish',
  'redundancy',
  'total',
  'total_display',
  'verify',
]);
const EARN_LAST_CREDIT_KEYS = Object.freeze([
  'amount',
  'amount_display',
  'available',
  'reason',
  'recorded_at',
  'task_class',
  'task_label',
]);
const EARN_HISTORY_KEYS = Object.freeze([
  'available',
  'count',
  'items',
  'limit',
]);
const EARN_JOB_KEYS = Object.freeze([
  'dataset_selected',
  'receipt_reference',
  'recorded_at',
  'reference',
  'result_label',
  'reward_display',
  'reward_wc',
  'safe_mode',
  'short_receipt_reference',
  'short_reference',
  'status',
  'status_label',
  'task_class',
  'task_label',
]);
const EARN_RECEIPT_KEYS = Object.freeze([
  'bytes',
  'bytes_display',
  'job_reference',
  'recorded_at',
  'reference',
  'result_label',
  'reward_display',
  'reward_wc',
  'short_job_reference',
  'short_reference',
  'status',
  'status_label',
  'task_class',
  'task_label',
]);
const EARN_DATANET_KEYS = Object.freeze([
  'account_wc_events',
  'mutation',
  'receipt_store_records',
  'source_available',
  'status',
  'useful_work_policy',
]);
const EARN_SOURCE_NAMES = Object.freeze([
  'datanet_wc',
  'jobs',
  'production_wc',
  'receipts',
  'redeemable',
  'reward_stats',
  'runner_status',
]);
const EARN_SOURCE_KEYS = Object.freeze(['ok', 'route', 'status']);
const EARN_SOURCE_ROUTES = Object.freeze({
  datanet_wc: '/__void/participant/datanet-wc/status',
  jobs: '/jobs',
  production_wc: '/wc/production/balance',
  receipts: '/receipts',
  redeemable: '/wc/redeemable',
  reward_stats: '/wc/reward-stats',
  runner_status: '/wc/runner/status',
});
const EARN_SANITIZATION_KEYS = Object.freeze([
  'absolute_paths',
  'job_inputs',
  'job_meta',
  'raw_source_bodies',
  'receipt_leaves',
  'receipt_payloads',
  'receipt_roots',
  'redeemed_event_wallets',
  'wallet_addresses',
]);
const EARN_BOUNDARY_KEYS = Object.freeze([
  'browser_wallet_connection',
  'job_execution',
  'job_submission',
  'ledger_write',
  'money_movement',
  'operator_mutation',
  'reward_award',
  'runner_activation',
  'runner_config',
  'runner_tick',
  'validator_mutation',
  'wc_redeem',
  'wc_send',
  'wc_to_void',
]);
const EARN_TASK_LABELS = Object.freeze({
  publish: 'Publish data',
  redundancy: 'Check redundancy',
  verify: 'Verify data',
  work: 'Useful work',
});
const EARN_STATUS_LABELS = Object.freeze({
  completed: 'Completed',
  failed: 'Failed',
  queued: 'Queued',
  recorded: 'Recorded',
  running: 'Running',
});
const EARN_STATE_LABELS = Object.freeze({
  active: 'Active',
  configured: 'Configured',
  manual_only: 'Manual only',
  stopped: 'Stopped',
  unavailable: 'Unavailable',
});
const EARN_REFERENCE_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/;
const EARN_MAX_HISTORY_ITEMS = 5;

const requireBoolean = (value, label) => {
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean`);
  return value;
};

const requireBoundedString = (
  value,
  label,
  maxLength = 512,
  allowEmpty = false,
) => {
  if (
    typeof value !== 'string' ||
    value.length > maxLength ||
    (!allowEmpty && value.length === 0)
  ) {
    throw new Error(`${label} string invalid`);
  }
  return value;
};

const requireNullableNonNegativeFinite = (value, label) => {
  if (value === null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(`${label} numeric evidence invalid`);
  }
  return value;
};

const requireNullableNonNegativeSafeInteger = (value, label) => {
  if (value === null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(`${label} integer evidence invalid`);
  }
  return value;
};

const requireCanonicalNullableTime = (value, label) => {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`${label} timestamp invalid`);
  }
  const parsed = new Date(value);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    throw new Error(`${label} timestamp invalid`);
  }
  return value;
};

const requireDisplayPair = (value, display, label) => {
  requireBoundedString(display, `${label}.display`, 128);
  const expected = value === null ? '—' : formatNumber(value);
  if (display !== expected) {
    throw new Error(`${label} display mismatch`);
  }
};

const expectedShortReference = (value) => {
  if (!value) return '—';
  if (value.length <= 22) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
};

const requireReferencePair = (value, shortValue, label) => {
  if (
    typeof value !== 'string' ||
    (value.length > 0 && !EARN_REFERENCE_PATTERN.test(value))
  ) {
    throw new Error(`${label} reference invalid`);
  }
  requireBoundedString(shortValue, `${label}.short`, 22);
  if (shortValue !== expectedShortReference(value)) {
    throw new Error(`${label} short reference mismatch`);
  }
};

const requireTaskPair = (task, label, field) => {
  if (
    typeof task !== 'string' ||
    !Object.hasOwn(EARN_TASK_LABELS, task) ||
    label !== EARN_TASK_LABELS[task]
  ) {
    throw new Error(`${field} task contract mismatch`);
  }
};

const requireStatusPair = (status, label, field) => {
  if (
    typeof status !== 'string' ||
    !Object.hasOwn(EARN_STATUS_LABELS, status) ||
    label !== EARN_STATUS_LABELS[status]
  ) {
    throw new Error(`${field} status contract mismatch`);
  }
};

const validateApprovedTasksV1 = (value) => {
  if (!Array.isArray(value) || value.length > 4) {
    throw new Error('Earn approved task classes invalid');
  }
  const seen = new Set();
  for (const [index, row] of value.entries()) {
    exactKeys(row, ['label', 'task_class'], `earn approved task[${index}]`);
    requireTaskPair(
      row.task_class,
      row.label,
      `earn approved task[${index}]`,
    );
    if (seen.has(row.task_class)) {
      throw new Error('Earn approved task class duplicate');
    }
    seen.add(row.task_class);
  }
};

const validateEarnHistoryItemV1 = (item, kind, index) => {
  const label = `earn ${kind}[${index}]`;
  exactKeys(
    item,
    kind === 'job' ? EARN_JOB_KEYS : EARN_RECEIPT_KEYS,
    label,
  );
  requireReferencePair(item.reference, item.short_reference, label);
  if (kind === 'job') {
    requireReferencePair(
      item.receipt_reference,
      item.short_receipt_reference,
      `${label}.receipt`,
    );
  } else {
    requireReferencePair(
      item.job_reference,
      item.short_job_reference,
      `${label}.job`,
    );
  }

  requireTaskPair(item.task_class, item.task_label, label);
  requireStatusPair(item.status, item.status_label, label);
  requireBoundedString(item.result_label, `${label}.result_label`, 64);

  const expectedResult =
    item.status !== 'completed'
      ? EARN_STATUS_LABELS[item.status]
      : item.task_class === 'verify'
        ? 'Verified'
        : item.task_class === 'redundancy'
          ? 'Checked'
          : kind === 'job'
            ? 'Stored'
            : 'Accepted';
  if (item.result_label !== expectedResult) {
    throw new Error(`${label} result label mismatch`);
  }

  requireCanonicalNullableTime(item.recorded_at, `${label}.recorded_at`);
  const reward = requireNullableNonNegativeFinite(
    item.reward_wc,
    `${label}.reward_wc`,
  );
  requireDisplayPair(reward, item.reward_display, `${label}.reward_wc`);

  if (kind === 'job') {
    requireBoolean(item.dataset_selected, `${label}.dataset_selected`);
    if (item.safe_mode !== null && typeof item.safe_mode !== 'boolean') {
      throw new Error(`${label}.safe_mode invalid`);
    }
  } else {
    const bytes = requireNullableNonNegativeSafeInteger(
      item.bytes,
      `${label}.bytes`,
    );
    requireBoundedString(item.bytes_display, `${label}.bytes_display`, 128);
    const expectedBytes =
      bytes === null
        ? '—'
        : new Intl.NumberFormat('en-US').format(bytes);
    if (item.bytes_display !== expectedBytes) {
      throw new Error(`${label} bytes display mismatch`);
    }
  }
};

export const validateEarnHistoryV1 = (value, kind) => {
  exactKeys(value, EARN_HISTORY_KEYS, `earn ${kind} history`);
  requireBoolean(value.available, `earn ${kind}.available`);
  if (
    typeof value.count !== 'number' ||
    !Number.isSafeInteger(value.count) ||
    value.count < 0
  ) {
    throw new Error(`earn ${kind}.count invalid`);
  }
  if (value.limit !== EARN_MAX_HISTORY_ITEMS) {
    throw new Error(`earn ${kind}.limit invalid`);
  }
  if (
    !Array.isArray(value.items) ||
    value.items.length > EARN_MAX_HISTORY_ITEMS ||
    value.count !== value.items.length
  ) {
    throw new Error(`earn ${kind} history count mismatch`);
  }
  if (
    value.available === false &&
    (value.count !== 0 || value.items.length !== 0)
  ) {
    throw new Error(`earn ${kind} unavailable history must be empty`);
  }
  value.items.forEach((item, index) =>
    validateEarnHistoryItemV1(item, kind, index)
  );
};

const validateEarnSourceRowV1 = (row, name) => {
  exactKeys(row, EARN_SOURCE_KEYS, `earn source.${name}`);
  if (row.route !== EARN_SOURCE_ROUTES[name]) {
    throw new Error(`earn source.${name} route mismatch`);
  }
  requireBoolean(row.ok, `earn source.${name}.ok`);
  if (
    typeof row.status !== 'number' ||
    !Number.isSafeInteger(row.status) ||
    row.status < 0 ||
    row.status > 599
  ) {
    throw new Error(`earn source.${name}.status invalid`);
  }
  const httpOk = row.status >= 200 && row.status < 300;
  if (row.ok !== httpOk) {
    throw new Error(`earn source.${name} status/ok mismatch`);
  }
};

const requireAllFalseV1 = (value, keys, label) => {
  exactKeys(value, keys, label);
  for (const key of keys) {
    if (value[key] !== false) {
      throw new Error(`${label} elevated: ${key}`);
    }
  }
};

const validateEarnSnapshotSchemaV1 = (snapshot) => {
  exactKeys(snapshot, EARN_TOP_KEYS, 'earn snapshot');
  exactKeys(snapshot.node, EARN_NODE_KEYS, 'earn snapshot.node');
  const expectedNodeLabels = {
    alienware: 'Alienware',
    local: 'Local node',
    nimo: 'Nimo',
    precision: 'Precision',
  };
  if (
    typeof snapshot.node.role !== 'string' ||
    !Object.hasOwn(expectedNodeLabels, snapshot.node.role) ||
    snapshot.node.label !== expectedNodeLabels[snapshot.node.role]
  ) {
    throw new Error('Earn node identity invalid');
  }

  exactKeys(snapshot.earning, EARN_EARNING_KEYS, 'earn snapshot.earning');
  const earning = snapshot.earning;
  for (const key of [
    'automatic_background',
    'enabled',
    'manual_only',
    'safe_mode',
    'source_available',
  ]) {
    requireBoolean(earning[key], `earn earning.${key}`);
  }
  if (
    typeof earning.status !== 'string' ||
    !Object.hasOwn(EARN_STATE_LABELS, earning.status) ||
    earning.status_label !== EARN_STATE_LABELS[earning.status]
  ) {
    throw new Error('Earn earning status contract mismatch');
  }
  const expectedEarningStatus =
    !earning.source_available
      ? 'unavailable'
      : !earning.enabled
        ? 'stopped'
        : earning.manual_only
          ? 'manual_only'
          : earning.automatic_background
            ? 'active'
            : 'configured';
  if (earning.status !== expectedEarningStatus) {
    throw new Error('Earn earning status/evidence mismatch');
  }
  if (!earning.enabled && (earning.manual_only || earning.automatic_background)) {
    throw new Error('Earn disabled runner claims active mode');
  }
  if (
    ![
      'Policy unavailable',
      'Useful, verifiable work only',
    ].includes(earning.policy)
  ) {
    throw new Error('Earn earning policy invalid');
  }
  requireBoundedString(earning.summary, 'earn earning.summary', 768);
  validateApprovedTasksV1(earning.approved_task_classes);
  requireNullableNonNegativeSafeInteger(
    earning.jobs_last_hour,
    'earn earning.jobs_last_hour',
  );
  requireNullableNonNegativeSafeInteger(
    earning.max_jobs_per_hour,
    'earn earning.max_jobs_per_hour',
  );

  exactKeys(
    earning.available_work,
    EARN_AVAILABLE_WORK_KEYS,
    'earn snapshot.earning.available_work',
  );
  const work = earning.available_work;
  requireBoolean(work.available, 'earn available_work.available');
  requireBoolean(work.dataset_selected, 'earn available_work.dataset_selected');
  if (work.execution_available !== false) {
    throw new Error('Earn available work execution authority elevated');
  }
  if (work.available) {
    requireTaskPair(
      work.task_class,
      work.task_label,
      'earn available_work',
    );
  } else if (
    work.task_class !== null ||
    work.task_label !== 'No task selected'
  ) {
    throw new Error('Earn unavailable work task contradiction');
  }
  requireBoundedString(work.reason, 'earn available_work.reason', 512);
  if (
    work.difficulty !== null &&
    !['high', 'low', 'medium'].includes(work.difficulty)
  ) {
    throw new Error('Earn available work difficulty invalid');
  }
  requireNullableNonNegativeFinite(
    work.network_need_score,
    'earn available_work.network_need_score',
  );

  exactKeys(snapshot.accounting, EARN_ACCOUNTING_KEYS, 'earn accounting');
  const accounting = snapshot.accounting;

  exactKeys(accounting.legacy_wc, EARN_LEGACY_KEYS, 'earn legacy_wc');
  const legacy = accounting.legacy_wc;
  requireBoolean(legacy.available, 'earn legacy_wc.available');
  const legacyNumbers = ['earned', 'redeemed', 'redeemable', 'debited'];
  const legacyValues = legacyNumbers.map((key) =>
    requireNullableNonNegativeFinite(
      legacy[key],
      `earn legacy_wc.${key}`,
    )
  );
  if (
    legacy.available !== legacyValues.every((value) => value !== null)
  ) {
    throw new Error('Earn legacy WC availability/value mismatch');
  }
  legacyNumbers.forEach((key, index) =>
    requireDisplayPair(
      legacyValues[index],
      legacy[`${key}_display`],
      `earn legacy_wc.${key}`,
    )
  );
  if (
    legacy.spendable_claimed !== false ||
    legacy.redemption_action_available !== false
  ) {
    throw new Error('Earn legacy WC action authority elevated');
  }

  exactKeys(
    accounting.production_wc,
    EARN_PRODUCTION_KEYS,
    'earn production_wc',
  );
  const production = accounting.production_wc;
  requireBoolean(production.available, 'earn production_wc.available');
  const productionBalance = requireNullableNonNegativeFinite(
    production.balance,
    'earn production_wc.balance',
  );
  const productionEntries = requireNullableNonNegativeSafeInteger(
    production.entries,
    'earn production_wc.entries',
  );
  requireDisplayPair(
    productionBalance,
    production.display,
    'earn production_wc.balance',
  );
  requireBoundedString(
    production.ledger_version,
    'earn production_wc.ledger_version',
    128,
    !production.available,
  );
  if (
    production.available
      ? productionBalance === null ||
        productionEntries === null ||
        production.ledger_version.length === 0
      : productionBalance !== null ||
        productionEntries !== null ||
        production.ledger_version !== ''
  ) {
    throw new Error('Earn production WC availability/value mismatch');
  }
  for (const key of [
    'included_in_legacy_balance',
    'redeemable',
    'spendable',
    'transferable',
  ]) {
    if (production[key] !== false) {
      throw new Error(`Earn production WC authority elevated: ${key}`);
    }
  }

  exactKeys(
    accounting.rewards_last_hour,
    EARN_REWARDS_KEYS,
    'earn rewards_last_hour',
  );
  const rewards = accounting.rewards_last_hour;
  for (const key of ['publish', 'redundancy', 'total', 'verify']) {
    requireNullableNonNegativeFinite(
      rewards[key],
      `earn rewards_last_hour.${key}`,
    );
  }
  requireDisplayPair(
    rewards.total,
    rewards.total_display,
    'earn rewards_last_hour.total',
  );

  exactKeys(
    accounting.last_credit,
    EARN_LAST_CREDIT_KEYS,
    'earn last_credit',
  );
  const lastCredit = accounting.last_credit;
  requireBoolean(lastCredit.available, 'earn last_credit.available');
  const creditAmount = requireNullableNonNegativeFinite(
    lastCredit.amount,
    'earn last_credit.amount',
  );
  requireDisplayPair(
    creditAmount,
    lastCredit.amount_display,
    'earn last_credit.amount',
  );
  requireBoundedString(lastCredit.reason, 'earn last_credit.reason', 512);
  requireCanonicalNullableTime(
    lastCredit.recorded_at,
    'earn last_credit.recorded_at',
  );
  if (lastCredit.available) {
    if (creditAmount === null) {
      throw new Error('Earn last credit amount unavailable');
    }
    requireTaskPair(
      lastCredit.task_class,
      lastCredit.task_label,
      'earn last_credit',
    );
  } else if (
    creditAmount !== null ||
    lastCredit.task_class !== null ||
    lastCredit.task_label !== 'No credit recorded' ||
    lastCredit.reason !== 'No credit recorded.' ||
    lastCredit.recorded_at !== null
  ) {
    throw new Error('Earn last credit unavailable-state mismatch');
  }

  validateEarnHistoryV1(snapshot.recent_jobs, 'job');
  validateEarnHistoryV1(snapshot.verification_receipts, 'receipt');

  exactKeys(snapshot.datanet, EARN_DATANET_KEYS, 'earn datanet');
  requireBoolean(snapshot.datanet.source_available, 'earn datanet.source_available');
  if (!['available', 'unavailable'].includes(snapshot.datanet.status)) {
    throw new Error('Earn DataNet status invalid');
  }
  if (
    snapshot.datanet.status === 'available' &&
    snapshot.datanet.source_available !== true
  ) {
    throw new Error('Earn DataNet available state lacks source evidence');
  }
  requireNullableNonNegativeSafeInteger(
    snapshot.datanet.receipt_store_records,
    'earn datanet.receipt_store_records',
  );
  requireNullableNonNegativeSafeInteger(
    snapshot.datanet.account_wc_events,
    'earn datanet.account_wc_events',
  );
  if (
    ![
      'Policy unavailable',
      'Useful, verifiable work only',
    ].includes(snapshot.datanet.useful_work_policy)
  ) {
    throw new Error('Earn DataNet policy invalid');
  }
  if (snapshot.datanet.mutation !== false) {
    throw new Error('Earn DataNet mutation authority elevated');
  }

  exactKeys(snapshot.sources, EARN_SOURCE_NAMES, 'earn sources');
  for (const name of EARN_SOURCE_NAMES) {
    validateEarnSourceRowV1(snapshot.sources[name], name);
  }
  if (
    snapshot.recent_jobs.available !==
      (snapshot.sources.jobs.ok === true &&
       snapshot.sources.jobs.status === 200) ||
    snapshot.verification_receipts.available !==
      (snapshot.sources.receipts.ok === true &&
       snapshot.sources.receipts.status === 200)
  ) {
    throw new Error('Earn history availability/source mismatch');
  }
  if (
    production.available &&
    !(
      snapshot.sources.production_wc.ok === true &&
      snapshot.sources.production_wc.status === 200
    )
  ) {
    throw new Error('Earn production WC/source mismatch');
  }
  if (
    legacy.available &&
    !(
      snapshot.sources.redeemable.ok === true &&
      snapshot.sources.redeemable.status === 200
    )
  ) {
    throw new Error('Earn legacy WC/source mismatch');
  }
  if (
    snapshot.datanet.source_available &&
    !(
      snapshot.sources.datanet_wc.ok === true &&
      snapshot.sources.datanet_wc.status === 200
    )
  ) {
    throw new Error('Earn DataNet/source mismatch');
  }

  requireAllFalseV1(
    snapshot.sanitization,
    EARN_SANITIZATION_KEYS,
    'earn sanitization',
  );
  requireAllFalseV1(
    snapshot.boundaries,
    EARN_BOUNDARY_KEYS,
    'earn boundaries',
  );
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
  if (!plainRecord(snapshot)) {
    throw new Error('Earn snapshot must be an object');
  }
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

  exactKeys(snapshot.account, EARN_ACCOUNT_KEYS, 'earn snapshot.account');
  if (
    snapshot.account.selected !== true ||
    snapshot.account.id !== expectedAccount ||
    snapshot.account.label !== expectedAccount ||
    !ACCOUNT_PATTERN.test(snapshot.account.id)
  ) {
    throw new Error('Earn response account does not match request');
  }

  validateEarnSnapshotSchemaV1(snapshot);
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

export const renderEarnHistoryV1 = (
  selector,
  emptySelector,
  history,
  kind,
) => {
  const list = document.querySelector(selector);
  const empty = document.querySelector(emptySelector);

  if (!list) return;

  list.replaceChildren();

  const available = history?.available === true;
  const rows =
    available && Array.isArray(history?.items)
      ? history.items
      : [];

  if (empty) {
    empty.hidden = rows.length > 0;
    empty.textContent =
      kind === 'receipt'
        ? available
          ? 'No verification receipts loaded.'
          : 'Verification receipt history unavailable.'
        : available
          ? 'No recent jobs loaded.'
          : 'Recent job history unavailable.';
  }

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

export const clearEarnHistoryEvidenceV1 = () => {
  setText('[data-earn-jobs-count]', '0');
  setText('[data-earn-receipts-count]', '0');

  renderEarnHistoryV1(
    '[data-earn-jobs-list]',
    '[data-earn-jobs-empty]',
    { available: false, items: [] },
    'job',
  );
  renderEarnHistoryV1(
    '[data-earn-receipts-list]',
    '[data-earn-receipts-empty]',
    { available: false, items: [] },
    'receipt',
  );
};

const renderError = (message) => {
  clearEarnHistoryEvidenceV1();

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
  const jobsCount =
    jobs.available === true
      ? nonNegativeSafeInteger(jobs.count)
      : 0;
  const receiptsCount =
    receipts.available === true
      ? nonNegativeSafeInteger(receipts.count)
      : 0;

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

  renderEarnHistoryV1(
    '[data-earn-jobs-list]',
    '[data-earn-jobs-empty]',
    jobs,
    'job'
  );

  renderEarnHistoryV1(
    '[data-earn-receipts-list]',
    '[data-earn-receipts-empty]',
    receipts,
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

export const loadAccount = async (account, button) => {
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
