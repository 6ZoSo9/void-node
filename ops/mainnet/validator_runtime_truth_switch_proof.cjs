'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const {
  MODE_LEGACY,
  MODE_VERIFIED_EPOCH,
  ValidatorRuntimeTruthSwitch,
} = require('../../src/runtime/validator_runtime_truth_switch.cjs');

const importedDir = process.argv[2];
if (!importedDir) {
  throw new Error('usage: node ops/mainnet/validator_runtime_truth_switch_proof.cjs <imported-dir>');
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
        requestedStartSlot: 0,
        requestedEndSlotExclusive: 4,
        validatorCount: 1,
        totalPower: '123',
        published: false,
        publishedMatch: false,
        scheduleWindowLength: 4,
        sourceDir: 'legacy',
      };
    },
    getProposerForSlot(epoch, slot) {
      if (epoch !== 999) throw new Error(`legacy missing epoch ${epoch}`);
      return {
        epoch,
        slot,
        reward: '0x0000000000000000000000000000000000000111',
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

const verifiedSwitch = new ValidatorRuntimeTruthSwitch({
  mode: MODE_VERIFIED_EPOCH,
  sourceDir: importedDir,
});

const legacySwitch = new ValidatorRuntimeTruthSwitch({
  mode: MODE_LEGACY,
  legacyProvider: makeLegacyProvider(),
});

const summary = {
  ok: true,
  verifiedMode: verifiedSwitch.getModeLabel(),
  verifiedLoadedEpochs: verifiedSwitch.getLoadedEpochs(),
  verifiedLatestEpoch: verifiedSwitch.getLatestEpoch(),
  verifiedEpoch1: verifiedSwitch.getEpochSummary(1),
  verifiedEpoch2: verifiedSwitch.getEpochSummary(2),
  verifiedEpoch2Slot0: verifiedSwitch.getProposerForSlot(2, 0),
  verifiedEpoch2Window0to4: verifiedSwitch.getScheduleWindow(2, 0, 4),
  legacyMode: legacySwitch.getModeLabel(),
  legacyLoadedEpochs: legacySwitch.getLoadedEpochs(),
  legacyLatestEpoch: legacySwitch.getLatestEpoch(),
  legacyEpoch999: legacySwitch.getEpochSummary(999),
  legacySlot3: legacySwitch.getProposerForSlot(999, 3),
};

assert.equal(summary.verifiedMode, 'verified_epoch_manifests');
assert.deepEqual(summary.verifiedLoadedEpochs, [1, 2]);
assert.equal(summary.verifiedLatestEpoch, 2);
assert.equal(summary.verifiedEpoch2Slot0.reward, '0x000000000000000000000000000000000000B103');

assert.equal(summary.legacyMode, 'legacy');
assert.deepEqual(summary.legacyLoadedEpochs, [999]);
assert.equal(summary.legacyLatestEpoch, 999);
assert.equal(summary.legacySlot3.reward, '0x0000000000000000000000000000000000000111');

const outPath = path.join(importedDir, 'runtime_truth_switch_summary.json');
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');

console.log('[ok] loaded runtime truth switch using verified and legacy modes');
console.log('[ok] wrote', outPath);
console.log(JSON.stringify(summary, null, 2));
