'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  MODE_LEGACY,
  MODE_VERIFIED_EPOCH,
  ValidatorRuntimeTruthSwitch,
} = require('../../src/runtime/validator_runtime_truth_switch.cjs');

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
      exportedAtUtc: '2026-04-19T16:44:58Z',
      bigintEncoding: 'decimal_string',
    },
    verification: {
      ok: true,
      verifiedAtUtc: '2026-04-19T16:44:59Z',
      verifiedRpcUrl: 'http://127.0.0.1:10035',
      verifiedChainId: 31337,
      sourceJson: '/tmp/example.json',
    },
  };
}

function makeLegacyProvider() {
  return {
    getModeLabel() { return 'legacy'; },
    getLoadedEpochs() { return [999]; },
    getLatestEpoch() { return 999; },
    getEpochSummary(epoch) {
      if (epoch !== 999) throw new Error(`legacy missing epoch ${epoch}`);
      return {
        epoch: 999,
        validatorCount: 1,
        totalPower: '123',
        published: false,
        publishedMatch: false,
        scheduleWindowLength: 2,
        sourceDir: 'legacy',
      };
    },
    getProposerForSlot(epoch, slot) {
      if (epoch !== 999) throw new Error(`legacy missing epoch ${epoch}`);
      return {
        epoch,
        slot,
        reward: '0x0000000000000000000000000000000000000LEG'.replace('LEG', '111'),
        effectivePower: '123',
        validatorCount: 1,
        totalPower: '123',
        published: false,
        publishedMatch: false,
      };
    },
    getScheduleWindow(epoch, startSlot, endSlotExclusive) {
      if (epoch !== 999) throw new Error(`legacy missing epoch ${epoch}`);
      const out = [];
      for (let s = startSlot; s < endSlotExclusive; s++) {
        out.push({
          epoch,
          slot: s,
          reward: '0x0000000000000000000000000000000000000111',
          effectivePower: '123',
        });
      }
      return out;
    },
  };
}

test('truth switch uses legacy provider when legacy mode is selected', () => {
  const sw = new ValidatorRuntimeTruthSwitch({
    mode: MODE_LEGACY,
    legacyProvider: makeLegacyProvider(),
  });

  assert.equal(sw.getMode(), MODE_LEGACY);
  assert.equal(sw.getModeLabel(), 'legacy');
  assert.deepEqual(sw.getLoadedEpochs(), [999]);
  assert.equal(sw.getLatestEpoch(), 999);
  assert.equal(sw.getEpochSummary(999).totalPower, '123');
  assert.equal(sw.getProposerForSlot(999, 7).reward, '0x0000000000000000000000000000000000000111');
  assert.equal(sw.getScheduleWindow(999, 2, 4).length, 2);
});

test('truth switch uses verified manifest runtime adapter when verified mode is selected', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-runtime-truth-switch-test-'));

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
        '0x000000000000000000000000000000000000B101',
      ],
    ), null, 2)
  );

  const sw = new ValidatorRuntimeTruthSwitch({
    mode: MODE_VERIFIED_EPOCH,
    sourceDir: dir,
  });

  assert.equal(sw.getMode(), MODE_VERIFIED_EPOCH);
  assert.equal(sw.getModeLabel(), 'verified_epoch_manifests');
  assert.deepEqual(sw.getLoadedEpochs(), [1, 2]);
  assert.equal(sw.getLatestEpoch(), 2);
  assert.equal(sw.getEpochSummary(1).totalPower, '4500000000000000000000');
  assert.equal(sw.getProposerForSlot(2, 0).reward, '0x000000000000000000000000000000000000B103');
});

test('truth switch fails hard when verified mode is selected without verified artifacts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-runtime-truth-switch-empty-'));
  assert.throws(
    () => new ValidatorRuntimeTruthSwitch({ mode: MODE_VERIFIED_EPOCH, sourceDir: dir }),
    /at least one verified epoch manifest/
  );
});
