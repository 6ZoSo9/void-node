'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  loadValidatorEpochRuntimeAdapter,
  ValidatorEpochRuntimeAdapter,
} = require('../../src/runtime/validator_epoch_runtime_adapter.cjs');

function sampleManifest(epoch, count, totalPower, slotRewards) {
  return {
    epoch,
    requestedStartSlot: 0,
    requestedEndSlotExclusive: slotRewards.length,
    validatorCount: count,
    totalPower,
    validatorSetCommitment: '0x' + '11'.repeat(32),
    scheduleWindowCommitment: '0x' + '22'.repeat(32),
    epochWindowCommitment: '0x' + '33'.repeat(32),
    published: true,
    publishedMatch: true,
    publishedStartSlot: 0,
    publishedEndSlotExclusive: slotRewards.length,
    publishedValidatorSetCommitment: '0x' + '11'.repeat(32),
    publishedScheduleWindowCommitment: '0x' + '22'.repeat(32),
    publishedEpochWindowCommitment: '0x' + '33'.repeat(32),
    scheduleWindow: slotRewards.map((reward, idx) => ({
      slot: idx,
      reward,
      effectivePower: totalPower,
    })),
    meta: {
      rpcUrl: 'http://127.0.0.1:10035',
      chainId: 31337,
      manifestView: '0x' + 'aa'.repeat(20),
      scheduleView: '0x' + 'bb'.repeat(20),
      exportedAtUtc: '2026-04-19T15:09:52Z',
      bigintEncoding: 'decimal_string',
    },
    verification: {
      ok: true,
      verifiedAtUtc: '2026-04-19T15:09:53Z',
      verifiedRpcUrl: 'http://127.0.0.1:10035',
      verifiedChainId: 31337,
      sourceJson: '/tmp/example.json',
    },
  };
}

test('runtime adapter loads sorted epochs and latest epoch', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-runtime-adapter-test-'));

  fs.writeFileSync(
    path.join(dir, 'epoch-000002.manifest.verified.json'),
    JSON.stringify(sampleManifest(
      2,
      2,
      '2500000000000000000000',
      [
        '0x000000000000000000000000000000000000B103',
        '0x000000000000000000000000000000000000B101',
      ],
    ), null, 2)
  );

  fs.writeFileSync(
    path.join(dir, 'epoch-000001.manifest.verified.json'),
    JSON.stringify(sampleManifest(
      1,
      3,
      '4500000000000000000000',
      [
        '0x000000000000000000000000000000000000B102',
        '0x000000000000000000000000000000000000B102',
      ],
    ), null, 2)
  );

  const adapter = loadValidatorEpochRuntimeAdapter(dir);
  assert.deepEqual(adapter.getLoadedEpochs(), [1, 2]);
  assert.equal(adapter.getLatestEpoch(), 2);
});

test('runtime adapter returns proposer and schedule window', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-runtime-adapter-test-'));

  fs.writeFileSync(
    path.join(dir, 'epoch-000001.manifest.verified.json'),
    JSON.stringify(sampleManifest(
      1,
      3,
      '4500000000000000000000',
      [
        '0x000000000000000000000000000000000000B102',
        '0x000000000000000000000000000000000000B101',
        '0x000000000000000000000000000000000000B103',
      ],
    ), null, 2)
  );

  const adapter = loadValidatorEpochRuntimeAdapter(dir);

  const p = adapter.getProposerForSlot(1, 1);
  assert.equal(p.epoch, 1);
  assert.equal(p.slot, 1);
  assert.equal(p.reward, '0x000000000000000000000000000000000000B101');
  assert.equal(p.effectivePower, '4500000000000000000000');

  const w = adapter.getScheduleWindow(1, 1, 3);
  assert.deepEqual(
    w.map((x) => [x.slot, x.reward]),
    [
      [1, '0x000000000000000000000000000000000000B101'],
      [2, '0x000000000000000000000000000000000000B103'],
    ],
  );
});

test('runtime adapter fails hard on empty or missing epoch', () => {
  assert.throws(() => new ValidatorEpochRuntimeAdapter([], process.cwd()), /at least one verified epoch manifest/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-runtime-adapter-test-'));
  fs.writeFileSync(
    path.join(dir, 'epoch-000001.manifest.verified.json'),
    JSON.stringify(sampleManifest(
      1,
      3,
      '4500000000000000000000',
      ['0x000000000000000000000000000000000000B102'],
    ), null, 2)
  );

  const adapter = loadValidatorEpochRuntimeAdapter(dir);
  assert.throws(() => adapter.getProposerForSlot(2, 0), /no verified manifest loaded for epoch 2/);
  assert.throws(() => adapter.getProposerForSlot(1, 5), /outside loaded window/);
});
