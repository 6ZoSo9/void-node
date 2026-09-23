import {
  createNetworkRequestOwnerV1,
  readBoundedNetworkJsonV1,
} from './network-live.js';

export const VALIDATOR_READINESS_ENDPOINT =
  '/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json';
export const VALIDATOR_READINESS_MARKER =
  'VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1';
export const VALIDATOR_READINESS_TIMEOUT_MS = 5000;

const SOURCE_FINAL_SEAL_ROUTE =
  '/public-node/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-root-link-final-seal-hold-v1.json';
const SOURCE_FINAL_SEAL_MARKER =
  'VOID_MAINNET0_VALIDATOR_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROOT_LINK_FINAL_SEAL_HOLD_V1';

const MATRIX_IDS = Object.freeze([
  'public_node_identity',
  'operator_contact_review_path',
  'reachability_evidence',
  'hardware_network_baseline',
  'key_control_attestation',
  'minimum_candidate_stake_policy_awareness',
  'safety_boundary_acceptance',
  'reviewer_evidence_pack_readiness',
]);

const MATRIX_STATUS_BY_ID = Object.freeze({
  public_node_identity: 'definition_only_not_collecting_submissions',
  operator_contact_review_path: 'definition_only_not_collecting_submissions',
  reachability_evidence: 'definition_only_not_collecting_submissions',
  hardware_network_baseline: 'definition_only_not_collecting_submissions',
  key_control_attestation: 'definition_only_not_collecting_submissions',
  minimum_candidate_stake_policy_awareness:
    'definition_only_not_locking_stake',
  safety_boundary_acceptance:
    'definition_only_not_accepting_intake',
  reviewer_evidence_pack_readiness:
    'definition_only_not_collecting_submissions',
});

const READINESS_FALSE_KEYS = Object.freeze([
  'candidate_registration_open',
  'candidate_intake_open',
  'public_submit_enabled',
  'wallet_connect_enabled',
  'stake_lock_enabled',
  'active_validator_admission_enabled',
  'validator_set_write_enabled',
]);

const BOUNDARY_FALSE_KEYS = Object.freeze([
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

const plainRecord = (value) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const exactKeys = (value, expected, label) => {
  if (!plainRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length
    || actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label} shape mismatch`);
  }
};

const boundedText = (value, label, max = 2048) => {
  if (
    typeof value !== 'string'
    || value.length < 1
    || value.length > max
  ) {
    throw new Error(`${label} must be bounded text`);
  }
  return value;
};

const requireFalse = (value, keys, label) => {
  for (const key of keys) {
    if (value[key] !== false) {
      throw new Error(`${label} elevated: ${key}`);
    }
  }
};

export function validateValidatorReadinessSnapshotV1(snapshot) {
  exactKeys(
    snapshot,
    [
      'kind',
      'marker',
      'version',
      'status',
      'route',
      'source_previous_lane_root_final_seal_route',
      'source_previous_lane_root_final_seal_marker',
      'candidate_readiness',
      'readiness_assertions',
      'boundary',
    ],
    'validator readiness snapshot',
  );

  if (
    snapshot.kind !== 'mainnet0_validator_candidate_readiness_matrix'
    || snapshot.marker !== VALIDATOR_READINESS_MARKER
    || snapshot.version !== 1
    || snapshot.status
      !== 'sealed_public_safe_read_only_candidate_readiness_matrix'
    || snapshot.route !== VALIDATOR_READINESS_ENDPOINT
    || snapshot.source_previous_lane_root_final_seal_route
      !== SOURCE_FINAL_SEAL_ROUTE
    || snapshot.source_previous_lane_root_final_seal_marker
      !== SOURCE_FINAL_SEAL_MARKER
  ) {
    throw new Error('validator readiness identity mismatch');
  }

  const readiness = snapshot.candidate_readiness;
  exactKeys(
    readiness,
    [
      'purpose',
      ...READINESS_FALSE_KEYS,
      'minimum_public_candidate_stake_policy_void',
      'matrix_item_count',
      'matrix_items',
    ],
    'validator readiness candidate_readiness',
  );

  boundedText(readiness.purpose, 'validator readiness purpose');
  requireFalse(readiness, READINESS_FALSE_KEYS, 'validator readiness gate');

  if (
    readiness.minimum_public_candidate_stake_policy_void !== 10000
    || readiness.matrix_item_count !== MATRIX_IDS.length
    || !Array.isArray(readiness.matrix_items)
    || readiness.matrix_items.length !== MATRIX_IDS.length
  ) {
    throw new Error('validator readiness policy/count mismatch');
  }

  readiness.matrix_items.forEach((item, index) => {
    const expectedId = MATRIX_IDS[index];
    const expectedKeys = [
      'id',
      'requirement',
      'public_evidence_expected',
      ...(expectedId === 'minimum_candidate_stake_policy_awareness'
        ? ['policy_reference_min_public_candidate_stake_void']
        : []),
      'status',
    ];
    exactKeys(
      item,
      expectedKeys,
      `validator readiness item ${index}`,
    );

    if (
      item.id !== expectedId
      || item.status !== MATRIX_STATUS_BY_ID[expectedId]
    ) {
      throw new Error(`validator readiness item ${index} identity mismatch`);
    }
    boundedText(
      item.requirement,
      `validator readiness item ${index} requirement`,
      1024,
    );
    boundedText(
      item.public_evidence_expected,
      `validator readiness item ${index} evidence`,
      1024,
    );

    if (
      expectedId === 'minimum_candidate_stake_policy_awareness'
      && item.policy_reference_min_public_candidate_stake_void !== 10000
    ) {
      throw new Error('validator readiness stake policy item mismatch');
    }
  });

  const assertions = snapshot.readiness_assertions;
  exactKeys(
    assertions,
    [
      'matrix_present',
      'source_previous_lane_final_seal_present',
      ...READINESS_FALSE_KEYS,
      'public_safe_read_only',
    ],
    'validator readiness assertions',
  );
  if (
    assertions.matrix_present !== true
    || assertions.source_previous_lane_final_seal_present !== true
    || assertions.public_safe_read_only !== true
  ) {
    throw new Error('validator readiness positive assertions mismatch');
  }
  requireFalse(assertions, READINESS_FALSE_KEYS, 'validator readiness assertion');

  const boundary = snapshot.boundary;
  exactKeys(
    boundary,
    [
      'public_safe',
      'read_only',
      'candidate_readiness_matrix_only',
      'definition_only',
      ...BOUNDARY_FALSE_KEYS,
    ],
    'validator readiness boundary',
  );
  for (const key of [
    'public_safe',
    'read_only',
    'candidate_readiness_matrix_only',
    'definition_only',
  ]) {
    if (boundary[key] !== true) {
      throw new Error(`validator readiness boundary missing: ${key}`);
    }
  }
  requireFalse(boundary, BOUNDARY_FALSE_KEYS, 'validator readiness boundary');

  return snapshot;
}

export async function requestValidatorReadinessSnapshotV1(
  owner,
  {
    origin = globalThis.location?.origin ?? 'http://localhost',
    signal = AbortSignal.timeout(VALIDATOR_READINESS_TIMEOUT_MS),
  } = {},
) {
  if (!owner || typeof owner.run !== 'function') {
    throw new Error('validator readiness request owner is invalid');
  }

  const expectedUrl = new URL(
    VALIDATOR_READINESS_ENDPOINT,
    origin,
  ).href;

  return owner.run(
    VALIDATOR_READINESS_ENDPOINT,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      mode: 'same-origin',
      referrerPolicy: 'no-referrer',
      signal,
    },
    async (response, ownedSignal, lifetime) => {
      if (response.url !== expectedUrl) {
        throw new Error('validator readiness final URL mismatch');
      }
      if (!response.ok) {
        throw new Error(
          `validator readiness returned HTTP ${response.status}`,
        );
      }
      const contentType = String(
        response.headers?.get?.('content-type') || '',
      ).toLowerCase();
      if (!contentType.includes('application/json')) {
        throw new Error('validator readiness content type mismatch');
      }
      return validateValidatorReadinessSnapshotV1(
        await readBoundedNetworkJsonV1(
          response,
          ownedSignal,
          lifetime,
        ),
      );
    },
  );
}

const requestOwner = createNetworkRequestOwnerV1();
let requestSerial = 0;
let viewPresent = false;

const currentRoute = () => (
  typeof window === 'undefined'
    ? ''
    : String(window.location.hash || '')
      .replace(/^#\/?/, '')
      .split(/[/?]/, 1)[0] || 'home'
);

const setText = (selector, value, fallback = '—') => {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = (
      value === null
      || value === undefined
      || value === ''
    ) ? fallback : String(value);
  });
};

const setChip = (tone, label) => {
  const node = document.querySelector('[data-validate-state-chip]');
  if (!node) return;
  node.className = `status-chip status-chip--${tone}`;
  node.textContent = label;
};

const resetView = () => {
  setChip('info', 'Checking readiness');
  setText(
    '[data-validate-message]',
    'Reading the sealed public-safe validator readiness contract.',
  );
  setText('[data-validate-stake-policy]', '—');
  setText('[data-validate-item-count]', '—');
  setText('[data-validate-registration]', 'Not checked');
  setText('[data-validate-intake]', 'Not checked');
  setText('[data-validate-submit]', 'Not checked');
  setText('[data-validate-wallet]', 'Not checked');
  setText('[data-validate-stake-lock]', 'Not checked');
  setText('[data-validate-admission]', 'Not checked');
  setText('[data-validate-set-write]', 'Not checked');
  document
    .querySelector('[data-validate-items]')
    ?.replaceChildren();
};

const renderUnavailable = (message) => {
  setChip('warning', 'Readiness HOLD');
  setText(
    '[data-validate-message]',
    `Readiness is unavailable. No admission state is inferred. ${
      message || 'The sealed public contract could not be validated.'
    }`,
  );
  setText('[data-validate-registration]', 'HOLD');
  setText('[data-validate-intake]', 'HOLD');
  setText('[data-validate-submit]', 'HOLD');
  setText('[data-validate-wallet]', 'HOLD');
  setText('[data-validate-stake-lock]', 'HOLD');
  setText('[data-validate-admission]', 'HOLD');
  setText('[data-validate-set-write]', 'HOLD');
  document
    .querySelector('[data-validate-items]')
    ?.replaceChildren();
};

const renderSnapshot = (snapshot) => {
  const checked = validateValidatorReadinessSnapshotV1(snapshot);
  const readiness = checked.candidate_readiness;

  setChip('warning', 'Candidate intake HOLD');
  setText('[data-validate-message]', readiness.purpose);
  setText(
    '[data-validate-stake-policy]',
    `${readiness.minimum_public_candidate_stake_policy_void.toLocaleString(
      'en-US',
    )} VOID`,
  );
  setText(
    '[data-validate-item-count]',
    String(readiness.matrix_item_count),
  );
  setText('[data-validate-registration]', 'Closed');
  setText('[data-validate-intake]', 'Closed');
  setText('[data-validate-submit]', 'Disabled');
  setText('[data-validate-wallet]', 'Disabled');
  setText('[data-validate-stake-lock]', 'Disabled');
  setText('[data-validate-admission]', 'Disabled');
  setText('[data-validate-set-write]', 'Disabled');

  const list = document.querySelector('[data-validate-items]');
  if (!list) return;
  list.replaceChildren();

  readiness.matrix_items.forEach((item, index) => {
    const row = document.createElement('article');
    row.className = 'activity-row';

    const copy = document.createElement('div');
    copy.className = 'activity-copy';

    const title = document.createElement('strong');
    title.textContent = `${index + 1}. ${item.id.replaceAll('_', ' ')}`;

    const requirement = document.createElement('small');
    requirement.textContent = item.requirement;

    copy.append(title, requirement);

    const state = document.createElement('div');
    state.className = 'activity-value';
    state.textContent = 'Definition only';

    row.append(copy, state);
    list.append(row);
  });
};

const invalidateRequest = (reason) => {
  requestSerial += 1;
  requestOwner.cancel(reason);
};

const loadReadiness = async () => {
  if (currentRoute() !== 'validate') return;
  if (!document.querySelector('[data-validate-view]')) return;

  const serial = ++requestSerial;
  requestOwner.cancel('validator readiness request replaced');
  resetView();

  try {
    const snapshot = await requestValidatorReadinessSnapshotV1(
      requestOwner,
      { origin: window.location.origin },
    );
    if (
      serial !== requestSerial
      || currentRoute() !== 'validate'
      || !document.querySelector('[data-validate-view]')
    ) {
      return;
    }
    renderSnapshot(snapshot);
  } catch (error) {
    if (
      serial !== requestSerial
      || currentRoute() !== 'validate'
    ) {
      return;
    }
    renderUnavailable(
      error instanceof Error ? error.message : String(error),
    );
  }
};

const bindView = () => {
  if (currentRoute() !== 'validate') {
    if (viewPresent || requestOwner.isActive()) {
      invalidateRequest('validator readiness route left');
    }
    viewPresent = false;
    return;
  }

  const view = document.querySelector('[data-validate-view]');
  if (!view) {
    if (viewPresent || requestOwner.isActive()) {
      invalidateRequest('validator readiness view removed');
    }
    viewPresent = false;
    return;
  }

  viewPresent = true;
  if (view.dataset.validateBound === 'true') return;
  view.dataset.validateBound = 'true';
  queueMicrotask(loadReadiness);
};

if (
  typeof document !== 'undefined'
  && typeof MutationObserver !== 'undefined'
) {
  const observer = new MutationObserver(() => bindView());
  const start = () => {
    bindView();
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
