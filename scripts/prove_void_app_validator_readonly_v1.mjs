import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MAX_VALIDATE_RESPONSE_BYTES,
  VALIDATE_ENDPOINT,
  VALIDATE_MARKER,
  readBoundedValidatorJsonV1,
  validateValidatorReadinessSnapshotV1,
} from '../public/void-app-wave1-v1/assets/js/validate-live.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(root, 'public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json');
const validatePath = path.join(root, 'public/void-app-wave1-v1/assets/js/validate-live.js');
const homePath = path.join(root, 'public/void-app-wave1-v1/assets/js/home-live.js');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const validateSource = fs.readFileSync(validatePath, 'utf8');
const homeSource = fs.readFileSync(homePath, 'utf8');

const clone = (value) => structuredClone(value);
const reject = (mutator) => {
  const value = clone(fixture);
  mutator(value);
  assert.throws(() => validateValidatorReadinessSnapshotV1(value));
};

const validated = validateValidatorReadinessSnapshotV1(fixture);
assert.equal(validated.marker, VALIDATE_MARKER);
assert.equal(validated.route, VALIDATE_ENDPOINT);
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
assert.doesNotMatch(validateSource, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
assert.doesNotMatch(validateSource, /window\.ethereum|eth_sendTransaction|eth_sendRawTransaction|personal_sign|wallet_requestPermissions/);
assert.doesNotMatch(validateSource, /\/validator\/submit|\/stake\/lock|\/validator-set\/write/);

console.log('VOID_APP_VALIDATOR_READONLY_V1_PROOF_GREEN');
console.log('same_origin_get_only=1');
console.log('bounded_response_bytes=131072');
console.log('candidate_requirements=8');
console.log('minimum_candidate_stake_policy_void=10000');
console.log('candidate_intake_open=0');
console.log('stake_lock_enabled=0');
console.log('active_validator_admission_enabled=0');
console.log('wallet_connect_enabled=0');
console.log('validator_set_write_enabled=0');
