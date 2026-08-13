export const NETWORK_ENDPOINT = '/__void/ui/wave2/home.json';
export const NETWORK_MARKER = 'VOID_UI_WAVE2_HOME_READONLY_V1';
export const MAX_NETWORK_RESPONSE_BYTES = 128 * 1024;

const TOP_KEYS = Object.freeze([
  'account',
  'balances',
  'boundaries',
  'generated_at',
  'marker',
  'network',
  'network_name',
  'node',
  'ok',
  'read_only',
  'source_base',
  'sources',
]);
const NODE_KEYS = Object.freeze(['hostname', 'label', 'role']);
const NETWORK_KEYS = Object.freeze(['chain_head', 'expected_peer_count', 'health', 'peer_count', 'ready']);
const ACCOUNT_KEYS = Object.freeze(['label', 'selected']);
const BALANCE_KEYS = Object.freeze(['available', 'production_wc_display', 'spendable_wc_display', 'void_display']);
const SOURCE_KEYS = Object.freeze(['health', 'head', 'peers', 'ready']);
const BOUNDARY_KEYS = Object.freeze([
  'fulfillment',
  'ledger_write',
  'money_movement',
  'operator_mutation',
  'validator_mutation',
  'wallet_send',
  'wc_to_void',
]);
const SOURCE_RESULT_REQUIRED_KEYS = Object.freeze(['body', 'ok', 'status']);
const SOURCE_RESULT_ALLOWED_KEYS = new Set([...SOURCE_RESULT_REQUIRED_KEYS, 'error']);
const NODE_ROLES = new Set(['precision', 'nimo', 'alienware', 'local']);

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, expected) => {
  if (!isPlainObject(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
};
const boundedText = (value, max = 2048) => typeof value === 'string' && value.length > 0 && value.length <= max;
const safeInteger = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => (
  Number.isSafeInteger(value) && value >= minimum && value <= maximum
);

const validateSourceBase = (raw) => {
  if (!boundedText(raw, 256)) throw new Error('network source base invalid');
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('network source base invalid');
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    parsed.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '::1'].includes(host) ||
    parsed.username || parsed.password || parsed.search || parsed.hash ||
    (parsed.pathname !== '/' && parsed.pathname !== '')
  ) {
    throw new Error('network source base must remain loopback-only');
  }
};

const validateSourceResult = (value, name) => {
  if (!isPlainObject(value)) throw new Error(`network source result invalid: ${name}`);
  for (const key of Object.keys(value)) {
    if (!SOURCE_RESULT_ALLOWED_KEYS.has(key)) throw new Error(`network source result shape mismatch: ${name}`);
  }
  for (const key of SOURCE_RESULT_REQUIRED_KEYS) {
    if (!Object.hasOwn(value, key)) throw new Error(`network source result missing field: ${name}.${key}`);
  }
  if (typeof value.ok !== 'boolean') throw new Error(`network source ok invalid: ${name}`);
  if (!safeInteger(value.status, 0, 599)) throw new Error(`network source status invalid: ${name}`);
  if (value.error !== undefined && value.error !== null && !boundedText(value.error, 1024)) {
    throw new Error(`network source error invalid: ${name}`);
  }
  const bodyValid = value.body === null || isPlainObject(value.body) || Array.isArray(value.body);
  if (!bodyValid) throw new Error(`network source body invalid: ${name}`);
};

export function validateNetworkSnapshotV1(snapshot) {
  if (!exactKeys(snapshot, TOP_KEYS)) throw new Error('network snapshot top-level shape mismatch');
  if (snapshot.ok !== true) throw new Error('network snapshot ok mismatch');
  if (snapshot.marker !== NETWORK_MARKER) throw new Error('network snapshot marker mismatch');
  if (snapshot.read_only !== true) throw new Error('network snapshot must be read-only');
  if (snapshot.network_name !== 'Mainnet-0') throw new Error('network identity mismatch');
  if (!Number.isFinite(Date.parse(snapshot.generated_at))) throw new Error('network generated timestamp invalid');
  validateSourceBase(snapshot.source_base);

  if (!exactKeys(snapshot.node, NODE_KEYS)) throw new Error('network node shape mismatch');
  if (!boundedText(snapshot.node.hostname, 128) || !boundedText(snapshot.node.label, 128)) {
    throw new Error('network node identity invalid');
  }
  if (!NODE_ROLES.has(snapshot.node.role)) throw new Error('network node role invalid');

  if (!exactKeys(snapshot.network, NETWORK_KEYS)) throw new Error('network state shape mismatch');
  if (!['healthy', 'degraded'].includes(snapshot.network.health)) throw new Error('network health invalid');
  if (typeof snapshot.network.ready !== 'boolean') throw new Error('network readiness invalid');
  if ((snapshot.network.health === 'healthy') !== snapshot.network.ready) {
    throw new Error('network health/readiness contradiction');
  }
  if (snapshot.network.chain_head !== null && !safeInteger(snapshot.network.chain_head)) {
    throw new Error('network chain head invalid');
  }
  if (!safeInteger(snapshot.network.peer_count, 0, 10000)) throw new Error('network peer count invalid');
  if (snapshot.network.expected_peer_count !== 2) throw new Error('network expected peer count contract mismatch');

  if (!exactKeys(snapshot.account, ACCOUNT_KEYS)) throw new Error('network account shape mismatch');
  if (snapshot.account.selected !== false || snapshot.account.label !== 'No account selected') {
    throw new Error('network account boundary mismatch');
  }

  if (!exactKeys(snapshot.balances, BALANCE_KEYS)) throw new Error('network balance shape mismatch');
  if (
    snapshot.balances.available !== false ||
    snapshot.balances.void_display !== '—' ||
    snapshot.balances.spendable_wc_display !== '—' ||
    snapshot.balances.production_wc_display !== '—'
  ) {
    throw new Error('network balance boundary mismatch');
  }

  if (!exactKeys(snapshot.sources, SOURCE_KEYS)) throw new Error('network sources shape mismatch');
  for (const name of SOURCE_KEYS) validateSourceResult(snapshot.sources[name], name);
  if (snapshot.network.ready) {
    for (const name of SOURCE_KEYS) {
      if (snapshot.sources[name].ok !== true || snapshot.sources[name].status !== 200) {
        throw new Error(`network ready state contradicts source availability: ${name}`);
      }
    }
  }

  if (!exactKeys(snapshot.boundaries, BOUNDARY_KEYS)) throw new Error('network boundary shape mismatch');
  for (const key of BOUNDARY_KEYS) {
    if (snapshot.boundaries[key] !== false) throw new Error(`network authority flag must be false: ${key}`);
  }

  return snapshot;
}

export async function readBoundedNetworkJsonV1(response) {
  if (!response?.body || typeof response.body.getReader !== 'function') {
    throw new Error('network response body is not stream-readable');
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error('network response chunk invalid');
      total += value.byteLength;
      if (total > MAX_NETWORK_RESPONSE_BYTES) {
        await reader.cancel('network response exceeds byte limit');
        throw new Error('network response exceeds byte limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
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

const numberOrNull = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
};

export function networkViewModelV1(snapshot) {
  const validated = validateNetworkSnapshotV1(snapshot);
  const readyBody = isPlainObject(validated.sources.ready.body) ? validated.sources.ready.body : {};
  const latestBody = isPlainObject(validated.sources.head.body) ? validated.sources.head.body : {};
  const readinessHead = numberOrNull(readyBody.head);
  const lastmileSeen = numberOrNull(readyBody.lastmile_seen);
  const gap = numberOrNull(readyBody.gap);
  const latestNumber = numberOrNull(latestBody.number ?? latestBody.height ?? latestBody.head ?? latestBody.latest);
  const reasons = Array.isArray(readyBody.reasons)
    ? readyBody.reasons.filter((reason) => boundedText(reason, 256)).slice(0, 8)
    : [];
  const chainHead = validated.network.chain_head;
  const comparable = [chainHead, latestNumber, readinessHead, lastmileSeen].filter((value) => value !== null);
  const allHeadsMatch = comparable.length >= 2 && comparable.every((value) => value === comparable[0]);
  const chainAligned = validated.network.ready && gap === 0 && allHeadsMatch;
  const availableSources = SOURCE_KEYS.filter((name) => (
    validated.sources[name].ok === true && validated.sources[name].status === 200
  )).length;

  return Object.freeze({
    nodeLabel: validated.node.label,
    nodeRole: validated.node.role,
    networkName: validated.network_name,
    ready: validated.network.ready,
    health: validated.network.health,
    chainHead,
    latestNumber,
    readinessHead,
    lastmileSeen,
    gap,
    reasons,
    peerCount: validated.network.peer_count,
    expectedPeerCount: validated.network.expected_peer_count,
    peerBaselineMet: validated.network.peer_count >= validated.network.expected_peer_count,
    chainAligned,
    availableSources,
    totalSources: SOURCE_KEYS.length,
    generatedAt: validated.generated_at,
    sourceStatuses: Object.freeze(Object.fromEntries(
      SOURCE_KEYS.map((name) => [name, validated.sources[name].status])
    )),
  });
}

const currentRoute = () => location.hash.replace(/^#\/?/, '').split(/[?\/]/)[0] || 'home';
const formatNumber = (value) => value === null ? '—' : Number(value).toLocaleString('en-US');
const formatTime = (value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed)
    ? new Date(parsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';
};

const networkShell = () => `
  <div data-network-live-view>
    <header class="page-header">
      <div class="page-header__copy">
        <span class="eyebrow">Live local network truth</span>
        <h1>Network</h1>
        <p>Inspect this node's Mainnet-0 readiness, chain head, peer visibility, and exact read-only source health. Remote machine state is not inferred.</p>
      </div>
      <div class="page-actions">
        <button class="button button--primary" type="button" data-network-refresh>Refresh network</button>
      </div>
    </header>

    <div class="dashboard-grid">
      <section class="surface hero-surface span-12" aria-labelledby="network-live-title">
        <div class="hero-content">
          <span class="status-chip status-chip--info" data-network-live-chip>Checking network</span>
          <h2 id="network-live-title" data-network-live-title>Reading the local node adapter</h2>
          <p data-network-live-summary>No topology claim is shown until the exact read-only snapshot validates.</p>
        </div>
        <aside class="hero-aside" aria-label="Live network summary">
          <div class="signal-line"><span>Network</span><strong data-network-name>MAINNET-0</strong></div>
          <div class="signal-line"><span>Node</span><strong data-network-node>—</strong></div>
          <div class="signal-line"><span>Mode</span><strong>READ-ONLY</strong></div>
        </aside>
      </section>

      <section class="span-12" aria-label="Live network metrics">
        <div class="balance-strip">
          <article class="balance-tile">
            <div class="balance-tile__top"><span class="balance-tile__label">Chain head</span><span class="status-chip">Local</span></div>
            <strong class="balance-tile__value" data-network-head>—</strong>
            <span class="balance-tile__meta" data-network-chain-note>Waiting for validated evidence</span>
          </article>
          <article class="balance-tile">
            <div class="balance-tile__top"><span class="balance-tile__label">Visible peers</span><span class="status-chip">Observed</span></div>
            <strong class="balance-tile__value" data-network-peers>—</strong>
            <span class="balance-tile__meta" data-network-peer-note>No remote peer identity is inferred</span>
          </article>
          <article class="balance-tile balance-tile--production">
            <div class="balance-tile__top"><span class="balance-tile__label">Source checks</span><span class="status-chip status-chip--info">GET-only</span></div>
            <strong class="balance-tile__value" data-network-sources>—</strong>
            <span class="balance-tile__meta">Health · readiness · head · peers</span>
          </article>
        </div>
      </section>

      <section class="surface panel span-7" aria-labelledby="network-evidence-title">
        <div class="panel-header">
          <div class="panel-header__copy">
            <span class="eyebrow">Exact source evidence</span>
            <h2 id="network-evidence-title">Local node checks</h2>
            <p>Four source results are carried by the existing Home read-only adapter. This view performs no remote dial or topology mutation.</p>
          </div>
        </div>
        <div class="activity-list">
          <div class="activity-row"><div class="activity-copy"><strong>HTTP health</strong><small>/health</small></div><div class="activity-value" data-network-source-health>—</div></div>
          <div class="activity-row"><div class="activity-copy"><strong>Operational readiness</strong><small>/__void/ready.json</small></div><div class="activity-value" data-network-source-ready>—</div></div>
          <div class="activity-row"><div class="activity-copy"><strong>Latest block</strong><small>/blocks/latest/number2.json</small></div><div class="activity-value" data-network-source-head>—</div></div>
          <div class="activity-row"><div class="activity-copy"><strong>Peer visibility</strong><small>/p2p/peers</small></div><div class="activity-value" data-network-source-peers>—</div></div>
        </div>
      </section>

      <section class="surface panel span-5" aria-labelledby="network-alignment-title">
        <div class="panel-header">
          <div class="panel-header__copy">
            <span class="eyebrow">Chain alignment</span>
            <h2 id="network-alignment-title">Observed consistency</h2>
            <p>Local readiness evidence only; this is not a claim that every remote machine is aligned.</p>
          </div>
        </div>
        <dl class="wallet-facts">
          <div><dt>Readiness head</dt><dd data-network-ready-head>—</dd></div>
          <div><dt>Last-mile seen</dt><dd data-network-lastmile>—</dd></div>
          <div><dt>Gap</dt><dd data-network-gap>—</dd></div>
          <div><dt>Result</dt><dd data-network-alignment>HOLD</dd></div>
        </dl>
      </section>

      <section class="surface panel span-12" aria-labelledby="network-boundary-title">
        <div class="panel-header">
          <div class="panel-header__copy">
            <span class="eyebrow">Protected boundary</span>
            <h2 id="network-boundary-title">No network authority</h2>
            <p>This browser view cannot dial a peer, add or remove a route, restart a node, connect a wallet, mutate a validator, sign or broadcast a transaction, or move funds.</p>
          </div>
          <span class="status-chip" data-network-updated>Not updated</span>
        </div>
        <div class="health-row health-row--single">
          <article class="health-card"><div class="health-card__top"><strong>Topology</strong><span class="status-chip">Observed only</span></div><dl><div><dt>Peer mutation</dt><dd>Disabled</dd></div><div><dt>Remote probing</dt><dd>None</dd></div></dl></article>
          <article class="health-card"><div class="health-card__top"><strong>Authority</strong><span class="status-chip">None</span></div><dl><div><dt>Operator controls</dt><dd>Excluded</dd></div><div><dt>Money movement</dt><dd>Disabled</dd></div></dl></article>
        </div>
      </section>
    </div>
  </div>`;

const setText = (selector, value, fallback = '—') => {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value === null || value === undefined || value === '' ? fallback : String(value);
  });
};
const setChip = (variant, text) => {
  const chip = document.querySelector('[data-network-live-chip]');
  if (!chip) return;
  chip.className = `status-chip status-chip--${variant}`;
  chip.textContent = text;
};
const httpLabel = (status) => status === 200 ? '200 / OK' : status === 0 ? 'UNAVAILABLE' : `${status} / HOLD`;

let requestSerial = 0;
let mounted = false;

const setLoading = () => {
  setChip('info', 'Checking network');
  setText('[data-network-live-title]', 'Reading the local node adapter');
  setText('[data-network-live-summary]', 'No topology claim is shown until the exact read-only snapshot validates.');
};

const setError = (error) => {
  setChip('warning', 'Network evidence unavailable');
  setText('[data-network-live-title]', 'Network view is on hold');
  setText('[data-network-live-summary]', 'The exact read-only snapshot could not be validated. No cached, hard-coded, or inferred node state is shown.');
  for (const selector of [
    '[data-network-head]', '[data-network-peers]', '[data-network-sources]', '[data-network-ready-head]',
    '[data-network-lastmile]', '[data-network-gap]', '[data-network-source-health]', '[data-network-source-ready]',
    '[data-network-source-head]', '[data-network-source-peers]',
  ]) setText(selector, 'HOLD');
  setText('[data-network-alignment]', 'HOLD');
  setText('[data-network-chain-note]', 'Validated local chain evidence unavailable');
  setText('[data-network-peer-note]', 'No remote peer identity is inferred');
  setText('[data-network-updated]', error instanceof Error ? error.message : 'Validation failed');
};

const applyViewModel = (model) => {
  setChip(model.ready ? 'positive' : 'warning', model.ready ? 'Node ready' : 'Node degraded');
  setText('[data-network-live-title]', model.ready ? 'Local Mainnet-0 node is ready' : 'Local Mainnet-0 node is degraded');
  setText(
    '[data-network-live-summary]',
    model.ready
      ? 'The local node adapter reports operational readiness. Peer count is observed locally; remote machine health is not inferred.'
      : 'One or more local readiness conditions are not green. The view remains read-only and does not attempt repair.'
  );
  setText('[data-network-name]', model.networkName.toUpperCase());
  setText('[data-network-node]', `${model.nodeLabel} / ${model.nodeRole}`);
  setText('[data-network-head]', formatNumber(model.chainHead));
  setText('[data-network-peers]', `${model.peerCount} / ${model.expectedPeerCount}`);
  setText('[data-network-sources]', `${model.availableSources} / ${model.totalSources}`);
  setText('[data-network-chain-note]', model.chainAligned ? 'Local head/readiness evidence aligned' : 'Local alignment not proven');
  setText('[data-network-peer-note]', model.peerBaselineMet ? 'Observed peer baseline met; identities not inferred' : 'Observed peer baseline not met');
  setText('[data-network-ready-head]', formatNumber(model.readinessHead));
  setText('[data-network-lastmile]', formatNumber(model.lastmileSeen));
  setText('[data-network-gap]', model.gap === null ? '—' : model.gap);
  setText('[data-network-alignment]', model.chainAligned ? 'ALIGNED' : 'HOLD');
  setText('[data-network-source-health]', httpLabel(model.sourceStatuses.health));
  setText('[data-network-source-ready]', httpLabel(model.sourceStatuses.ready));
  setText('[data-network-source-head]', httpLabel(model.sourceStatuses.head));
  setText('[data-network-source-peers]', httpLabel(model.sourceStatuses.peers));
  setText('[data-network-updated]', `Updated ${formatTime(model.generatedAt)}`);
};

export async function loadNetworkViewV1() {
  if (typeof document === 'undefined' || currentRoute() !== 'network') return;
  if (!document.querySelector('[data-network-live-view]')) return;
  const serial = ++requestSerial;
  setLoading();
  try {
    const response = await fetch(NETWORK_ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      mode: 'same-origin',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`network adapter returned HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) throw new Error('network adapter content type mismatch');
    const snapshot = validateNetworkSnapshotV1(await readBoundedNetworkJsonV1(response));
    if (serial !== requestSerial || currentRoute() !== 'network') return;
    applyViewModel(networkViewModelV1(snapshot));
  } catch (error) {
    if (serial !== requestSerial || currentRoute() !== 'network') return;
    setError(error);
  }
}

const mountNetwork = () => {
  if (currentRoute() !== 'network') {
    mounted = false;
    return;
  }
  const root = document.getElementById('view-root');
  if (!root) return;
  if (mounted && root.querySelector('[data-network-live-view]')) return;
  root.innerHTML = networkShell();
  mounted = true;
  root.querySelector('[data-network-refresh]')?.addEventListener('click', loadNetworkViewV1);
  queueMicrotask(loadNetworkViewV1);
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const root = document.getElementById('view-root');
  if (root) {
    const observer = new MutationObserver(() => mountNetwork());
    observer.observe(root, { childList: true });
  }
  mountNetwork();
}
