import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const homePath = path.join(root, 'public/void-app-wave1-v1/assets/js/home-live.js');
const homeSource = fs.readFileSync(homePath, 'utf8');

const beginMarker = '// HOME_NETWORK_PRESENTATION_HELPERS_V1_BEGIN';
const endMarker = '// HOME_NETWORK_PRESENTATION_HELPERS_V1_END';
const begin = homeSource.indexOf(beginMarker);
const end = homeSource.indexOf(endMarker);
assert.notEqual(begin, -1, 'Home presentation helper begin marker must exist');
assert.ok(end > begin, 'Home presentation helper end marker must follow begin marker');

const helperSource = homeSource.slice(begin + beginMarker.length, end);
assert.doesNotMatch(helperSource, /\bNumber\s*\(/, 'Home numeric presentation must not coerce unknown evidence');

const sandbox = {};
vm.runInNewContext(
  `${helperSource}\n` +
  'globalThis.__voidHomePresentationV1 = { formatNumber, presentHomeNetworkEvidenceV1 };',
  sandbox,
  { filename: 'home-live-presentation-helper-v1.js' },
);

const { formatNumber, presentHomeNetworkEvidenceV1 } = sandbox.__voidHomePresentationV1;

assert.equal(formatNumber(null), '—');
assert.equal(formatNumber(undefined), '—');
assert.equal(formatNumber('0'), '—');
assert.equal(formatNumber(false), '—');
assert.equal(formatNumber(-1), '—');
assert.equal(formatNumber(0), '0');
assert.equal(formatNumber(1234), '1,234');

const unavailable = presentHomeNetworkEvidenceV1({
  peer_count: null,
  expected_peer_count: null,
  chain_head: null,
});
assert.equal(unavailable.peerCount, null);
assert.equal(unavailable.expectedPeerCount, null);
assert.equal(unavailable.chainHead, null);
assert.equal(unavailable.peersDisplay, '—');
assert.equal(unavailable.meshDisplay, 'Unavailable');
assert.equal(unavailable.networkContextMeta, 'Peers unavailable · block —');
assert.equal(unavailable.footerPeerMeta, 'peers unavailable');

const legitimateZero = presentHomeNetworkEvidenceV1({
  peer_count: 0,
  expected_peer_count: 0,
  chain_head: 0,
});
assert.equal(legitimateZero.peerCount, 0);
assert.equal(legitimateZero.expectedPeerCount, 0);
assert.equal(legitimateZero.chainHead, 0);
assert.equal(legitimateZero.peersDisplay, '0 / 0');
assert.equal(legitimateZero.meshDisplay, 'Aligned');
assert.equal(legitimateZero.networkContextMeta, '0 peers · block 0');
assert.equal(legitimateZero.footerPeerMeta, '0 peers');

const partial = presentHomeNetworkEvidenceV1({
  peer_count: 1,
  expected_peer_count: 2,
  chain_head: 2050,
});
assert.equal(partial.peersDisplay, '1 / 2');
assert.equal(partial.meshDisplay, 'Partial');
assert.equal(partial.networkContextMeta, '1 peers · block 2,050');

for (const malformed of [
  { peer_count: '0', expected_peer_count: 0, chain_head: 0 },
  { peer_count: 0, expected_peer_count: '0', chain_head: 0 },
  { peer_count: 0, expected_peer_count: 0, chain_head: '0' },
  { peer_count: -1, expected_peer_count: 0, chain_head: 0 },
  { peer_count: 0.5, expected_peer_count: 0, chain_head: 0 },
]) {
  const rendered = presentHomeNetworkEvidenceV1(malformed);
  if (malformed.peer_count !== 0 || malformed.expected_peer_count !== 0) {
    assert.notEqual(rendered.meshDisplay, 'Aligned');
  }
  if (malformed.chain_head !== 0) {
    assert.equal(rendered.chainHead, null);
  }
}

assert.doesNotMatch(homeSource, /network\.peer_count\s*\?\?\s*0/);
assert.doesNotMatch(homeSource, /network\.expected_peer_count\s*\?\?\s*2/);
assert.match(homeSource, /meshDisplay:\s*peerPairAvailable/);
assert.match(homeSource, /peerCount === null \? 'Peers unavailable'/);

console.log('VOID_APP_HOME_NULLABLE_EVIDENCE_PRESENTATION_V1_GREEN');
console.log('null_chain_head_presented_unavailable=1');
console.log('null_peer_evidence_presented_unavailable=1');
console.log('legitimate_zero_preserved=1');
console.log('mesh_alignment_requires_valid_peer_pair=1');
console.log('numeric_coercion_absent=1');
