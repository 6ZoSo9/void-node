'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const { loadVerifiedEpochManifestDir } = require('../../src/runtime/validator_epoch_manifest.cjs');

const importedDir = process.argv[2];
if (!importedDir) {
  throw new Error('usage: node ops/mainnet/validator_epoch_manifest_node_ingest_proof.cjs <imported-dir>');
}

const manifests = loadVerifiedEpochManifestDir(importedDir);
assert.equal(manifests.length, 2);
assert.deepEqual(manifests.map((m) => m.epoch), [1, 2]);

assert.equal(manifests[0].validatorCount, 3);
assert.equal(manifests[0].totalPower.toString(), '4500000000000000000000');
assert.equal(manifests[0].published, true);
assert.equal(manifests[0].publishedMatch, true);
assert.equal(manifests[0].scheduleWindow.length, 8);

assert.equal(manifests[1].validatorCount, 2);
assert.equal(manifests[1].totalPower.toString(), '2500000000000000000000');
assert.equal(manifests[1].published, true);
assert.equal(manifests[1].publishedMatch, true);
assert.equal(manifests[1].scheduleWindow.length, 8);

const summary = {
  ok: true,
  epochs: manifests.map((m) => ({
    epoch: m.epoch,
    validatorCount: m.validatorCount,
    totalPower: m.totalPower.toString(),
    published: m.published,
    publishedMatch: m.publishedMatch,
    scheduleWindowLength: m.scheduleWindow.length,
    firstReward: m.scheduleWindow[0] ? m.scheduleWindow[0].reward : null,
  })),
};

const outPath = path.join(importedDir, 'node_ingest_summary.json');
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');

console.log('[ok] loaded verified manifests from', importedDir);
console.log('[ok] wrote', outPath);
console.log(JSON.stringify(summary, null, 2));
