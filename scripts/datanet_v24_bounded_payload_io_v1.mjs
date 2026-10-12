// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

export class DatanetPayloadIoHoldV1 extends Error {
  constructor(reason, detail = {}) {
    super(`HOLD:${reason}`);
    this.name = "DatanetPayloadIoHoldV1";
    this.code = "VOID_DATANET_PAYLOAD_IO_HOLD_V1";
    this.reason = reason;
    this.detail = Object.freeze({ ...detail });
  }
}

function hold(reason, detail = {}) {
  throw new DatanetPayloadIoHoldV1(reason, detail);
}

function requireSafeInteger(value, label) {
  if (!Number.isSafeInteger(value)) hold("INVALID_INTEGER", { label, value });
}

function requirePositiveInteger(value, label) {
  requireSafeInteger(value, label);
  if (value <= 0) hold("INVALID_INTEGER", { label, value });
}

function normalizeCandidate(expected, adapter) {
  const planned = adapter?.plan ? adapter.plan(Object.freeze({ ...expected })) : expected;
  if (planned === null || typeof planned !== "object") {
    hold("INVALID_ADAPTER_PLAN", { ordinal: expected.ordinal });
  }
  const candidate = {
    ordinal: expected.ordinal,
    phase: expected.phase,
    kind: expected.kind,
    offset: planned.offset,
    requested: planned.requested,
    eof: expected.eof,
  };
  requireSafeInteger(candidate.offset, "offset");
  requirePositiveInteger(candidate.requested, "requested");
  if (candidate.requested !== expected.requested) {
    hold("REQUEST_LENGTH_DRIFT", {
      ordinal: expected.ordinal,
      expected: expected.requested,
      observed: candidate.requested,
    });
  }
  return Object.freeze(candidate);
}

function validateOffset(candidate, expected, previousOffset, totalBytes) {
  if (candidate.offset === totalBytes + 1) {
    hold("MAX_PLUS_ONE_OFFSET", {
      ordinal: candidate.ordinal,
      expected_offset: expected.offset,
      observed_offset: candidate.offset,
      maximum_boundary: totalBytes,
      dispatch_attempted: false,
    });
  }
  if (previousOffset !== null && candidate.offset === previousOffset) {
    hold("DUPLICATE_OFFSET", {
      ordinal: candidate.ordinal,
      expected_offset: expected.offset,
      observed_offset: candidate.offset,
      previous_offset: previousOffset,
      dispatch_attempted: false,
    });
  }
  if (candidate.offset !== expected.offset) {
    hold("DISCONTINUOUS_OFFSET", {
      ordinal: candidate.ordinal,
      expected_offset: expected.offset,
      observed_offset: candidate.offset,
      previous_offset: previousOffset,
      dispatch_attempted: false,
    });
  }
}

function dispatchOnce(candidate, dispatch, adapter) {
  let adapterCalls = 0;
  let realDispatchCalls = 0;
  const realDispatch = () => {
    realDispatchCalls += 1;
    return dispatch(candidate);
  };
  let result;
  try {
    if (adapter?.dispatch) {
      adapterCalls += 1;
      result = adapter.dispatch(candidate, realDispatch);
    } else {
      result = realDispatch();
    }
  } catch (error) {
    if (error?.code === "EINTR") {
      hold("EINTR", {
        ordinal: candidate.ordinal,
        offset: candidate.offset,
        requested: candidate.requested,
        adapter_calls: adapterCalls,
        real_dispatch_calls: realDispatchCalls,
        retry_count: 0,
      });
    }
    throw error;
  }
  requireSafeInteger(result, "result");
  if (result < 0 || result > candidate.requested) {
    hold("INVALID_RESULT", {
      ordinal: candidate.ordinal,
      offset: candidate.offset,
      requested: candidate.requested,
      result,
      retry_count: 0,
    });
  }
  return Object.freeze({ result, adapter_calls: adapterCalls, real_dispatch_calls: realDispatchCalls });
}

export function runDatanetBoundedPayloadIoV1({
  phase,
  kind,
  totalBytes,
  blockBytes,
  dispatch,
  adapter = null,
  includeEofProbe = false,
  onFullResult = null,
}) {
  if (kind !== "read" && kind !== "write") hold("INVALID_KIND", { kind });
  if (typeof phase !== "string" || phase.length === 0) hold("INVALID_PHASE");
  requirePositiveInteger(totalBytes, "totalBytes");
  requirePositiveInteger(blockBytes, "blockBytes");
  if (totalBytes % blockBytes !== 0) hold("UNALIGNED_TOTAL", { totalBytes, blockBytes });
  if (typeof dispatch !== "function") hold("INVALID_DISPATCH");
  if (adapter !== null && typeof adapter !== "object") hold("INVALID_ADAPTER");
  if (adapter?.plan && typeof adapter.plan !== "function") hold("INVALID_ADAPTER_PLAN");
  if (adapter?.dispatch && typeof adapter.dispatch !== "function") hold("INVALID_ADAPTER_DISPATCH");
  if (onFullResult !== null && typeof onFullResult !== "function") hold("INVALID_RESULT_CALLBACK");
  if (kind === "write" && includeEofProbe) hold("WRITE_EOF_PROBE_FORBIDDEN");

  let calls = 0;
  let requested = 0;
  let completed = 0;
  let eofProbes = 0;
  let previousOffset = null;
  let adapterCalls = 0;
  let realDispatchCalls = 0;
  const dataCalls = totalBytes / blockBytes;

  for (let ordinal = 0; ordinal < dataCalls; ordinal += 1) {
    const expected = Object.freeze({
      ordinal,
      phase,
      kind,
      offset: ordinal * blockBytes,
      requested: blockBytes,
      eof: false,
    });
    const candidate = normalizeCandidate(expected, adapter);
    validateOffset(candidate, expected, previousOffset, totalBytes);
    const observed = dispatchOnce(candidate, dispatch, adapter);
    adapterCalls += observed.adapter_calls;
    realDispatchCalls += observed.real_dispatch_calls;
    calls += 1;
    requested += candidate.requested;
    completed += observed.result;

    if (observed.result === 0) {
      hold("ZERO_BEFORE_END", {
        ordinal,
        offset: candidate.offset,
        requested: candidate.requested,
        result: observed.result,
        adapter_calls: adapterCalls,
        real_dispatch_calls: realDispatchCalls,
        retry_count: 0,
      });
    }
    if (observed.result > 0 && observed.result < candidate.requested) {
      hold("SHORT_POSITIVE_RETURN", {
        ordinal,
        offset: candidate.offset,
        requested: candidate.requested,
        result: observed.result,
        adapter_calls: adapterCalls,
        real_dispatch_calls: realDispatchCalls,
        retry_count: 0,
      });
    }
    if (observed.result !== candidate.requested) {
      hold("NONFULL_RESULT", {
        ordinal,
        offset: candidate.offset,
        requested: candidate.requested,
        result: observed.result,
        retry_count: 0,
      });
    }
    previousOffset = candidate.offset;
    if (onFullResult !== null) onFullResult(candidate, observed.result);
  }

  if (includeEofProbe) {
    const ordinal = dataCalls;
    const expected = Object.freeze({
      ordinal,
      phase,
      kind,
      offset: totalBytes,
      requested: 1,
      eof: true,
    });
    const candidate = normalizeCandidate(expected, adapter);
    validateOffset(candidate, expected, previousOffset, totalBytes);
    const observed = dispatchOnce(candidate, dispatch, adapter);
    adapterCalls += observed.adapter_calls;
    realDispatchCalls += observed.real_dispatch_calls;
    calls += 1;
    requested += 1;
    completed += observed.result;
    eofProbes = 1;
    if (observed.result !== 0) {
      hold("EOF_RETURNED_DATA", {
        ordinal,
        offset: candidate.offset,
        requested: 1,
        result: observed.result,
        retry_count: 0,
      });
    }
  }

  return Object.freeze({
    phase,
    kind,
    calls,
    requested,
    completed,
    eof_probes: eofProbes,
    adapter_calls: adapterCalls,
    real_dispatch_calls: realDispatchCalls,
    retry_count: 0,
    bounded: true,
  });
}
