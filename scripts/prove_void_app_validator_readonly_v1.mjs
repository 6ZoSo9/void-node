import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MAX_VALIDATE_RESPONSE_BYTES,
  VALIDATE_ENDPOINT,
  VALIDATE_MARKER,
  VALIDATE_SOURCE_ROUTE,
  readBoundedValidatorJsonV1,
  validateValidatorReadinessSnapshotV1,
} from '../public/void-app-wave1-v1/assets/js/validate-live.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(root, 'public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json');
const appFixturePath = path.join(root, 'public/void-app-wave1-v1/assets/data/mainnet0-validator-candidate-readiness-matrix-hold-v1.json');
const foundationPath = path.join(root, 'src/ui/void_app_wave1_foundation_v1.ts');
const validatePath = path.join(root, 'public/void-app-wave1-v1/assets/js/validate-live.js');
const homePath = path.join(root, 'public/void-app-wave1-v1/assets/js/home-live.js');
const fixtureSource = fs.readFileSync(fixturePath, 'utf8');
const appFixtureSource = fs.readFileSync(appFixturePath, 'utf8');
const foundationSource = fs.readFileSync(foundationPath, 'utf8');
const fixture = JSON.parse(fixtureSource);
const validateSource = fs.readFileSync(validatePath, 'utf8');
const homeSource = fs.readFileSync(homePath, 'utf8');

const clone = (value) => structuredClone(value);
const reject = (mutator) => {
  const value = clone(fixture);
  mutator(value);
  assert.throws(() => validateValidatorReadinessSnapshotV1(value));
};

assert.equal(appFixtureSource, fixtureSource, 'App-local readiness matrix must remain byte-identical to canonical public source');
assert.equal(VALIDATE_ENDPOINT, '/app/assets/data/mainnet0-validator-candidate-readiness-matrix-hold-v1.json');
assert.equal(VALIDATE_SOURCE_ROUTE, '/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json');
assert.match(foundationSource, /const ROUTE_PREFIX = "\/app";/);
assert.match(foundationSource, /"void-app-wave1-v1"/);
assert.match(foundationSource, /express\.static\(shellDir/);

const validated = validateValidatorReadinessSnapshotV1(fixture);
assert.equal(validated.marker, VALIDATE_MARKER);
assert.equal(validated.route, VALIDATE_SOURCE_ROUTE);
assert.equal(validated.candidate_readiness.minimum_public_candidate_stake_policy_void, 10000);
assert.equal(validated.candidate_readiness.matrix_item_count, 8);
assert.equal(validated.candidate_readiness.matrix_items.length, 8);
assert.equal(validated.candidate_readiness.candidate_intake_open, false);
assert.equal(validated.candidate_readiness.stake_lock_enabled, false);
assert.equal(validated.candidate_readiness.active_validator_admission_enabled, false);
assert.equal(validated.boundary.wallet_connect, false);
assert.equal(validated.boundary.validator_set_write, false);

reject((value) => { value.unknown = true; });
reject((value) => { value.candidate_readiness.candidate_intake_open = true; });
reject((value) => { value.candidate_readiness.wallet_connect_enabled = true; });
reject((value) => { value.candidate_readiness.stake_lock_enabled = true; });
reject((value) => { value.candidate_readiness.active_validator_admission_enabled = true; });
reject((value) => { value.candidate_readiness.minimum_public_candidate_stake_policy_void = 9999; });
reject((value) => { value.candidate_readiness.matrix_items.pop(); value.candidate_readiness.matrix_item_count = 7; });
reject((value) => { value.candidate_readiness.matrix_items[0].extra = true; });
reject((value) => { value.candidate_readiness.matrix_items[1].id = 'public_node_identity'; });
reject((value) => { value.boundary.wallet_connect = true; });
reject((value) => { value.boundary.runtime_mutation_route = true; });
reject((value) => { value.readiness_assertions.public_safe_read_only = false; });

const responseFor = (bytes, contentType = 'application/json') => new Response(
  new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  }),
  { headers: { 'content-type': contentType } },
);

const encoded = new TextEncoder().encode(JSON.stringify(fixture));
const parsed = await readBoundedValidatorJsonV1(responseFor(encoded));
assert.equal(parsed.marker, VALIDATE_MARKER);

const tooLarge = new Uint8Array(MAX_VALIDATE_RESPONSE_BYTES + 1);
await assert.rejects(() => readBoundedValidatorJsonV1(responseFor(tooLarge)), /exceeds byte limit/);
await assert.rejects(() => readBoundedValidatorJsonV1(new Response(null)), /not stream-readable/);
await assert.rejects(() => readBoundedValidatorJsonV1(responseFor(new TextEncoder().encode('{bad json'))), SyntaxError);

assert.equal(homeSource.split("import './validate-live.js';").length - 1, 1);
assert.match(validateSource, /method:\s*'GET'/);
assert.match(validateSource, /cache:\s*'no-store'/);
assert.match(validateSource, /credentials:\s*'omit'/);
assert.match(validateSource, /redirect:\s*'error'/);
assert.match(validateSource, /mode:\s*'same-origin'/);
assert.match(validateSource, /referrerPolicy:\s*'no-referrer'/);
assert.match(validateSource, /MAX_VALIDATE_RESPONSE_BYTES\s*=\s*128\s*\*\s*1024/);
assert.match(validateSource, /data-validate-view/);
assert.match(validateSource, /data-validate-refresh/);
assert.match(validateSource, /No validator authority/);
assert.match(validateSource, /finally\s*\{\s*reader\.releaseLock\(\);\s*\}/);
assert.doesNotMatch(validateSource, /\bcatch\s*\{\s*\}/);
assert.doesNotMatch(validateSource, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
assert.doesNotMatch(validateSource, /window\.ethereum|eth_sendTransaction|eth_sendRawTransaction|personal_sign|wallet_requestPermissions/);
assert.doesNotMatch(validateSource, /\/validator\/submit|\/stake\/lock|\/validator-set\/write/);

const loadingStart = validateSource.indexOf('const setLoading = () => {');
const loadingEnd = validateSource.indexOf('\n\nconst setError =', loadingStart);
assert.notEqual(loadingStart, -1, 'setLoading must exist');
assert.notEqual(loadingEnd, -1, 'setLoading must have a bounded source slice');
const loadingSource = validateSource.slice(loadingStart, loadingEnd);
assert.match(loadingSource, /setText\('\[data-validate-min-stake\]', '—'\)/);
for (const marker of [
  '[data-validate-registration]',
  '[data-validate-intake]',
  '[data-validate-stake-lock]',
  '[data-validate-admission]',
]) {
  assert.match(loadingSource, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(loadingSource, /setText\(selector, 'HOLD'\)/);
assert.match(loadingSource, /Refreshing readiness evidence/);
assert.match(loadingSource, /Previous validated values are withheld until the new public matrix validates\./);
assert.match(
  validateSource,
  /const serial = \+\+requestSerial;\s*setLoading\(\);\s*try \{\s*const response = await fetch/s,
);

console.log('VOID_APP_VALIDATOR_READONLY_V1_PROOF_GREEN');
console.log('same_origin_get_only=1');
console.log('loopback_app_origin_matrix_route=1');
console.log('canonical_matrix_mirror_byte_identical=1');
console.log('bounded_response_bytes=131072');
console.log('candidate_requirements=8');
console.log('minimum_candidate_stake_policy_void=10000');
console.log('candidate_intake_open=0');
console.log('stake_lock_enabled=0');
console.log('active_validator_admission_enabled=0');
console.log('wallet_connect_enabled=0');
console.log('validator_set_write_enabled=0');
console.log('refresh_stale_values_withheld=1');
