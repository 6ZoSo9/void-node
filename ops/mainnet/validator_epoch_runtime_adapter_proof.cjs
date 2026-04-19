'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const { loadValidatorEpochRuntimeAdapter } = require('../../src/runtime/validator_epoch_runtime_adapter.cjs');

const importedDir = process.argv[2];
if (!importedDir) {
  throw new Error('usage: node ops/mainnet/validator_epoch_runtime_adapter_proof.cjs <imported-dir>');
}

const adapter = loadValidatorEpochRuntimeAdapter(importedDir);

const summary = {
  ok: true,
  loadedEpochs: adapter.getLoadedEpochs(),
  latestEpoch: adapter.getLatestEpoch(),
  epoch1: adapter.getEpochSummary(1),
  epoch2: adapter.getEpochSummary(2),
  proposerEpoch1Slot0: adapter.getProposerForSlot(1, 0),
  proposerEpoch1Slot7: adapter.getProposerForSlot(1, 7),
  proposerEpoch2Slot0: adapter.getProposerForSlot(2, 0),
  proposerEpoch2Slot7: adapter.getProposerForSlot(2, 7),
  epoch2Window0to4: adapter.getScheduleWindow(2, 0, 4),
};

assert.deepEqual(summary.loadedEpochs, [1, 2]);
assert.equal(summary.latestEpoch, 2);
assert.equal(summary.epoch1.validatorCount, 3);
assert.equal(summary.epoch1.totalPower, '4500000000000000000000');
assert.equal(summary.epoch2.validatorCount, 2);
assert.equal(summary.epoch2.totalPower, '2500000000000000000000');
assert.equal(summary.proposerEpoch1Slot0.reward, '0x000000000000000000000000000000000000B102');
assert.equal(summary.proposerEpoch2Slot0.reward, '0x000000000000000000000000000000000000B103');

const outPath = path.join(importedDir, 'runtime_adapter_summary.json');
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');

console.log('[ok] loaded runtime adapter from', importedDir);
console.log('[ok] wrote', outPath);
console.log(JSON.stringify(summary, null, 2));
