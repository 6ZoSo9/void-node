// VOID Apollyon tiny broker core v5.1.3 - pure, data-only, dependency-free ESM.
// SAFETY INVARIANT: provider-execution authority derives solely from the
// authoritative state value held here. Operation identity includes only stable
// logical work; the event vocabulary is closed and contains no timeout, TTL,
// process-death, max_tokens-change, new-attempt-id, epoch/fencing-bump, or
// convenience-file-deletion recovery event, so none of these can ever restore
// provider-execution authority once the first-send window has closed.
// v5.1.3 REPAIR: every authority-changing event after reservation requires an
// event operationId that is present, well-formed, and exactly equal to the
// reserved state.operationId; missing, malformed, or foreign ids are fail-closed
// no-ops. RESERVE alone may create authority, from ABSENT, with a valid id.
import { createHash } from 'node:crypto';

export const BROKER_STATE_V1 = Object.freeze({
  ABSENT: 'ABSENT',
  RESERVED: 'RESERVED',
  UNCERTAIN: 'UNCERTAIN',
  ACCEPTED: 'ACCEPTED',
  RECONCILED_BLOCKED: 'RECONCILED_BLOCKED',
  CONFLICT: 'CONFLICT',
});

const STATES = new Set(Object.values(BROKER_STATE_V1));
const TERMINAL = new Set([BROKER_STATE_V1.RECONCILED_BLOCKED, BROKER_STATE_V1.CONFLICT]);
const EVENTS = new Set(['RESERVE', 'PROVIDER_ADMITTED', 'PROVIDER_RESULT', 'RECONCILE_BLOCKED']);
const HEX64 = /^[0-9a-f]{64}$/;
const OPID = /^apollyon_op_v1:[0-9a-f]{64}$/;
const fail = (m) => { throw new TypeError(m); };
const sha256Hex = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

// SAFETY: identity binds only registry/model generation identity, trial/
// admission identity, and the digest of admitted prompt/input bytes. Every
// other field, especially transient attempt parameters, is excluded.
// SAFETY: identity derives solely from the caller-supplied durable logical
// intent digest over a fixed version/domain; this helper never mints the digest.
export function apollyonOperationIdV1(input) {
  if (!input || typeof input !== 'object') fail('input object required');
  const d = input.logicalOperationIntentDigest;
  if (typeof d !== 'string' || !HEX64.test(d)) fail('logicalOperationIntentDigest must be sha256 hex');
  const domain = 'apollyon-operation-identity-v1';
  return 'apollyon_op_v1:' + sha256Hex(JSON.stringify({ v: 1, domain, d }));
}

function assertState(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) fail('state object required');
  if (!STATES.has(s.phase)) fail('phase must be a BROKER_STATE_V1 member');
  const B = BROKER_STATE_V1;
  const oid = s.operationId;
  const dig = s.acceptedDigest;
  if (oid !== null && !(typeof oid === 'string' && OPID.test(oid))) fail('operationId must be null or a valid apollyon operation id');
  if (dig !== null && !(typeof dig === 'string' && HEX64.test(dig))) fail('acceptedDigest must be null or sha256 hex');
  // SAFETY: phase-specific state shapes fail closed; any mismatch throws.
  switch (s.phase) {
    case B.ABSENT:
      if (oid !== null || dig !== null) fail('ABSENT requires operationId=null and acceptedDigest=null');
      break;
    case B.RESERVED:
      if (oid === null) fail('RESERVED requires a valid apollyon operation id');
      if (dig !== null) fail('RESERVED requires acceptedDigest=null');
      break;
    case B.UNCERTAIN:
      if (oid === null) fail('UNCERTAIN requires a valid apollyon operation id');
      if (dig !== null) fail('UNCERTAIN requires acceptedDigest=null');
      break;
    case B.ACCEPTED:
      if (oid === null) fail('ACCEPTED requires a valid apollyon operation id');
      if (dig === null) fail('ACCEPTED requires a valid sha256 hex acceptedDigest');
      break;
    case B.RECONCILED_BLOCKED:
      if (oid === null) fail('RECONCILED_BLOCKED requires a valid apollyon operation id');
      if (dig !== null) fail('RECONCILED_BLOCKED requires acceptedDigest=null');
      break;
    case B.CONFLICT:
      if (oid === null) fail('CONFLICT requires a valid apollyon operation id');
      if (dig === null) fail('CONFLICT requires a valid sha256 hex acceptedDigest');
      break;
    default:
      fail('unreachable phase');
  }
}

// SAFETY: exact post-reservation binding test. The event id must be present,
// well-formed, and identical to the reserved id; absent, malformed, or foreign
// ids make the event a fail-closed no-op before any transition logic runs.
function opBindsExactly(event, state) {
  return (
    typeof event.operationId === 'string' &&
    OPID.test(event.operationId) &&
    event.operationId === state.operationId
  );
}

// SAFETY: closed event set; unknown event types, unbound or foreign operation
// ids, and terminal phases leave the state unchanged, so recovery-style events
// cannot act and cannot restore provider-execution authority.
// SAFETY: closed event set; unknown event types, unbound or foreign operation
// ids, and terminal phases leave the state unchanged, so recovery-style events
// cannot act and cannot restore provider-execution authority.
export function reduceBrokerStateV1(state, event) {
  assertState(state);
  if (!event || typeof event !== 'object') fail('event object required');
  const et = event.type;
  if (!EVENTS.has(et)) return state;
  if (TERMINAL.has(state.phase)) return state;
  const B = BROKER_STATE_V1;
  if (et === 'RESERVE') {
    // SAFETY: authority is created only here, from ABSENT, bound to one op id.
    if (
      state.phase !== B.ABSENT ||
      typeof event.operationId !== 'string' ||
      !OPID.test(event.operationId)
    ) return state;
    return { phase: B.RESERVED, operationId: event.operationId, acceptedDigest: null };
  }
  // SAFETY: every post-reservation authority-changing event binds exactly.
  if (!opBindsExactly(event, state)) return state;
  if (et === 'PROVIDER_ADMITTED') {
    // SAFETY: irreversible admission closes the first-send window; ACCEPTED
    // and later phases ignore admission outright.
    if (state.phase !== B.RESERVED) return state;
    return { ...state, phase: B.UNCERTAIN };
  }
  if (et === 'PROVIDER_RESULT') {
    if (state.phase !== B.UNCERTAIN && state.phase !== B.ACCEPTED) return state;
    const d = event.resultDigest;
    if (typeof d !== 'string' || !HEX64.test(d)) return state;
    const dig = d.toLowerCase();
    if (state.phase === B.UNCERTAIN) return { ...state, phase: B.ACCEPTED, acceptedDigest: dig };
    if (state.acceptedDigest === dig) return state;
    // SAFETY: divergent accepted result digests block execution terminally.
    return { ...state, phase: B.CONFLICT };
  }
  // SAFETY: RECONCILE_BLOCKED is representational only and applies solely to
  // UNCERTAIN, so ACCEPTED can never be downgraded by reconciliation; its
  // caller authentication stays outside this module (declared known unknown).
  if (state.phase !== B.UNCERTAIN) return state;
  return { ...state, phase: B.RECONCILED_BLOCKED };
}

// SAFETY: true only for a pre-admission reservation holding a bound operation
// id. UNCERTAIN and later never satisfy it; no automatic retry path exists.
// SAFETY: true only for a pre-admission reservation holding a bound operation
// id and null digest. UNCERTAIN and later never satisfy it; malformed states
// fail closed to false; no automatic retry path exists.
export function mayExecuteProviderV1(state) {
  try { assertState(state); } catch { return false; }
  return state.phase === BROKER_STATE_V1.RESERVED && state.acceptedDigest === null;
}
