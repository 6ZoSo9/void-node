'use strict';

const path = require('node:path');
const { loadVerifiedEpochManifestDir } = require('./validator_epoch_manifest.cjs');

class ValidatorEpochRuntimeAdapter {
  constructor(manifests, sourceDir) {
    if (!Array.isArray(manifests) || manifests.length === 0) {
      throw new Error('at least one verified epoch manifest is required');
    }

    this.sourceDir = path.resolve(sourceDir);
    this.manifests = manifests.slice().sort((a, b) => a.epoch - b.epoch);
    this.byEpoch = new Map();

    for (const manifest of this.manifests) {
      if (this.byEpoch.has(manifest.epoch)) {
        throw new Error(`duplicate epoch manifest loaded: ${manifest.epoch}`);
      }
      this.byEpoch.set(manifest.epoch, manifest);
    }
  }

  getLoadedEpochs() {
    return this.manifests.map((m) => m.epoch);
  }

  getLatestEpoch() {
    return this.manifests[this.manifests.length - 1].epoch;
  }

  requireEpoch(epoch) {
    if (!Number.isInteger(epoch) || epoch < 0) {
      throw new Error(`epoch must be a non-negative integer: ${epoch}`);
    }
    const manifest = this.byEpoch.get(epoch);
    if (!manifest) {
      throw new Error(`no verified manifest loaded for epoch ${epoch}`);
    }
    return manifest;
  }

  getEpochSummary(epoch) {
    const manifest = this.requireEpoch(epoch);
    return {
      epoch: manifest.epoch,
      requestedStartSlot: manifest.requestedStartSlot,
      requestedEndSlotExclusive: manifest.requestedEndSlotExclusive,
      validatorCount: manifest.validatorCount,
      totalPower: manifest.totalPower.toString(),
      published: manifest.published,
      publishedMatch: manifest.publishedMatch,
      scheduleWindowLength: manifest.scheduleWindow.length,
      sourceDir: this.sourceDir,
    };
  }

  getProposerForSlot(epoch, slot) {
    const manifest = this.requireEpoch(epoch);
    if (!Number.isInteger(slot) || slot < 0) {
      throw new Error(`slot must be a non-negative integer: ${slot}`);
    }
    if (slot < manifest.requestedStartSlot || slot >= manifest.requestedEndSlotExclusive) {
      throw new Error(
        `slot ${slot} is outside loaded window [${manifest.requestedStartSlot}, ${manifest.requestedEndSlotExclusive}) for epoch ${epoch}`
      );
    }

    const idx = slot - manifest.requestedStartSlot;
    const proposer = manifest.scheduleWindow[idx];
    if (!proposer) {
      throw new Error(`missing proposer entry for epoch ${epoch} slot ${slot}`);
    }

    return {
      epoch: manifest.epoch,
      slot,
      reward: proposer.reward,
      effectivePower: proposer.effectivePower.toString(),
      validatorCount: manifest.validatorCount,
      totalPower: manifest.totalPower.toString(),
      published: manifest.published,
      publishedMatch: manifest.publishedMatch,
    };
  }

  getScheduleWindow(epoch, startSlot, endSlotExclusive) {
    const manifest = this.requireEpoch(epoch);
    if (!Number.isInteger(startSlot) || startSlot < 0) {
      throw new Error(`startSlot must be a non-negative integer: ${startSlot}`);
    }
    if (!Number.isInteger(endSlotExclusive) || endSlotExclusive < startSlot) {
      throw new Error(`endSlotExclusive must be >= startSlot: start=${startSlot} end=${endSlotExclusive}`);
    }
    if (startSlot < manifest.requestedStartSlot || endSlotExclusive > manifest.requestedEndSlotExclusive) {
      throw new Error(
        `requested window [${startSlot}, ${endSlotExclusive}) is outside loaded window ` +
        `[${manifest.requestedStartSlot}, ${manifest.requestedEndSlotExclusive}) for epoch ${epoch}`
      );
    }

    const begin = startSlot - manifest.requestedStartSlot;
    const end = endSlotExclusive - manifest.requestedStartSlot;

    return manifest.scheduleWindow.slice(begin, end).map((entry) => ({
      epoch: manifest.epoch,
      slot: entry.slot,
      reward: entry.reward,
      effectivePower: entry.effectivePower.toString(),
    }));
  }
}

function loadValidatorEpochRuntimeAdapter(dirPath) {
  const resolved = path.resolve(dirPath);
  const manifests = loadVerifiedEpochManifestDir(resolved);
  return new ValidatorEpochRuntimeAdapter(manifests, resolved);
}

module.exports = {
  ValidatorEpochRuntimeAdapter,
  loadValidatorEpochRuntimeAdapter,
};
