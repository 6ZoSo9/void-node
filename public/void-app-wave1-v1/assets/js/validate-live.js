export const VALIDATE_ENDPOINT = '/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json';
export const VALIDATE_MARKER = 'VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1';
export const MAX_VALIDATE_RESPONSE_BYTES = 128 * 1024;

const TOP_KEYS = Object.freeze([
  'boundary',
  'candidate_readiness',
  'kind',
  'marker',
  'readiness_assertions',
  'route',
  'source_previous_lane_root_final_seal_marker',
  'source_previous_lane_root_final_seal_route',
  'status',
  'version',
]);

const READINESS_KEYS = Object.freeze([
  'active_validator_admission_enabled',
  'candidate_intake_open',
  'candidate_registration_open',
  'matrix_item_count',
  'matrix_items',
  'minimum_public_candidate_stake_policy_void',
  'public_submit_enabled',
  'purpose',
  'stake_lock_enabled',
  'validator_set_write_enabled',
  'wallet_connect_enabled',
]);

const ASSERTION_KEYS = Object.freeze([
  'active_validator_admission_enabled',
  'candidate_intake_open',
  'candidate_registration_open',
  'matrix_present',
  'public_safe_read_only',
  'public_submit_enabled',
  'source_previous_lane_final_seal_present',
  'stake_lock_enabled',
  'validator_set_write_enabled',
  'wallet_connect_enabled',
]);

const BOUNDARY_KEYS = Object.freeze([
  'active_validator_admission',
  'candidate_intake',
  'candidate_readiness_matrix_only',
  'candidate_registration_open',
  'definition_only',
  'epoch_activation',
  'mutation_handler',
  'public_safe',
  'public_validator_submit',
  'read_only',
  'runtime_mutation_route',
  'stake_lock',
  'validator_runtime_truth_write',
  'validator_set_write',
  'wallet_connect',
]);

const MATRIX_CONTRACT = Object.freeze([
  ['public_node_identity', 'definition_only_not_collecting_submissions'],
  ['operator_contact_review_path', 'definition_only_not_collecting_submissions'],
  ['reachability_evidence', 'definition_only_not_collecting_submissions'],
  ['hardware_network_baseline', 'definition_only_not_collecting_submissions'],
  ['key_control_attestation', 'definition_only_not_collecting_submissions'],
  ['minimum_candidate_stake_policy_awareness', 'definition_only_not_locking_stake'],
  ['safety_boundary_acceptance', 'definition_only_not_accepting_intake'],
  ['reviewer_evidence_pack_readiness', 'definition_only_not_collecting_submissions'],
]);

const PLAIN_ITEM_KEYS = Object.freeze(['id', 'public_evidence_expected', 'requirement', 'status']);
const STAKE_ITEM_KEYS = Object.freeze([
  'id',
  'policy_reference_min_public_candidate_stake_void',
  'public_evidence_expected',
  'requirement',
  'status',
]);

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, expected) => {
  if (!isPlainObject(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
};
const boundedText = (value, max = 2048) => typeof value === 'string' && value.length > 0 && value.length <= max;

const assertFalseFlags = (value, keys) => {
  for (const key of keys) {
    if (value[key] !== false) throw new Error(`validator boundary flag must be false: ${key}`);
  }
};

export function validateValidatorReadinessSnapshotV1(snapshot) {
  if (!exactKeys(snapshot, TOP_KEYS)) throw new Error('validator readiness top-level shape mismatch');
  if (snapshot.kind !== 'mainnet0_validator_candidate_readiness_matrix') throw new Error('validator readiness kind mismatch');
  if (snapshot.marker !== VALIDATE_MARKER) throw new Error('validator readiness marker mismatch');
  if (snapshot.version !== 1) throw new Error('validator readiness version mismatch');
  if (snapshot.status !== 'sealed_public_safe_read_only_candidate_readiness_matrix') throw new Error('validator readiness status mismatch');
  if (snapshot.route !== VALIDATE_ENDPOINT) throw new Error('validator readiness route mismatch');
  if (!boundedText(snapshot.source_previous_lane_root_final_seal_route, 512)) throw new Error('validator readiness source route invalid');
  if (!boundedText(snapshot.source_previous_lane_root_final_seal_marker, 256)) throw new Error('validator readiness source marker invalid');

  const readiness = snapshot.candidate_readiness;
  if (!exactKeys(readiness, READINESS_KEYS)) throw new Error('candidate readiness shape mismatch');
  if (!boundedText(readiness.purpose, 1024)) throw new Error('candidate readiness purpose invalid');
  assertFalseFlags(readiness, [
    'candidate_registration_open',
    'candidate_intake_open',
    'public_submit_enabled',
    'wallet_connect_enabled',
    'stake_lock_enabled',
    'active_validator_admission_enabled',
    'validator_set_write_enabled',
  ]);
  if (readiness.minimum_public_candidate_stake_policy_void !== 10000) throw new Error('candidate stake policy mismatch');
  if (readiness.matrix_item_count !== MATRIX_CONTRACT.length) throw new Error('candidate readiness count mismatch');
  if (!Array.isArray(readiness.matrix_items) || readiness.matrix_items.length !== MATRIX_CONTRACT.length) {
    throw new Error('candidate readiness items mismatch');
  }

  readiness.matrix_items.forEach((item, index) => {
    const [expectedId, expectedStatus] = MATRIX_CONTRACT[index];
    const expectedKeys = expectedId === 'minimum_candidate_stake_policy_awareness' ? STAKE_ITEM_KEYS : PLAIN_ITEM_KEYS;
    if (!exactKeys(item, expectedKeys)) throw new Error(`candidate readiness item shape mismatch: ${expectedId}`);
    if (item.id !== expectedId || item.status !== expectedStatus) throw new Error(`candidate readiness item identity mismatch: ${expectedId}`);
    if (!boundedText(item.requirement, 1024) || !boundedText(item.public_evidence_expected, 1024)) {
      throw new Error(`candidate readiness item text invalid: ${expectedId}`);
    }
    if (expectedId === 'minimum_candidate_stake_policy_awareness' && item.policy_reference_min_public_candidate_stake_void !== 10000) {
      throw new Error('candidate readiness stake reference mismatch');
    }
  });

  const assertions = snapshot.readiness_assertions;
  if (!exactKeys(assertions, ASSERTION_KEYS)) throw new Error('validator readiness assertions shape mismatch');
  if (assertions.matrix_present !== true || assertions.source_previous_lane_final_seal_present !== true || assertions.public_safe_read_only !== true) {
    throw new Error('validator readiness positive assertions mismatch');
  }
  assertFalseFlags(assertions, [
    'candidate_registration_open',
    'candidate_intake_open',
    'public_submit_enabled',
    'wallet_connect_enabled',
    'stake_lock_enabled',
    'active_validator_admission_enabled',
    'validator_set_write_enabled',
  ]);

  const boundary = snapshot.boundary;
  if (!exactKeys(boundary, BOUNDARY_KEYS)) throw new Error('validator boundary shape mismatch');
  for (const key of ['public_safe', 'read_only', 'candidate_readiness_matrix_only', 'definition_only']) {
    if (boundary[key] !== true) throw new Error(`validator boundary positive flag mismatch: ${key}`);
  }
  assertFalseFlags(boundary, [
    'public_validator_submit',
    'candidate_registration_open',
    'candidate_intake',
    'stake_lock',
    'wallet_connect',
    'active_validator_admission',
    'epoch_activation',
    'validator_set_write',
    'validator_runtime_truth_write',
    'runtime_mutation_route',
    'mutation_handler',
  ]);

  return snapshot;
}

export async function readBoundedValidatorJsonV1(response) {
  if (!response?.body || typeof response.body.getReader !== 'function') {
    throw new Error('validator readiness response body is not stream-readable');
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error('validator readiness response chunk invalid');
      total += value.byteLength;
      if (total > MAX_VALIDATE_RESPONSE_BYTES) {
        await reader.cancel('validator readiness response exceeds byte limit');
        throw new Error('validator readiness response exceeds byte limit');
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return JSON.parse(text);
}

const currentRoute = () => location.hash.replace(/^#\/?/, '').split(/[?\/]/)[0] || 'home';
const fmt = (value) => Number(value).toLocaleString('en-US');

const validateShell = () => `
  <div data-validate-view>
    <header class="page-header">
      <div class="page-header__copy">
        <span class="eyebrow">Mainnet-0 validator readiness</span>
        <h1>Validate</h1>
        <p>Inspect the published candidate requirements and admission boundary without connecting a wallet, locking stake, or submitting a validator action.</p>
      </div>
      <div class="page-actions">
        <button class="button button--secondary" type="button" data-validate-refresh>Refresh policy</button>
      </div>
    </header>

    <div class="dashboard-grid">
      <section class="surface hero-surface span-12" aria-labelledby="validate-state-title">
        <div class="hero-content">
          <span class="status-chip status-chip--info" data-validate-state-chip>Checking policy</span>
          <h2 id="validate-state-title" data-validate-state-title>Reading public validator readiness</h2>
          <p data-validate-summary>No admission claim is made until the exact public-safe matrix validates.</p>
        </div>
        <aside class="hero-aside" aria-label="Validator policy summary">
          <div class="signal-line"><span>Network</span><strong>MAINNET-0</strong></div>
          <div class="signal-line"><span>Minimum policy</span><strong data-validate-min-stake>—</strong></div>
          <div class="signal-line"><span>Mode</span><strong>READ-ONLY</strong></div>
        </aside>
      </section>

      <section class="surface panel span-7" aria-labelledby="validate-checklist-title">
        <div class="panel-header">
          <div class="panel-header__copy">
            <span class="eyebrow">Published requirements</span>
            <h2 id="validate-checklist-title">Candidate readiness checklist</h2>
            <p>Definition-only requirements from the sealed public matrix.</p>
          </div>
        </div>
        <div class="activity-list" data-validate-checklist>
          <div class="activity-row"><div class="activity-copy"><strong>Loading requirements</strong><small>Waiting for validated public evidence</small></div><div class="activity-value">…</div></div>
        </div>
      </section>

      <section class="surface panel span-5" aria-labelledby="validate-admission-title">
        <div class="panel-header">
          <div class="panel-header__copy">
            <span class="eyebrow">Admission boundary</span>
            <h2 id="validate-admission-title">Current availability</h2>
            <p>Disabled capabilities stay explicit instead of appearing as inactive controls.</p>
          </div>
        </div>
        <div class="activity-list">
          <div class="activity-row"><div class="activity-copy"><strong>Candidate registration</strong><small>Public registration gate</small></div><div class="activity-value" data-validate-registration>Checking</div></div>
          <div class="activity-row"><div class="activity-copy"><strong>Candidate intake</strong><small>Submission intake gate</small></div><div class="activity-value" data-validate-intake>Checking</div></div>
          <div class="activity-row"><div class="activity-copy"><strong>Stake lock</strong><small>No stake transaction path is exposed here</small></div><div class="activity-value" data-validate-stake-lock>Checking</div></div>
          <div class="activity-row"><div class="activity-copy"><strong>Active admission</strong><small>Validator-set admission gate</small></div><div class="activity-value" data-validate-admission>Checking</div></div>
        </div>
      </section>

      <section class="surface panel span-12" aria-labelledby="validate-boundary-title">
        <div class="panel-header">
          <div class="panel-header__copy">
            <span class="eyebrow">Protected boundary</span>
            <h2 id="validate-boundary-title">No validator authority</h2>
            <p>This view reads one bounded same-origin public JSON document. It cannot connect a wallet, submit a candidate, lock VOID, activate a validator, write the validator set, sign, broadcast, or move funds.</p>
          </div>
        </div>
        <div class="health-row health-row--single">
          <article class="health-card"><div class="health-card__top"><strong>Wallet connection</strong><span class="status-chip">Disabled</span></div><dl><div><dt>Provider request</dt><dd>None</dd></div><div><dt>Signing</dt><dd>None</dd></div></dl></article>
          <article class="health-card"><div class="health-card__top"><strong>Validator mutation</strong><span class="status-chip">Disabled</span></div><dl><div><dt>Public submit</dt><dd>Off</dd></div><div><dt>Set write</dt><dd>Off</dd></div></dl></article>
        </div>
      </section>
    </div>
  </div>`;

const setText = (selector, value) => {
  document.querySelectorAll(selector).forEach((element) => { element.textContent = String(value); });
};
const setChip = (variant, text) => {
  const chip = document.querySelector('[data-validate-state-chip]');
  if (!chip) return;
  chip.className = `status-chip status-chip--${variant}`;
  chip.textContent = text;
};

let requestSerial = 0;
let mounted = false;

const renderChecklist = (items) => {
  const list = document.querySelector('[data-validate-checklist]');
  if (!list) return;
  list.replaceChildren();
  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'activity-row';
    const copy = document.createElement('div');
    copy.className = 'activity-copy';
    const strong = document.createElement('strong');
    strong.textContent = item.requirement;
    const small = document.createElement('small');
    small.textContent = item.public_evidence_expected;
    copy.append(strong, small);
    const value = document.createElement('div');
    value.className = 'activity-value';
    value.textContent = `${String(index + 1).padStart(2, '0')} / DEFINED`;
    row.append(copy, value);
    list.append(row);
  });
};

const setLoading = () => {
  setChip('info', 'Checking policy');
  setText('[data-validate-state-title]', 'Reading public validator readiness');
  setText('[data-validate-summary]', 'No admission claim is made until the exact public-safe matrix validates.');
};

const setError = (error) => {
  setChip('warning', 'Policy unavailable');
  setText('[data-validate-state-title]', 'Validator readiness is on hold');
  setText('[data-validate-summary]', 'The public matrix could not be validated. No cached or inferred admission state is shown.');
  setText('[data-validate-min-stake]', '—');
  for (const selector of ['[data-validate-registration]', '[data-validate-intake]', '[data-validate-stake-lock]', '[data-validate-admission]']) setText(selector, 'HOLD');
  const list = document.querySelector('[data-validate-checklist]');
  if (list) {
    list.replaceChildren();
    const row = document.createElement('div');
    row.className = 'activity-row';
    const copy = document.createElement('div');
    copy.className = 'activity-copy';
    const strong = document.createElement('strong');
    strong.textContent = 'Readiness evidence unavailable';
    const small = document.createElement('small');
    small.textContent = error instanceof Error ? error.message : 'Validation failed';
    copy.append(strong, small);
    const value = document.createElement('div');
    value.className = 'activity-value';
    value.textContent = 'HOLD';
    row.append(copy, value);
    list.append(row);
  }
};

const applySnapshot = (snapshot) => {
  const readiness = snapshot.candidate_readiness;
  setChip('warning', 'Intake closed');
  setText('[data-validate-state-title]', 'Validator candidate intake is not open');
  setText('[data-validate-summary]', 'The network publishes the candidate requirements now, but registration, intake, stake locking, active admission, and validator-set writes remain disabled.');
  setText('[data-validate-min-stake]', `${fmt(readiness.minimum_public_candidate_stake_policy_void)} VOID`);
  setText('[data-validate-registration]', 'CLOSED');
  setText('[data-validate-intake]', 'CLOSED');
  setText('[data-validate-stake-lock]', 'DISABLED');
  setText('[data-validate-admission]', 'DISABLED');
  renderChecklist(readiness.matrix_items);
};

export async function loadValidateViewV1() {
  if (typeof document === 'undefined' || currentRoute() !== 'validate') return;
  if (!document.querySelector('[data-validate-view]')) return;
  const serial = ++requestSerial;
  setLoading();
  try {
    const response = await fetch(VALIDATE_ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      mode: 'same-origin',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`validator readiness returned HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) throw new Error('validator readiness content type mismatch');
    const snapshot = validateValidatorReadinessSnapshotV1(await readBoundedValidatorJsonV1(response));
    if (serial !== requestSerial || currentRoute() !== 'validate') return;
    applySnapshot(snapshot);
  } catch (error) {
    if (serial !== requestSerial || currentRoute() !== 'validate') return;
    setError(error);
  }
}

const mountValidate = () => {
  if (currentRoute() !== 'validate') {
    mounted = false;
    return;
  }
  const root = document.getElementById('view-root');
  if (!root) return;
  if (mounted && root.querySelector('[data-validate-view]')) return;
  root.innerHTML = validateShell();
  mounted = true;
  root.querySelector('[data-validate-refresh]')?.addEventListener('click', loadValidateViewV1);
  queueMicrotask(loadValidateViewV1);
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const root = document.getElementById('view-root');
  if (root) {
    const observer = new MutationObserver(() => mountValidate());
    observer.observe(root, { childList: true });
  }
  window.addEventListener('hashchange', () => setTimeout(mountValidate, 0));
  setTimeout(mountValidate, 0);
}
