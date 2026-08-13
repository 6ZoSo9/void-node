const DATANET_ENDPOINT = '/public-node/datanet/field-replication-status-card-v1.json';
const DATANET_MARKER = 'VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1';
const DATANET_GREEN_MARKER = 'VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1_GREEN';
const MAX_RESPONSE_BYTES = 128 * 1024;
const REQUEST_TIMEOUT_MS = 5000;

let requestSerial = 0;

const TOP_LEVEL_KEYS = [
  'claim',
  'created_at',
  'field_result',
  'green_marker',
  'kind',
  'marker',
  'proof_bundle_public_summary_v1',
  'proof_markers',
  'routes',
  'safe_serve_runbook_discovery_v1',
  'safe_serve_update_v1',
  'safety_boundary',
  'sealed_commits',
  'status',
];

const FIELD_RESULT_KEYS = [
  'field_mirror_green',
  'field_node',
  'home_roundtrip_verify_green',
  'network_path',
  'roundtrip_match',
  'source_node',
  'source_to_field_pull_green',
  'tailnet_addresses_publicly_redacted',
  'verified_bytes',
  'verified_sha256',
];

const ROUTE_KEYS = ['doc', 'html', 'json'];

const SAFETY_KEYS = [
  'dangerous_paths_touched',
  'no_ledger_write',
  'no_public_mutation_route',
  'no_validator_admission',
  'no_wallet_movement',
  'no_wc_settlement',
  'public_status_only',
  'read_only',
  'tailnet_ips_redacted',
];

const isPlainObject = (value) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const hasExactKeys = (value, keys) => {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
};

const isSafePublicPath = (value, suffix) => (
  typeof value === 'string'
  && value === `/public-node/datanet/${suffix}`
  && !value.includes('..')
  && !value.includes('\\')
);

const isSha256Hex = (value) => (
  typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
);

const requireFalseAuthorityMap = (value) => {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => value[key] === false);
};

export function validateDataNetStatusV1(value) {
  if (!hasExactKeys(value, TOP_LEVEL_KEYS)) {
    throw new Error('DataNet status has an unexpected top-level shape');
  }

  if (
    value.marker !== DATANET_MARKER
    || value.green_marker !== DATANET_GREEN_MARKER
    || value.kind !== 'datanet_field_replication_status_card'
    || value.status !== 'green'
  ) {
    throw new Error('DataNet status identity is not exact green');
  }

  if (
    typeof value.claim !== 'string'
    || value.claim.length < 1
    || value.claim.length > 4096
    || typeof value.created_at !== 'string'
    || !Number.isFinite(Date.parse(value.created_at))
  ) {
    throw new Error('DataNet status metadata is invalid');
  }

  const field = value.field_result;
  if (!hasExactKeys(field, FIELD_RESULT_KEYS)) {
    throw new Error('DataNet field result has an unexpected shape');
  }
  if (
    field.field_mirror_green !== true
    || field.home_roundtrip_verify_green !== true
    || field.roundtrip_match !== true
    || field.source_to_field_pull_green !== true
    || field.tailnet_addresses_publicly_redacted !== true
    || typeof field.field_node !== 'string'
    || field.field_node.length < 1
    || field.field_node.length > 128
    || typeof field.source_node !== 'string'
    || field.source_node.length < 1
    || field.source_node.length > 128
    || typeof field.network_path !== 'string'
    || field.network_path.length < 1
    || field.network_path.length > 128
    || !Number.isSafeInteger(field.verified_bytes)
    || field.verified_bytes < 0
    || field.verified_bytes > MAX_RESPONSE_BYTES
    || !isSha256Hex(field.verified_sha256)
  ) {
    throw new Error('DataNet field result is not exact green');
  }

  if (
    !Array.isArray(value.proof_markers)
    || value.proof_markers.length < 1
    || value.proof_markers.length > 32
    || value.proof_markers.some(
      (marker) => typeof marker !== 'string'
        || marker.length < 1
        || marker.length > 160
        || !/^VOID_[A-Z0-9_]+_GREEN$/.test(marker)
    )
  ) {
    throw new Error('DataNet proof markers are invalid');
  }

  if (!hasExactKeys(value.routes, ROUTE_KEYS)) {
    throw new Error('DataNet status routes have an unexpected shape');
  }
  if (
    value.routes.doc !== 'docs/public/datanet-field-replication-status-card-v1.md'
    || !isSafePublicPath(value.routes.html, 'field-replication-status-card-v1.html')
    || !isSafePublicPath(value.routes.json, 'field-replication-status-card-v1.json')
  ) {
    throw new Error('DataNet status routes are not exact public paths');
  }

  const safety = value.safety_boundary;
  if (!hasExactKeys(safety, SAFETY_KEYS)) {
    throw new Error('DataNet safety boundary has an unexpected shape');
  }
  if (
    safety.dangerous_paths_touched !== false
    || safety.no_ledger_write !== true
    || safety.no_public_mutation_route !== true
    || safety.no_validator_admission !== true
    || safety.no_wallet_movement !== true
    || safety.no_wc_settlement !== true
    || safety.public_status_only !== true
    || safety.read_only !== true
    || safety.tailnet_ips_redacted !== true
  ) {
    throw new Error('DataNet safety boundary is not read-only');
  }

  const proofSummary = value.proof_bundle_public_summary_v1;
  if (
    !isPlainObject(proofSummary)
    || proofSummary.status !== 'green'
    || proofSummary.public_safe !== true
    || proofSummary.private_details_redacted !== true
    || !isSha256Hex(proofSummary.proof_sha256)
    || !isSha256Hex(proofSummary.source_bundle_sha256)
    || !requireFalseAuthorityMap(proofSummary.dangerous_authorities_enabled)
  ) {
    throw new Error('DataNet proof summary is not public-safe');
  }

  const runbook = value.safe_serve_runbook_discovery_v1;
  if (
    !isPlainObject(runbook)
    || runbook.status !== 'green'
    || runbook.private_tailnet_details_redacted !== true
    || !requireFalseAuthorityMap(runbook.dangerous_authorities_enabled)
  ) {
    throw new Error('DataNet safe-serve runbook boundary is invalid');
  }

  const serveUpdate = value.safe_serve_update_v1;
  if (
    !isPlainObject(serveUpdate)
    || serveUpdate.status !== 'green'
    || serveUpdate.dangerous_paths_touched !== false
    || serveUpdate.serves_public_directory_only !== true
    || serveUpdate.tailnet_addresses_redacted !== true
    || !requireFalseAuthorityMap(serveUpdate.enabled_authorities)
    || !isSha256Hex(serveUpdate.verified_mirror_sha256)
  ) {
    throw new Error('DataNet safe-serve evidence is invalid');
  }

  if (
    !isPlainObject(value.sealed_commits)
    || !isPlainObject(value.sealed_commits.field_object_roundtrip_verifier)
    || !isPlainObject(value.sealed_commits.tailnet_diagnostics)
  ) {
    throw new Error('DataNet sealed commit evidence is invalid');
  }

  return Object.freeze({
    marker: value.marker,
    green_marker: value.green_marker,
    status: value.status,
    claim: value.claim,
    created_at: value.created_at,
    field_result: Object.freeze({ ...field }),
    proof_markers: Object.freeze([...value.proof_markers]),
    routes: Object.freeze({ ...value.routes }),
    safety_boundary: Object.freeze({ ...safety }),
    proof_summary: Object.freeze({
      proof_sha256: proofSummary.proof_sha256,
      source_bundle_sha256: proofSummary.source_bundle_sha256,
      status: proofSummary.status,
      public_safe: proofSummary.public_safe,
      private_details_redacted: proofSummary.private_details_redacted,
    }),
  });
}

async function readBoundedResponseText(response) {
  const reader = response?.body?.getReader?.();
  if (!reader || typeof reader.read !== 'function') {
    throw new Error('DataNet response body is not stream-readable');
  }

  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        throw new Error('DataNet response stream yielded invalid bytes');
      }
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        try {
          await reader.cancel?.('DataNet response exceeds the size limit');
        } catch {
          // The size violation remains authoritative even if cancellation itself fails.
        }
        throw new Error('DataNet response exceeds the size limit');
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock?.();
    } catch {
      // Releasing the reader is cleanup only and must not replace validation truth.
    }
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('DataNet response is not valid UTF-8');
  }
}

export async function fetchDataNetStatusV1({
  fetchImpl = globalThis.fetch,
  origin = globalThis.location?.origin ?? 'http://localhost',
  signal,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('Fetch is unavailable');
  }

  const base = new URL(origin);
  const url = new URL(DATANET_ENDPOINT, base);
  if (url.origin !== base.origin || url.pathname !== DATANET_ENDPOINT || url.search || url.hash) {
    throw new Error('DataNet endpoint must remain same-origin');
  }

  const controller = signal ? null : new AbortController();
  const timeout = controller
    ? setTimeout(() => controller.abort(new Error('DataNet request timed out')), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const response = await fetchImpl(url.href, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      signal: signal ?? controller.signal,
    });

    if (!response || response.ok !== true) {
      throw new Error(`DataNet endpoint returned HTTP ${response?.status ?? 'unknown'}`);
    }
    if (response.redirected === true) {
      throw new Error('DataNet endpoint redirected');
    }

    if (typeof response.url === 'string' && response.url.length > 0) {
      const finalUrl = new URL(response.url, base);
      if (
        finalUrl.origin !== base.origin
        || finalUrl.pathname !== DATANET_ENDPOINT
        || finalUrl.search
        || finalUrl.hash
      ) {
        throw new Error('DataNet response escaped the exact same-origin endpoint');
      }
    }

    const contentLengthHeader = response.headers?.get?.('content-length');
    if (contentLengthHeader !== null && contentLengthHeader !== undefined) {
      const contentLength = Number(contentLengthHeader);
      if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
        throw new Error('DataNet response has an invalid content length');
      }
      if (contentLength > MAX_RESPONSE_BYTES) {
        throw new Error('DataNet response exceeds the size limit');
      }
    }

    const text = await readBoundedResponseText(response);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('DataNet response is not valid JSON');
    }
    return validateDataNetStatusV1(parsed);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

export function dataView() {
  return `
    <div data-datanet-view>
      <header class="page-header">
        <div class="page-header__copy">
          <span class="eyebrow">Read-only DataNet evidence</span>
          <h1>Data</h1>
          <p>Inspect one public-safe field replication status card without account, write, payment, or Work Credit authority.</p>
        </div>
        <div class="page-actions">
          <a class="button button--secondary" href="/public-node/datanet/index.json" target="_blank" rel="noreferrer">Open raw index</a>
          <button class="button button--primary" type="button" data-datanet-refresh>Refresh</button>
        </div>
      </header>

      <div class="dashboard-grid">
        <section class="surface hero-surface span-12" aria-labelledby="datanet-state-title">
          <div class="hero-content">
            <span class="status-chip status-chip--info" data-datanet-state-chip>Loading DataNet status</span>
            <h2 id="datanet-state-title" data-datanet-state-title>Reading public evidence</h2>
            <p data-datanet-message>No cached or invented dataset state is shown.</p>
            <small class="home-updated" data-datanet-updated>Not updated yet</small>
          </div>
          <aside class="hero-aside" aria-label="Data safety boundary">
            <div class="signal-line"><span>Mode</span><strong>READ-ONLY</strong></div>
            <div class="signal-line"><span>Public mutation</span><strong>DISABLED</strong></div>
            <div class="signal-line"><span>Credentials</span><strong>NONE</strong></div>
          </aside>
        </section>

        <section class="span-12" aria-label="DataNet evidence summary">
          <div class="balance-strip">
            <article class="balance-tile">
              <div class="balance-tile__top"><span class="balance-tile__label">Verified bytes</span><span class="status-chip">Evidence</span></div>
              <strong class="balance-tile__value" data-datanet-verified-bytes>—</strong>
              <span class="balance-tile__meta">Exact field object size</span>
            </article>
            <article class="balance-tile">
              <div class="balance-tile__top"><span class="balance-tile__label">Proof markers</span><span class="status-chip status-chip--info">Bounded</span></div>
              <strong class="balance-tile__value" data-datanet-proof-count>—</strong>
              <span class="balance-tile__meta">Green proof signals</span>
            </article>
            <article class="balance-tile balance-tile--production">
              <div class="balance-tile__top"><span class="balance-tile__label">Round trip</span><span class="status-chip status-chip--info">Read-only</span></div>
              <strong class="balance-tile__value" data-datanet-roundtrip>—</strong>
              <span class="balance-tile__meta">Source → field → source</span>
            </article>
          </div>
        </section>

        <section class="surface panel span-7" aria-labelledby="datanet-replication-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Replication evidence</span>
              <h2 id="datanet-replication-title">Field path</h2>
              <p>Sanitized source and field identities from the public status card.</p>
            </div>
          </div>
          <dl class="wallet-facts">
            <div><dt>Source node</dt><dd data-datanet-source-node>—</dd></div>
            <div><dt>Field node</dt><dd data-datanet-field-node>—</dd></div>
            <div><dt>Network path</dt><dd data-datanet-network-path>—</dd></div>
            <div><dt>Source pull</dt><dd data-datanet-source-pull>—</dd></div>
            <div><dt>Field mirror</dt><dd data-datanet-field-mirror>—</dd></div>
            <div><dt>Home verification</dt><dd data-datanet-home-verify>—</dd></div>
          </dl>
        </section>

        <section class="surface panel span-5" aria-labelledby="datanet-boundary-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Authority boundary</span>
              <h2 id="datanet-boundary-title">No mutation authority</h2>
              <p>Unavailable states stay explicit instead of silently enabling a workflow.</p>
            </div>
          </div>
          <div class="activity-list">
            <div class="activity-row"><div class="activity-copy"><strong>Public writes</strong><small>No mutation route</small></div><div class="activity-value">Disabled</div></div>
            <div class="activity-row"><div class="activity-copy"><strong>Ledger / WC</strong><small>No credit or settlement authority</small></div><div class="activity-value">Disabled</div></div>
            <div class="activity-row"><div class="activity-copy"><strong>Wallet movement</strong><small>No signer or payment path</small></div><div class="activity-value">Disabled</div></div>
          </div>
        </section>

        <section class="surface panel span-12" aria-labelledby="datanet-integrity-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Content identity</span>
              <h2 id="datanet-integrity-title">Verified field object</h2>
              <p>Exact SHA-256 and public status-card links are displayed only after validation.</p>
            </div>
          </div>
          <dl class="wallet-facts">
            <div><dt>SHA-256</dt><dd class="mono" data-datanet-sha>—</dd></div>
            <div><dt>Created</dt><dd data-datanet-created>—</dd></div>
            <div><dt>Status JSON</dt><dd><a data-datanet-json-link href="${escapeHtml(DATANET_ENDPOINT)}">Open JSON</a></dd></div>
            <div><dt>Status HTML</dt><dd><a data-datanet-html-link href="/public-node/datanet/field-replication-status-card-v1.html">Open HTML</a></dd></div>
          </dl>
        </section>
      </div>
    </div>`;
}

const currentRoute = () => {
  if (typeof location === 'undefined') return '';
  return location.hash.replace(/^#\/?/, '').split(/[?\/]/)[0] || 'home';
};

const setText = (selector, value, fallback = '—') => {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value === null || value === undefined || value === ''
      ? fallback
      : String(value);
  });
};

const setChip = (variant, text) => {
  const element = document.querySelector('[data-datanet-state-chip]');
  if (!element) return;
  element.className = `status-chip status-chip--${variant}`;
  element.textContent = text;
};

const setLoading = () => {
  setChip('info', 'Loading DataNet status');
  setText('[data-datanet-state-title]', 'Reading public evidence');
  setText('[data-datanet-message]', 'No cached or invented dataset state is shown.');
  setText('[data-datanet-updated]', 'Request in progress');
};

const setError = (message) => {
  setChip('warning', 'HOLD · data unavailable');
  setText('[data-datanet-state-title]', 'DataNet evidence did not validate');
  setText(
    '[data-datanet-message]',
    'The Data view fails closed. No cached, partial, or invented values are substituted.'
  );
  setText('[data-datanet-updated]', message || 'Request failed');
  setText('[data-datanet-verified-bytes]', '—');
  setText('[data-datanet-proof-count]', '—');
  setText('[data-datanet-roundtrip]', 'HOLD');
  setText('[data-datanet-source-node]', '—');
  setText('[data-datanet-field-node]', '—');
  setText('[data-datanet-network-path]', '—');
  setText('[data-datanet-source-pull]', '—');
  setText('[data-datanet-field-mirror]', '—');
  setText('[data-datanet-home-verify]', '—');
  setText('[data-datanet-sha]', '—');
  setText('[data-datanet-created]', '—');
};

const applyStatus = (snapshot) => {
  const field = snapshot.field_result;
  setChip('positive', 'DataNet evidence green');
  setText('[data-datanet-state-title]', 'Field replication verified');
  setText('[data-datanet-message]', snapshot.claim);
  setText('[data-datanet-verified-bytes]', field.verified_bytes.toLocaleString('en-US'));
  setText('[data-datanet-proof-count]', snapshot.proof_markers.length);
  setText('[data-datanet-roundtrip]', field.roundtrip_match ? 'VERIFIED' : 'HOLD');
  setText('[data-datanet-source-node]', field.source_node);
  setText('[data-datanet-field-node]', field.field_node);
  setText('[data-datanet-network-path]', field.network_path);
  setText('[data-datanet-source-pull]', field.source_to_field_pull_green ? 'Green' : 'HOLD');
  setText('[data-datanet-field-mirror]', field.field_mirror_green ? 'Green' : 'HOLD');
  setText('[data-datanet-home-verify]', field.home_roundtrip_verify_green ? 'Green' : 'HOLD');
  setText('[data-datanet-sha]', field.verified_sha256);
  setText('[data-datanet-created]', new Date(snapshot.created_at).toLocaleString());

  const jsonLink = document.querySelector('[data-datanet-json-link]');
  const htmlLink = document.querySelector('[data-datanet-html-link]');
  if (jsonLink) jsonLink.href = snapshot.routes.json;
  if (htmlLink) htmlLink.href = snapshot.routes.html;

  setText(
    '[data-datanet-updated]',
    `Validated ${new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`
  );
};

export async function loadDataNetViewV1(fetchOptions = {}) {
  if (currentRoute() !== 'data') return false;
  if (!document.querySelector('[data-datanet-view]')) return false;

  const serial = ++requestSerial;
  setLoading();

  try {
    const snapshot = await fetchDataNetStatusV1(fetchOptions);
    if (serial !== requestSerial) return false;
    applyStatus(snapshot);
    return true;
  } catch (error) {
    if (serial !== requestSerial) return false;
    setError(error instanceof Error ? error.message : 'Request failed');
    return false;
  }
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-datanet-refresh]')) return;
    void loadDataNetViewV1();
  });

  const viewRoot = document.getElementById('view-root');
  if (viewRoot) {
    const observer = new MutationObserver(() => {
      if (currentRoute() === 'data' && viewRoot.querySelector('[data-datanet-view]')) {
        queueMicrotask(() => { void loadDataNetViewV1(); });
      }
    });
    observer.observe(viewRoot, { childList: true });
  }
}
