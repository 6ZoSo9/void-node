#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  VALIDATOR_READINESS_ENDPOINT,
  VALIDATOR_READINESS_MARKER,
  requestValidatorReadinessSnapshotV1,
  validateValidatorReadinessSnapshotV1,
} from '../public/void-app-wave1-v1/assets/js/validate-live.js';
import {
  createNetworkRequestOwnerV1,
} from '../public/void-app-wave1-v1/assets/js/network-live.js';

const repo = process.cwd();
const matrixPath = path.join(
  repo,
  'public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json',
);
const validateSourcePath = path.join(
  repo,
  'public/void-app-wave1-v1/assets/js/validate-live.js',
);
const viewsPath = path.join(
  repo,
  'public/void-app-wave1-v1/assets/js/views.js',
);
const indexPath = path.join(
  repo,
  'public/void-app-wave1-v1/index.html',
);

const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const validateSource = fs.readFileSync(validateSourcePath, 'utf8');
const viewsSource = fs.readFileSync(viewsPath, 'utf8');
const indexSource = fs.readFileSync(indexPath, 'utf8');

assert.equal(matrix.marker, VALIDATOR_READINESS_MARKER);
assert.equal(matrix.route, VALIDATOR_READINESS_ENDPOINT);
assert.equal(
  validateValidatorReadinessSnapshotV1(matrix),
  matrix,
);

const extraTop = structuredClone(matrix);
extraTop.unreviewed = true;
assert.throws(
  () => validateValidatorReadinessSnapshotV1(extraTop),
  /shape mismatch/u,
);

const elevatedSubmit = structuredClone(matrix);
elevatedSubmit.candidate_readiness.public_submit_enabled = true;
assert.throws(
  () => validateValidatorReadinessSnapshotV1(elevatedSubmit),
  /elevated/u,
);

const elevatedBoundary = structuredClone(matrix);
elevatedBoundary.boundary.wallet_connect = true;
assert.throws(
  () => validateValidatorReadinessSnapshotV1(elevatedBoundary),
  /elevated/u,
);

const reordered = structuredClone(matrix);
reordered.candidate_readiness.matrix_items.reverse();
assert.throws(
  () => validateValidatorReadinessSnapshotV1(reordered),
  /identity mismatch/u,
);

let observedRequest = null;
const origin = 'https://validator-proof.invalid';
const owner = createNetworkRequestOwnerV1(async (input, init) => {
  observedRequest = { input: String(input), init };
  const response = new Response(
    JSON.stringify(matrix),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    },
  );
  Object.defineProperty(response, 'url', {
    configurable: true,
    value: new URL(VALIDATOR_READINESS_ENDPOINT, origin).href,
  });
  return response;
});

const controller = new AbortController();
const fetched = await requestValidatorReadinessSnapshotV1(
  owner,
  {
    origin,
    signal: controller.signal,
  },
);
assert.equal(fetched.marker, VALIDATOR_READINESS_MARKER);
assert.equal(owner.isActive(), false);

assert.equal(observedRequest.input, VALIDATOR_READINESS_ENDPOINT);
assert.equal(observedRequest.init.method, 'GET');
assert.deepEqual(
  observedRequest.init.headers,
  { Accept: 'application/json' },
);
assert.equal(observedRequest.init.cache, 'no-store');
assert.equal(observedRequest.init.credentials, 'omit');
assert.equal(observedRequest.init.redirect, 'error');
assert.equal(observedRequest.init.mode, 'same-origin');
assert.equal(observedRequest.init.referrerPolicy, 'no-referrer');
assert.notEqual(observedRequest.init.signal, controller.signal);
assert.equal(observedRequest.init.signal instanceof AbortSignal, true);
assert.equal(observedRequest.init.signal.aborted, false);

const oversizedOwner = createNetworkRequestOwnerV1(async () => {
  const response = new Response(
    'x'.repeat((128 * 1024) + 1),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    },
  );
  Object.defineProperty(response, 'url', {
    configurable: true,
    value: new URL(VALIDATOR_READINESS_ENDPOINT, origin).href,
  });
  return response;
});
await assert.rejects(
  () => requestValidatorReadinessSnapshotV1(
    oversizedOwner,
    {
      origin,
      signal: new AbortController().signal,
    },
  ),
  /exceeds byte limit/u,
);
assert.equal(oversizedOwner.isActive(), false);

const mismatchedUrlOwner = createNetworkRequestOwnerV1(async () => {
  const response = new Response(
    JSON.stringify(matrix),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    },
  );
  Object.defineProperty(response, 'url', {
    configurable: true,
    value: new URL('/wrong-validator-route.json', origin).href,
  });
  return response;
});
await assert.rejects(
  () => requestValidatorReadinessSnapshotV1(
    mismatchedUrlOwner,
    {
      origin,
      signal: new AbortController().signal,
    },
  ),
  /final URL mismatch/u,
);
assert.equal(mismatchedUrlOwner.isActive(), false);

for (const needle of [
  "cache: 'no-store'",
  "credentials: 'omit'",
  "redirect: 'error'",
  "mode: 'same-origin'",
  "referrerPolicy: 'no-referrer'",
  'readBoundedNetworkJsonV1(',
  'createNetworkRequestOwnerV1()',
  '.textContent =',
]) {
  assert.ok(
    validateSource.includes(needle),
    `validate transport/render contract missing: ${needle}`,
  );
}
assert.equal(validateSource.includes('.innerHTML'), false);
assert.equal(validateSource.includes('insertAdjacentHTML'), false);

assert.ok(viewsSource.includes('validate: () => validateView(),'));
const validateViewStart = viewsSource.indexOf('function validateView() {');
const validateViewEnd = viewsSource.indexOf(
  '\nfunction placeholderView(',
  validateViewStart,
);
assert.ok(validateViewStart >= 0 && validateViewEnd > validateViewStart);
const validateViewSource = viewsSource.slice(
  validateViewStart,
  validateViewEnd,
);
for (const forbidden of [
  '<button',
  '<form',
  'data-demo-toast',
  'Connect Wallet</button>',
  'Stake</button>',
  'Submit</button>',
  'Activate</button>',
]) {
  assert.equal(
    validateViewSource.includes(forbidden),
    false,
    `Validate view exposed an action surface: ${forbidden}`,
  );
}
for (const required of [
  'data-validate-view',
  'data-validate-items',
  'data-validate-registration',
  'data-validate-intake',
  'data-validate-submit',
  'data-validate-wallet',
  'data-validate-stake-lock',
  'data-validate-admission',
  'data-validate-set-write',
]) {
  assert.ok(
    validateViewSource.includes(required),
    `Validate view marker missing: ${required}`,
  );
}

assert.ok(
  indexSource.includes(
    '<script type="module" src="./assets/js/validate-live.js"></script>',
  ),
);

console.log('VOID_APP_VALIDATE_READONLY_READINESS_V1_GREEN');
console.log('sealed_matrix_schema_validated=true');
console.log('unknown_or_elevated_authority_rejected=true');
console.log('same_origin_get=true');
console.log('cache_no_store=true');
console.log('credentials_omit=true');
console.log('redirect_error=true');
console.log('referrer_no_referrer=true');
console.log('owned_response_lifetime=true');
console.log('hard_response_byte_ceiling=true');
console.log('dynamic_text_content_only=true');
console.log('candidate_actions_exposed=false');
console.log('wallet_or_signer_access=false');
console.log('transaction_or_funds_movement=false');
console.log('validator_mutation=false');
