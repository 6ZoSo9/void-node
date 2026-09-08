// VOID Apollyon durable-ledger -> broker replay v8.2 - pure, data-only ESM.
// SAFETY: replay rebuilds the authoritative broker state ONLY by feeding
// hash-chain-verified durable ledger events through the exact broker reducer
// (reduceBrokerStateV1). Replay itself grants nothing: a BIND_INTENT-only
// ledger replays to ABSENT, which satisfies no provider-execution condition.
// SAFETY: any durable event leaving broker state field-identical (stale,
// duplicate, unbound, or terminal-phase) fails closed by throwing here.
import { BROKER_STATE_V1, reduceBrokerStateV1 } from './apollyon_execution_broker_v1.mjs';
import { LEDGER_EVENT_V1, verifyLedgerChainV1 } from './apollyon_execution_ledger_record_v1.mjs';

const fail = (m) => { throw new TypeError(m); };

// Fresh frozen pre-ledger/ABSENT state; exact shape, no shared mutables.
function absentState() {
  return Object.freeze({
    phase: BROKER_STATE_V1.ABSENT,
    operationId: null,
    acceptedDigest: null,
  });
}

// Post-reduction gate: plain state with exactly phase/operationId/acceptedDigest.
function checkPlainState(s, seq) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    fail('reducer returned a non-object at sequence ' + seq);
  }
  const ks = Object.keys(s);
  if (
    ks.length !== 3 ||
    !ks.includes('phase') ||
    !ks.includes('operationId') ||
    !ks.includes('acceptedDigest')
  ) {
    fail('state keys != {phase, operationId, acceptedDigest} at sequence ' + seq);
  }
  if (!Object.values(BROKER_STATE_V1).includes(s.phase)) {
    fail('invalid broker phase at sequence ' + seq);
  }
  if (
    (s.operationId !== null && typeof s.operationId !== 'string') ||
    (s.acceptedDigest !== null && typeof s.acceptedDigest !== 'string')
  ) {
    fail('invalid operationId/acceptedDigest type at sequence ' + seq);
  }
}

// Ledger record -> exactly one closed-vocabulary broker event; no extra fields.
function translateEvent(r) {
  switch (r.type) {
    case LEDGER_EVENT_V1.RESERVE:
      return { type: 'RESERVE', operationId: r.operationId };
    case LEDGER_EVENT_V1.PROVIDER_ADMITTED:
      return { type: 'PROVIDER_ADMITTED', operationId: r.operationId };
    case LEDGER_EVENT_V1.RESULT_WITNESSED:
      return { type: 'RESULT_WITNESSED', operationId: r.operationId, resultDigest: r.resultDigest };
    case LEDGER_EVENT_V1.PROVIDER_RESULT:
      return { type: 'PROVIDER_RESULT', operationId: r.operationId, resultDigest: r.resultDigest };
    case LEDGER_EVENT_V1.RECONCILE_BLOCKED:
      return { type: 'RECONCILE_BLOCKED', operationId: r.operationId };
    default:
      return fail('untranslatable ledger event at sequence ' + r.sequence);
  }
}

// Deterministic replay of a verified durable chain to one frozen broker state.
// Throws on tamper, no-op events, or binding drift. Grants no authority.
export function replayBrokerStateFromLedgerV1(records) {
  if (!Array.isArray(records)) fail('records must be an array');
  if (records.length === 0) return absentState(); // pre-ledger state
  verifyLedgerChainV1(records); // structural + binding proof; throws on fault
  const head = records[0];
  if (head.type !== LEDGER_EVENT_V1.BIND_INTENT || head.sequence !== 0) {
    fail('verified head must be BIND_INTENT at sequence 0');
  }
  const durableOperationId = head.operationId;
  let state = absentState();
  // BIND_INTENT binds identity only; it is not fed to the broker reducer.
  for (let i = 1; i < records.length; i++) {
    const rec = records[i];
    const before = {
      phase: state.phase,
      operationId: state.operationId,
      acceptedDigest: state.acceptedDigest,
    };
    state = reduceBrokerStateV1(state, translateEvent(rec));
    checkPlainState(state, rec.sequence);
    if (
      state.phase === before.phase &&
      state.operationId === before.operationId &&
      state.acceptedDigest === before.acceptedDigest
    ) {
      fail('durable no-op event forbidden at sequence ' + rec.sequence + ' (' + rec.type + ')');
    }
    if (state.operationId !== null && state.operationId !== durableOperationId) {
      fail('operation binding drift at sequence ' + rec.sequence);
    }
  }
  return Object.freeze({
    phase: state.phase,
    operationId: state.operationId,
    acceptedDigest: state.acceptedDigest,
  });
}
