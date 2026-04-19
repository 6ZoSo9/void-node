'use strict';

const path = require('node:path');
const { loadValidatorEpochRuntimeAdapter } = require('./validator_epoch_runtime_adapter.cjs');

const MODE_LEGACY = 'legacy';
const MODE_VERIFIED_EPOCH = 'verified_epoch_manifests';

function normalizeMode(mode) {
  const out = String(mode || '').trim();
  if (out !== MODE_LEGACY && out !== MODE_VERIFIED_EPOCH) {
    throw new Error(`unsupported validator runtime truth mode: ${out}`);
  }
  return out;
}

function requireFn(obj, name) {
  if (!obj || typeof obj[name] !== 'function') {
    throw new Error(`provider is missing required function: ${name}`);
  }
}

function validateLegacyProvider(provider) {
  requireFn(provider, 'getModeLabel');
  requireFn(provider, 'getLoadedEpochs');
  requireFn(provider, 'getLatestEpoch');
  requireFn(provider, 'getEpochSummary');
  requireFn(provider, 'getProposerForSlot');
  requireFn(provider, 'getScheduleWindow');
  return provider;
}

class ValidatorRuntimeTruthSwitch {
  constructor(opts) {
    const o = opts || {};
    this.mode = normalizeMode(o.mode);
    this.sourceDir = o.sourceDir ? path.resolve(o.sourceDir) : null;
    this.legacyProvider = null;
    this.verifiedProvider = null;

    if (this.mode === MODE_LEGACY) {
      this.legacyProvider = validateLegacyProvider(o.legacyProvider);
      return;
    }

    if (!this.sourceDir) {
      throw new Error('verified_epoch_manifests mode requires sourceDir');
    }

    this.verifiedProvider = loadValidatorEpochRuntimeAdapter(this.sourceDir);
    const loaded = this.verifiedProvider.getLoadedEpochs();
    if (!Array.isArray(loaded) || loaded.length === 0) {
      throw new Error('verified_epoch_manifests mode requires at least one verified manifest');
    }
  }

  getMode() {
    return this.mode;
  }

  getModeLabel() {
    return this.mode === MODE_LEGACY ? 'legacy' : 'verified_epoch_manifests';
  }

  getLoadedEpochs() {
    if (this.mode === MODE_LEGACY) return this.legacyProvider.getLoadedEpochs();
    return this.verifiedProvider.getLoadedEpochs();
  }

  getLatestEpoch() {
    if (this.mode === MODE_LEGACY) return this.legacyProvider.getLatestEpoch();
    return this.verifiedProvider.getLatestEpoch();
  }

  getEpochSummary(epoch) {
    if (this.mode === MODE_LEGACY) return this.legacyProvider.getEpochSummary(epoch);
    return this.verifiedProvider.getEpochSummary(epoch);
  }

  getProposerForSlot(epoch, slot) {
    if (this.mode === MODE_LEGACY) return this.legacyProvider.getProposerForSlot(epoch, slot);
    return this.verifiedProvider.getProposerForSlot(epoch, slot);
  }

  getScheduleWindow(epoch, startSlot, endSlotExclusive) {
    if (this.mode === MODE_LEGACY) return this.legacyProvider.getScheduleWindow(epoch, startSlot, endSlotExclusive);
    return this.verifiedProvider.getScheduleWindow(epoch, startSlot, endSlotExclusive);
  }
}

module.exports = {
  MODE_LEGACY,
  MODE_VERIFIED_EPOCH,
  ValidatorRuntimeTruthSwitch,
};
