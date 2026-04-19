'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  validateVerifiedEpochManifest,
  loadVerifiedEpochManifestFile,
  loadVerifiedEpochManifestDir,
} = require('../../src/runtime/validator_epoch_manifest.cjs');

function sampleManifest(epoch, count, totalPower, rewardA, rewardB) {
  return {
    epoch,
    requestedStartSlot: 0,
    requestedEndSlotExclusive: 2,
    validatorCount: count,
    totalPower,
    validatorSetCommitment: '0x' + '11'.repeat(32),
    scheduleWindowCommitment: '0x' + '22'.repeat(32),
    epochWindowCommitment: '0x' + '33'.repeat(32),
    published: true,
    publishedMatch: true,
    publishedStartSlot: 0,
    publishedEndSlotExclusive: 2,
    publishedValidatorSetCommitment: '0x' + '11'.repeat(32),
    publishedScheduleWindowCommitment: '0x' + '22'.repeat(32),
    publishedEpochWindowCommitment: '0x' + '33'.repeat(32),
    scheduleWindow: [
      { slot: 0, reward: rewardA, effectivePower: totalPower },
      { slot: 1, reward: rewardB, effectivePower: totalPower },
    ],
    meta: {
      rpcUrl: 'http://127.0.0.1:10035',
      chainId: 31337,
      manifestView: '0x' + 'aa'.repeat(20),
      scheduleView: '0x' + 'bb'.repeat(20),
      exportedAtUtc: '2026-04-19T14:49:36Z',
      bigintEncoding: 'decimal_string',
    },
    verification: {
      ok: true,
      verifiedAtUtc: '2026-04-19T14:49:37Z',
      verifiedRpcUrl: 'http://127.0.0.1:10035',
      verifiedChainId: 31337,
      sourceJson: '/tmp/example.json',
    },
  };
}

test('validateVerifiedEpochManifest accepts decimal-string bigints', () => {
  const m = validateVerifiedEpochManifest(sampleManifest(
    1,
    3,
    '4500000000000000000000',
    '0x000000000000000000000000000000000000B102',
    '0x000000000000000000000000000000000000B101',
  ));
  assert.equal(m.epoch, 1);
  assert.equal(m.validatorCount, 3);
  assert.equal(m.totalPower.toString(), '4500000000000000000000');
  assert.equal(m.scheduleWindow[0].effectivePower.toString(), '4500000000000000000000');
});

test('validateVerifiedEpochManifest rejects numeric bigint fields', () => {
  const raw = sampleManifest(
    1,
    3,
    '4500000000000000000000',
    '0x000000000000000000000000000000000000B102',
    '0x000000000000000000000000000000000000B101',
  );
  raw.totalPower = 4500000000000000000000;
  assert.throws(() => validateVerifiedEpochManifest(raw), /decimal string/);
});

test('loadVerifiedEpochManifestDir sorts and loads manifests', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-epoch-manifest-node-test-'));

  fs.writeFileSync(
    path.join(dir, 'epoch-000002.manifest.verified.json'),
    JSON.stringify(sampleManifest(
      2,
      2,
      '2500000000000000000000',
      '0x000000000000000000000000000000000000B103',
      '0x000000000000000000000000000000000000B101',
    ), null, 2)
  );

  fs.writeFileSync(
    path.join(dir, 'epoch-000001.manifest.verified.json'),
    JSON.stringify(sampleManifest(
      1,
      3,
      '4500000000000000000000',
      '0x000000000000000000000000000000000000B102',
      '0x000000000000000000000000000000000000B101',
    ), null, 2)
  );

  const manifests = loadVerifiedEpochManifestDir(dir);
  assert.deepEqual(manifests.map((m) => m.epoch), [1, 2]);
  assert.equal(manifests[0].totalPower.toString(), '4500000000000000000000');
  assert.equal(manifests[1].totalPower.toString(), '2500000000000000000000');

  const one = loadVerifiedEpochManifestFile(path.join(dir, 'epoch-000001.manifest.verified.json'));
  assert.equal(one.epoch, 1);
});
