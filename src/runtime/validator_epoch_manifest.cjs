'use strict';

const fs = require('node:fs');
const path = require('node:path');

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function requireObject(name, v) {
  if (!isObject(v)) throw new Error(`${name} must be an object`);
  return v;
}

function requireBool(name, v) {
  if (typeof v !== 'boolean') throw new Error(`${name} must be a boolean`);
  return v;
}

function requireNonNegativeInt(name, v) {
  if (!Number.isInteger(v) || v < 0) throw new Error(`${name} must be a non-negative integer`);
  return v;
}

function requireDecimalString(name, v) {
  if (typeof v !== 'string' || !/^[0-9]+$/.test(v)) {
    throw new Error(`${name} must be a decimal string`);
  }
  return BigInt(v);
}

function requireHex(name, v, bytes) {
  const re = new RegExp(`^0x[0-9a-fA-F]{${bytes * 2}}$`);
  if (typeof v !== 'string' || !re.test(v)) {
    throw new Error(`${name} must be 0x + ${bytes * 2} hex chars`);
  }
  return v;
}

function requireAddress(name, v) {
  return requireHex(name, v, 20);
}

function validateVerifiedEpochManifest(raw, sourceLabel = 'manifest') {
  const m = requireObject(sourceLabel, raw);
  const meta = requireObject(`${sourceLabel}.meta`, m.meta);
  const verification = requireObject(`${sourceLabel}.verification`, m.verification);
  const scheduleWindowRaw = m.scheduleWindow;
  if (!Array.isArray(scheduleWindowRaw)) {
    throw new Error(`${sourceLabel}.scheduleWindow must be an array`);
  }

  const epoch = requireNonNegativeInt(`${sourceLabel}.epoch`, m.epoch);
  const requestedStartSlot = requireNonNegativeInt(`${sourceLabel}.requestedStartSlot`, m.requestedStartSlot);
  const requestedEndSlotExclusive = requireNonNegativeInt(`${sourceLabel}.requestedEndSlotExclusive`, m.requestedEndSlotExclusive);
  if (requestedEndSlotExclusive < requestedStartSlot) {
    throw new Error(`${sourceLabel}.requestedEndSlotExclusive must be >= requestedStartSlot`);
  }

  const validatorCount = requireNonNegativeInt(`${sourceLabel}.validatorCount`, m.validatorCount);
  const totalPower = requireDecimalString(`${sourceLabel}.totalPower`, m.totalPower);

  const validatorSetCommitment = requireHex(`${sourceLabel}.validatorSetCommitment`, m.validatorSetCommitment, 32);
  const scheduleWindowCommitment = requireHex(`${sourceLabel}.scheduleWindowCommitment`, m.scheduleWindowCommitment, 32);
  const epochWindowCommitment = requireHex(`${sourceLabel}.epochWindowCommitment`, m.epochWindowCommitment, 32);

  const published = requireBool(`${sourceLabel}.published`, m.published);
  const publishedMatch = requireBool(`${sourceLabel}.publishedMatch`, m.publishedMatch);
  const publishedStartSlot = requireNonNegativeInt(`${sourceLabel}.publishedStartSlot`, m.publishedStartSlot);
  const publishedEndSlotExclusive = requireNonNegativeInt(`${sourceLabel}.publishedEndSlotExclusive`, m.publishedEndSlotExclusive);

  const publishedValidatorSetCommitment = requireHex(`${sourceLabel}.publishedValidatorSetCommitment`, m.publishedValidatorSetCommitment, 32);
  const publishedScheduleWindowCommitment = requireHex(`${sourceLabel}.publishedScheduleWindowCommitment`, m.publishedScheduleWindowCommitment, 32);
  const publishedEpochWindowCommitment = requireHex(`${sourceLabel}.publishedEpochWindowCommitment`, m.publishedEpochWindowCommitment, 32);

  if (requireBool(`${sourceLabel}.verification.ok`, verification.ok) !== true) {
    throw new Error(`${sourceLabel}.verification.ok must be true`);
  }

  if (typeof meta.rpcUrl !== 'string' || meta.rpcUrl.length === 0) {
    throw new Error(`${sourceLabel}.meta.rpcUrl must be a non-empty string`);
  }
  if (typeof meta.manifestView !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(meta.manifestView)) {
    throw new Error(`${sourceLabel}.meta.manifestView must be an address`);
  }
  if (typeof meta.scheduleView !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(meta.scheduleView)) {
    throw new Error(`${sourceLabel}.meta.scheduleView must be an address`);
  }
  requireNonNegativeInt(`${sourceLabel}.meta.chainId`, meta.chainId);
  if (typeof meta.exportedAtUtc !== 'string' || meta.exportedAtUtc.length === 0) {
    throw new Error(`${sourceLabel}.meta.exportedAtUtc must be a string`);
  }

  const expectedLen = requestedEndSlotExclusive - requestedStartSlot;
  if (scheduleWindowRaw.length !== expectedLen) {
    throw new Error(`${sourceLabel}.scheduleWindow length mismatch: got=${scheduleWindowRaw.length} expected=${expectedLen}`);
  }

  const scheduleWindow = scheduleWindowRaw.map((entry, idx) => {
    const item = requireObject(`${sourceLabel}.scheduleWindow[${idx}]`, entry);
    const slot = requireNonNegativeInt(`${sourceLabel}.scheduleWindow[${idx}].slot`, item.slot);
    const reward = requireAddress(`${sourceLabel}.scheduleWindow[${idx}].reward`, item.reward);
    const effectivePower = requireDecimalString(`${sourceLabel}.scheduleWindow[${idx}].effectivePower`, item.effectivePower);
    if (slot !== requestedStartSlot + idx) {
      throw new Error(`${sourceLabel}.scheduleWindow[${idx}].slot mismatch: got=${slot} expected=${requestedStartSlot + idx}`);
    }
    return { slot, reward, effectivePower };
  });

  return {
    epoch,
    requestedStartSlot,
    requestedEndSlotExclusive,
    validatorCount,
    totalPower,
    validatorSetCommitment,
    scheduleWindowCommitment,
    epochWindowCommitment,
    published,
    publishedMatch,
    publishedStartSlot,
    publishedEndSlotExclusive,
    publishedValidatorSetCommitment,
    publishedScheduleWindowCommitment,
    publishedEpochWindowCommitment,
    scheduleWindow,
    meta,
    verification,
    raw: m,
  };
}

function loadVerifiedEpochManifestFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const raw = JSON.parse(text);
  return validateVerifiedEpochManifest(raw, path.resolve(filePath));
}

function loadVerifiedEpochManifestDir(dirPath) {
  const dir = path.resolve(dirPath);
  const files = fs.readdirSync(dir)
    .filter((name) => name.endsWith('.manifest.verified.json'))
    .sort();

  const manifests = files.map((name) => loadVerifiedEpochManifestFile(path.join(dir, name)));

  for (let i = 1; i < manifests.length; i++) {
    if (manifests[i - 1].epoch >= manifests[i].epoch) {
      throw new Error(`manifest epochs must be strictly increasing: prev=${manifests[i - 1].epoch} next=${manifests[i].epoch}`);
    }
  }

  return manifests;
}

module.exports = {
  validateVerifiedEpochManifest,
  loadVerifiedEpochManifestFile,
  loadVerifiedEpochManifestDir,
};
