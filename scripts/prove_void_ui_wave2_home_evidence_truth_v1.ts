import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  evaluateVoidUiWave2HomeOperationalEvidenceV1,
  parseVoidUiWave2HomeChainHeadV1,
  parseVoidUiWave2HomeHealthOkV1,
  parseVoidUiWave2HomePeerCountV1,
  parseVoidUiWave2HomeReadinessEvidenceV1,
  type VoidUiWave2HomeSourceResultV1,
} from "../src/ui/void_app_wave2_home_source_fetch_v1.js";

const root = process.cwd();
const homeSource = fs.readFileSync(path.join(root, "src/ui/void_app_wave2_home_readonly_v1.ts"), "utf8");
for (const marker of [
  "evaluateVoidUiWave2HomeOperationalEvidenceV1({",
  "health: evidence.operational_ready ? \"healthy\" : \"degraded\"",
  "ready: evidence.operational_ready",
  "chain_head: evidence.chain_head",
  "peer_count: evidence.peer_count",
]) assert.ok(homeSource.includes(marker), `Home evidence gate missing: ${marker}`);

assert.equal(parseVoidUiWave2HomeHealthOkV1({ ok: true }), true);
for (const body of [null, [], {}, { ok: false }, { ok: "true" }]) assert.equal(parseVoidUiWave2HomeHealthOkV1(body), false);

assert.deepEqual(parseVoidUiWave2HomeReadinessEvidenceV1({ ready: true, txroot_live: 1, reasons: null, gap: 0 }), { ready: true, txroot_live: 1, reasons: [], gap: 0 });
assert.deepEqual(parseVoidUiWave2HomeReadinessEvidenceV1({ ready: true, txroot_live: 1, reasons: [], gap: 0 }), { ready: true, txroot_live: 1, reasons: [], gap: 0 });
assert.deepEqual(parseVoidUiWave2HomeReadinessEvidenceV1({ ready: false, txroot_live: 0, reasons: ["txroot_not_live"], gap: 2 }), { ready: false, txroot_live: 0, reasons: ["txroot_not_live"], gap: 2 });
for (const body of [
  null, [], {},
  { ready: "true", txroot_live: 1, reasons: [], gap: 0 },
  { ready: true, txroot_live: true, reasons: [], gap: 0 },
  { ready: true, txroot_live: 2, reasons: [], gap: 0 },
  { ready: true, txroot_live: 1, gap: 0 },
  { ready: true, txroot_live: 1, reasons: "bad", gap: 0 },
  { ready: true, txroot_live: 1, reasons: [false], gap: 0 },
  { ready: false, txroot_live: 0, reasons: null, gap: 2 },
  { ready: true, txroot_live: 0, reasons: null, gap: 0 },
  { ready: true, txroot_live: 1, reasons: null, gap: 1 },
  { ready: true, txroot_live: 1, reasons: [] },
  { ready: true, txroot_live: 1, reasons: [], gap: "0" },
  { ready: true, txroot_live: 1, reasons: [], gap: null },
  { ready: true, txroot_live: 1, reasons: [], gap: true },
  { ready: true, txroot_live: 1, reasons: [], gap: -1 },
  { ready: true, txroot_live: 1, reasons: [], gap: 1.5 },
  { ready: true, txroot_live: 1, reasons: [], gap: Number.MAX_SAFE_INTEGER + 1 },
]) assert.equal(parseVoidUiWave2HomeReadinessEvidenceV1(body), null);

for (const body of [
  {}, { number: null }, { height: 123 }, { head: 123 }, { latest: 123 }, { number: null, height: 123 },
  { number: "123" }, { number: true }, { number: -1 }, { number: 1.5 }, { number: Number.MAX_SAFE_INTEGER + 1 },
]) assert.equal(parseVoidUiWave2HomeChainHeadV1(body), null);
assert.equal(parseVoidUiWave2HomeChainHeadV1({ number: 0 }), 0);
assert.equal(parseVoidUiWave2HomeChainHeadV1({ number: 123 }), 123);
assert.equal(parseVoidUiWave2HomeChainHeadV1({ number: 123, height: 456 }), 123);

const validPeer = { id: "peer-a", addr: "127.0.0.1:4700", listens: [], outbound: true };
assert.equal(parseVoidUiWave2HomePeerCountV1({ ok: true, connected: [] }), 0);
assert.equal(parseVoidUiWave2HomePeerCountV1({ ok: true, connected: [validPeer], knownAddrs: [] }), 1);
for (const body of [{}, { ok: false, connected: [] }, { ok: true }, { ok: true, connected: "bad" }, { ok: true, connected: [null] }, { ok: true, connected: [{ ...validPeer, unexpected: true }] }]) assert.equal(parseVoidUiWave2HomePeerCountV1(body), null);

const result = (status: number, body: unknown, ok = status >= 200 && status < 300): VoidUiWave2HomeSourceResultV1 => ({ ok, status, body });
const canonical = {
  health: result(200, { ok: true }),
  ready: result(200, { ready: true, txroot_live: 1, reasons: null, gap: 0 }),
  head: result(200, { number: 123 }),
  peers: result(200, { ok: true, connected: [validPeer] }),
};
assert.deepEqual(evaluateVoidUiWave2HomeOperationalEvidenceV1(canonical), { source_available: true, operational_ready: true, chain_head: 123, peer_count: 1 });

const malformedHead = evaluateVoidUiWave2HomeOperationalEvidenceV1({ ...canonical, head: result(200, {}) });
assert.equal(malformedHead.source_available, false); assert.equal(malformedHead.operational_ready, false); assert.equal(malformedHead.chain_head, null);
const aliasOnlyHead = evaluateVoidUiWave2HomeOperationalEvidenceV1({ ...canonical, head: result(200, { height: 123 }) });
assert.equal(aliasOnlyHead.source_available, false); assert.equal(aliasOnlyHead.operational_ready, false); assert.equal(aliasOnlyHead.chain_head, null);
const failedHealth = evaluateVoidUiWave2HomeOperationalEvidenceV1({ ...canonical, health: result(200, { ok: false }) });
assert.equal(failedHealth.source_available, false); assert.equal(failedHealth.operational_ready, false);

for (const readinessBody of [
  { ready: true, txroot_live: 1, reasons: "bad", gap: 0 },
  { ready: true, txroot_live: 1, reasons: [false], gap: 0 },
  { ready: "true", txroot_live: 1, reasons: [], gap: 0 },
  { ready: true, txroot_live: 1, reasons: [], gap: "0" },
  { ready: false, txroot_live: 0, reasons: null, gap: 2 },
]) {
  const malformedReady = evaluateVoidUiWave2HomeOperationalEvidenceV1({ ...canonical, ready: result(200, readinessBody) });
  assert.equal(malformedReady.source_available, false); assert.equal(malformedReady.operational_ready, false);
}
for (const readinessBody of [
  { ready: false, txroot_live: 1, reasons: [], gap: 0 },
  { ready: true, txroot_live: 0, reasons: [], gap: 0 },
  { ready: true, txroot_live: 1, reasons: ["txroot_live!=1"], gap: 0 },
  { ready: true, txroot_live: 1, reasons: [], gap: 1 },
]) {
  const notReady = evaluateVoidUiWave2HomeOperationalEvidenceV1({ ...canonical, ready: result(200, readinessBody) });
  assert.equal(notReady.source_available, true); assert.equal(notReady.operational_ready, false);
}
const malformedPeers = evaluateVoidUiWave2HomeOperationalEvidenceV1({ ...canonical, peers: result(200, { ok: true, connected: [null] }) });
assert.equal(malformedPeers.source_available, false); assert.equal(malformedPeers.operational_ready, false); assert.equal(malformedPeers.peer_count, null);

console.log("VOID_UI_WAVE2_HOME_EVIDENCE_TRUTH_V1_PROOF_GREEN");
console.log("health_ok_shape_required=true");
console.log("readiness_reasons_shape_strict=true");
console.log("readiness_healthy_null_reasons_normalized=true");
console.log("readiness_null_reasons_negative_states_rejected=true");
console.log("readiness_gap_shape_strict=true");
console.log("nonzero_gap_degrades_operational_readiness=true");
console.log("chain_head_required_for_source_availability=true");
console.log("chain_head_canonical_number_only=true");
console.log("chain_head_aliases_rejected=true");
console.log("peer_count_shape_strict=true");
console.log("malformed_http_200_evidence_degrades_readiness=true");
console.log("valid_negative_readiness_remains_available_but_not_ready=true");
console.log("authority_added=false");
