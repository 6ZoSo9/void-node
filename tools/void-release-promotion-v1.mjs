#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

const TOOL_MARKER = "VOID_RELEASE_PROMOTION_CONTROL_V1";
const PACKET_MARKER = "VOID_RELEASE_PUBLICATION_PACKET_V1";
const PUBLICATION_MARKER = "VOID_RELEASE_PUBLICATION_RECEIPT_V1";
const CANARY_MARKER = "VOID_RELEASE_CANARY_RECEIPT_V1";
const QUALIFICATION_MARKER = "VOID_RELEASE_QUALIFICATION_RECEIPT_V1";
const QUALIFICATION_APPROVAL_MARKER = "VOID_RELEASE_QUALIFICATION_APPROVAL_V1";
const LEDGER_MARKER = "VOID_RELEASE_PROMOTION_LEDGER_V1";
const RECEIPT_MARKER = "VOID_RELEASE_PROMOTION_RECEIPT_V1";

function fail(message, code = 1) {
  console.error(`ERROR: ${message}`);
  process.exit(code);
}
function stable(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
  return out;
}
function stableJson(value) { return JSON.stringify(stable(value), null, 2) + "\n"; }
function canonical(value) { return JSON.stringify(stable(value)); }
function shaBytes(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function shaFile(file) { return shaBytes(fs.readFileSync(file)); }
function shaObject(value) { return shaBytes(Buffer.from(canonical(value))); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function ensureDir(dir) { fs.mkdirSync(dir, {recursive: true}); }
function atomicWrite(file, content, mode = 0o644) {
  ensureDir(path.dirname(path.resolve(file)));
  const tmp = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.writeFileSync(tmp, content, {mode});
  fs.renameSync(tmp, file);
}
function atomicJson(file, value) { atomicWrite(file, stableJson(value)); }
function isHex(value, n) { return new RegExp(`^[0-9a-f]{${n}}$`).test(String(value || "")); }
function semver(value) {
  const s = String(value || "");
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(s)) fail(`invalid semantic version: ${s}`);
  return s;
}
function timestamp(value) {
  const s = String(value || process.env.VOID_RELEASE_TIMESTAMP || new Date().toISOString());
  if (Number.isNaN(Date.parse(s))) fail(`invalid timestamp: ${s}`);
  return new Date(s).toISOString();
}
function actor(value) { return String(value || process.env.GITHUB_ACTOR || process.env.USER || "void-release-operator"); }
function parseArgs(argv) {
  const command = argv.shift() || "help";
  const out = {command};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) fail(`unexpected positional argument: ${a}`);
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}
function need(opt, key) {
  const value = opt[key];
  if (value === undefined || value === true || value === "") fail(`--${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)} is required`);
  return String(value);
}
function parseSums(text) {
  const out = new Map();
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const m = raw.match(/^([0-9a-f]{64}) [ *](.+)$/);
    if (!m) fail(`invalid SHA256SUMS line: ${raw}`);
    if (out.has(m[2])) fail(`duplicate SHA256SUMS entry: ${m[2]}`);
    out.set(m[2], m[1]);
  }
  return out;
}
function validateBaseChannel(channel) {
  if (channel?.marker !== "VOID_PUBLIC_RELEASE_CHANNEL_V1" || channel?.schema_version !== 1) fail("invalid base channel marker/schema");
  if (!["stable", "candidate"].includes(channel.channel)) fail("invalid base channel name");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(channel.repository || "")) fail("invalid base channel repository");
  if (!/^release-v[0-9A-Za-z][0-9A-Za-z._+-]{0,127}$/.test(channel.release_tag || "")) fail("invalid base channel tag");
  if (!isHex(channel.release?.git_commit, 40)) fail("invalid base channel commit");
  semver(channel.release?.version);
  if (channel.release?.platform !== "linux-x64" || channel.release?.minimum_node_major !== 22) fail("unsupported release platform/runtime");
  for (const key of ["archive", "installer", "manifest", "checksums", "sbom"]) {
    if (!channel.assets?.[key]) fail(`base channel missing asset ${key}`);
  }
  for (const [key, asset] of Object.entries(channel.assets || {})) {
    if (!asset || typeof asset !== "object") fail(`invalid base channel asset ${key}`);
    if (!isHex(asset.sha256, 64)) fail(`invalid base channel asset hash ${key}`);
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes < 1) fail(`invalid base channel asset size ${key}`);
    if (!asset.name || String(asset.name).includes("/") || String(asset.name).includes("\\")) fail(`unsafe base channel asset name ${key}`);
  }
  if (channel.verification?.checksum_algorithm !== "sha256" || channel.verification?.github_attestation_required !== true) fail("base channel must require SHA-256 and GitHub attestations");
  if (channel.policy?.service_started_implicitly !== false || channel.policy?.guarded_lanes_activated !== false) fail("unsafe base channel policy");
  return channel;
}
function validatePacket(packet) {
  if (packet?.marker !== PACKET_MARKER || packet?.schema_version !== 1) fail("invalid publication packet marker/schema");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(packet.repository || "")) fail("invalid publication packet repository");
  semver(packet.version);
  if (packet.release_tag !== `release-v${packet.version}`) fail("publication packet tag/version mismatch");
  if (!isHex(packet.source_commit, 40)) fail("invalid publication packet source commit");
  for (const key of ["release_manifest_sha256", "checksums_sha256", "base_channel_sha256"]) if (!isHex(packet[key], 64)) fail(`invalid packet hash: ${key}`);
  validateBaseChannel(packet.base_channel);
  if (packet.base_channel.repository !== packet.repository || packet.base_channel.release_tag !== packet.release_tag || packet.base_channel.release.version !== packet.version || packet.base_channel.release.git_commit !== packet.source_commit) fail("publication packet base-channel binding mismatch");
  if (!Array.isArray(packet.assets) || packet.assets.length < 5) fail("publication packet requires at least five assets");
  const names = new Set();
  for (const asset of packet.assets) {
    if (!asset?.name || names.has(asset.name)) fail(`duplicate or missing packet asset: ${asset?.name}`);
    names.add(asset.name);
    if (!isHex(asset.sha256, 64) || !Number.isSafeInteger(asset.bytes) || asset.bytes < 1) fail(`invalid packet asset: ${asset.name}`);
  }
  if (packet.policy?.immutable_release_required !== true || packet.policy?.release_attestation_required !== true || packet.policy?.asset_attestations_required !== true || packet.policy?.tag_replacement_allowed !== false || packet.policy?.asset_replacement_allowed !== false || packet.policy?.stable_promotion_requires_canary !== true || packet.policy?.stable_promotion_requires_qualification !== true) fail("unsafe publication packet policy");
  return packet;
}
function validatePublication(receipt, packet) {
  if (receipt?.marker !== PUBLICATION_MARKER || receipt?.schema_version !== 1) fail("invalid publication receipt marker/schema");
  if (receipt.repository !== packet.repository || receipt.release_tag !== packet.release_tag || receipt.source_commit !== packet.source_commit) fail("publication receipt release binding mismatch");
  if (receipt.packet_sha256 !== shaObject(packet)) fail("publication receipt packet hash mismatch");
  if (receipt.release?.is_draft !== false || receipt.release?.is_immutable !== true) fail("release must be published and immutable");
  if (receipt.verification?.release_attestation_verified !== true || receipt.verification?.all_assets_verified !== true || receipt.verification?.artifact_attestations_verified !== true) fail("publication receipt verification is incomplete");
  const expected = new Map(packet.assets.map(a => [a.name, a]));
  if (!Array.isArray(receipt.verified_assets) || receipt.verified_assets.length !== expected.size) fail("publication receipt asset count mismatch");
  for (const asset of receipt.verified_assets) {
    const exp = expected.get(asset.name);
    if (!exp || asset.sha256 !== exp.sha256 || asset.bytes !== exp.bytes || asset.release_asset_verified !== true || asset.artifact_attestation_verified !== true) fail(`publication receipt asset mismatch: ${asset.name}`);
  }
  return receipt;
}
function validateCanary(receipt, packet, publication) {
  if (receipt?.marker !== CANARY_MARKER || receipt?.schema_version !== 1) fail("invalid canary receipt marker/schema");
  if (receipt.repository !== packet.repository || receipt.release_tag !== packet.release_tag || receipt.source_commit !== packet.source_commit) fail("canary receipt release binding mismatch");
  if (receipt.packet_sha256 !== shaObject(packet) || receipt.publication_receipt_sha256 !== shaObject(publication)) fail("canary receipt hash binding mismatch");
  if (receipt.passed !== true) fail("canary receipt is not green");
  for (const key of ["immutable_release", "release_attestation", "asset_attestations", "sha256", "install", "update_check", "health", "rollback"]) if (receipt.checks?.[key] !== true) fail(`canary check is not green: ${key}`);
  return receipt;
}
function validateQualification(receipt, packet, publication, canary) {
  if (receipt?.marker !== QUALIFICATION_MARKER || receipt?.schema_version !== 1) fail("invalid qualification receipt marker/schema");
  if (receipt.repository !== packet.repository || receipt.release_tag !== packet.release_tag || receipt.source_commit !== packet.source_commit) fail("qualification receipt release binding mismatch");
  if (receipt.packet_sha256 !== shaObject(packet) || receipt.publication_receipt_sha256 !== shaObject(publication) || receipt.canary_receipt_sha256 !== shaObject(canary)) fail("qualification receipt upstream hash binding mismatch");
  if (receipt.passed !== true || receipt.matrix_passed !== true) fail("qualification receipt is not green");
  if (!Array.isArray(receipt.results) || receipt.results.length < 8 || !Array.isArray(receipt.runner_ids) || receipt.runner_ids.length < 1) fail("qualification matrix is incomplete");
  const targets = new Set();
  for (const result of receipt.results) {
    if (!result?.target || targets.has(result.target) || result.passed !== true || !isHex(result.result_sha256, 64)) fail("invalid qualification matrix result");
    targets.add(result.target);
  }
  if (receipt.policy?.stable_promotion_allowed !== true || receipt.policy?.release_tag_published_by_qualification !== false || receipt.policy?.live_deployment !== false || receipt.policy?.guarded_lanes_activated !== false) fail("unsafe qualification receipt policy");
  return receipt;
}
function validateQualificationApproval(approval, qualification) {
  if (approval?.marker !== QUALIFICATION_APPROVAL_MARKER || approval?.schema_version !== 1) fail("invalid qualification approval marker/schema");
  if (approval.repository !== qualification.repository || approval.release_tag !== qualification.release_tag || approval.source_commit !== qualification.source_commit || approval.qualification_receipt_sha256 !== shaObject(qualification)) fail("qualification approval binding mismatch");
  if (approval.approved !== true || !approval.reviewer_id || qualification.runner_ids.includes(approval.reviewer_id)) fail("qualification approval is not independently approved");
  if (approval.policy?.stable_promotion_authorized !== true || approval.policy?.single_person_run_and_approve_allowed !== false || approval.policy?.release_tag_published_by_approval !== false || approval.policy?.live_deployment !== false || approval.policy?.guarded_lanes_activated !== false) fail("unsafe qualification approval policy");
  return approval;
}
function defaultState(repository) {
  return {
    marker: "VOID_RELEASE_PROMOTION_STATE_V1",
    schema_version: 1,
    repository,
    sequence: 0,
    frozen: false,
    freeze_reason: null,
    current_candidate: null,
    current_stable: null,
    previous_stable: null,
    releases: {},
    revocations: {},
    updated_at_utc: null,
  };
}
function ledgerPath(stateDir) { return path.join(stateDir, "promotion-ledger-v1.json"); }
function loadLedger(stateDir, repository = "") {
  const file = ledgerPath(stateDir);
  if (!fs.existsSync(file)) {
    if (!repository) fail(`promotion ledger does not exist: ${file}`);
    return {marker: LEDGER_MARKER, schema_version: 1, repository, history_tip_sha256: null, state: defaultState(repository), history: []};
  }
  const ledger = readJson(file);
  if (ledger?.marker !== LEDGER_MARKER || ledger?.schema_version !== 1) fail("invalid promotion ledger marker/schema");
  if (repository && ledger.repository !== repository) fail("promotion ledger repository mismatch");
  return ledger;
}
function publicRelease(entry) {
  const out = deepClone(entry);
  delete out.base_channel;
  return out;
}
function buildChannel(ledger, tag, channelName) {
  if (!tag) return null;
  const entry = ledger.state.releases[tag];
  if (!entry) fail(`state points to missing release: ${tag}`);
  if (ledger.state.revocations[tag]) fail(`state points to revoked release: ${tag}`);
  const channel = deepClone(entry.base_channel);
  channel.channel = channelName;
  channel.generated_at_utc = entry[`${channelName}_promoted_at_utc`] || entry.candidate_promoted_at_utc || entry.published_at_utc;
  channel.publication = {
    release_immutable: true,
    release_verified: true,
    release_attestation_required: true,
    artifact_attestations_required: true,
    revoked: false,
    publication_receipt_sha256: entry.publication_receipt_sha256,
  };
  channel.promotion = {
    state: channelName,
    ledger_sequence: ledger.state.sequence,
    ledger_tip_sha256: ledger.history_tip_sha256,
    canary_receipt_sha256: entry.canary_receipt_sha256 || null,
    qualification_receipt_sha256: entry.qualification_receipt_sha256 || null,
    qualification_approval_sha256: entry.qualification_approval_sha256 || null,
    promoted_at_utc: channel.generated_at_utc,
  };
  channel.policy.channel_frozen = ledger.state.frozen;
  return channel;
}
function expectedDerived(ledger) {
  const files = new Map();
  const candidate = buildChannel(ledger, ledger.state.current_candidate, "candidate");
  const stableChannel = buildChannel(ledger, ledger.state.current_stable, "stable");
  if (candidate) files.set("channels/candidate-v1.json", stableJson(candidate));
  if (stableChannel) files.set("channels/stable-v1.json", stableJson(stableChannel));
  const releases = Object.values(ledger.state.releases).map(publicRelease).sort((a, b) => a.release_tag.localeCompare(b.release_tag));
  files.set("release-history-v1.json", stableJson({
    marker: "VOID_PUBLIC_RELEASE_HISTORY_V1", schema_version: 1, repository: ledger.repository,
    current_candidate: ledger.state.current_candidate, current_stable: ledger.state.current_stable,
    previous_stable: ledger.state.previous_stable, frozen: ledger.state.frozen,
    history_tip_sha256: ledger.history_tip_sha256, releases,
    transitions: ledger.history.map(r => ({sequence: r.sequence, action: r.action, timestamp_utc: r.timestamp_utc, actor: r.actor, details: r.details, record_sha256: r.record_sha256})),
  }));
  files.set("release-revocations-v1.json", stableJson({
    marker: "VOID_PUBLIC_RELEASE_REVOCATIONS_V1", schema_version: 1, repository: ledger.repository,
    generated_at_utc: ledger.state.updated_at_utc, revocations: Object.values(ledger.state.revocations).sort((a, b) => a.release_tag.localeCompare(b.release_tag)),
  }));
  files.set("release-freeze-v1.json", stableJson({
    marker: "VOID_PUBLIC_RELEASE_FREEZE_V1", schema_version: 1, repository: ledger.repository,
    frozen: ledger.state.frozen, reason: ledger.state.freeze_reason, updated_at_utc: ledger.state.updated_at_utc,
    history_tip_sha256: ledger.history_tip_sha256,
  }));
  files.set("release-state-summary-v1.json", stableJson({
    marker: "VOID_PUBLIC_RELEASE_STATE_SUMMARY_V1", schema_version: 1, repository: ledger.repository,
    sequence: ledger.state.sequence, current_candidate: ledger.state.current_candidate,
    current_stable: ledger.state.current_stable, previous_stable: ledger.state.previous_stable,
    frozen: ledger.state.frozen, release_count: Object.keys(ledger.state.releases).length,
    revocation_count: Object.keys(ledger.state.revocations).length, history_tip_sha256: ledger.history_tip_sha256,
    updated_at_utc: ledger.state.updated_at_utc,
  }));
  for (const record of ledger.history) {
    const tag = String(record.details?.release_tag || "channel").replace(/[^0-9A-Za-z._-]+/g, "-");
    const name = `${String(record.sequence).padStart(6, "0")}-${record.action}-${tag}.json`;
    files.set(`receipts/${name}`, stableJson({
      marker: RECEIPT_MARKER, schema_version: 1, repository: ledger.repository,
      sequence: record.sequence, action: record.action, timestamp_utc: record.timestamp_utc,
      actor: record.actor, details: record.details, previous_record_sha256: record.previous_record_sha256,
      state_sha256: record.state_sha256, record_sha256: record.record_sha256,
    }));
  }
  return files;
}
function render(stateDir, ledger) {
  const derived = path.join(stateDir, "derived");
  fs.rmSync(derived, {recursive: true, force: true});
  ensureDir(derived);
  for (const [rel, content] of expectedDerived(ledger)) atomicWrite(path.join(derived, rel), content);
}
function verifyLedger(ledger) {
  if (ledger.repository !== ledger.state.repository) fail("ledger/state repository mismatch");
  let prev = null;
  let lastState = defaultState(ledger.repository);
  for (let i = 0; i < ledger.history.length; i++) {
    const record = ledger.history[i];
    if (record.sequence !== i + 1) fail(`history sequence mismatch at ${i + 1}`);
    if (record.previous_record_sha256 !== prev) fail(`history previous hash mismatch at ${record.sequence}`);
    if (shaObject(record.state) !== record.state_sha256) fail(`history state hash mismatch at ${record.sequence}`);
    const unsigned = deepClone(record); delete unsigned.record_sha256;
    if (shaObject(unsigned) !== record.record_sha256) fail(`history record hash mismatch at ${record.sequence}`);
    prev = record.record_sha256;
    lastState = record.state;
  }
  if (ledger.history_tip_sha256 !== prev) fail("ledger history tip mismatch");
  if (shaObject(lastState) !== shaObject(ledger.state)) fail("ledger final state does not match history");
  if (ledger.state.sequence !== ledger.history.length) fail("ledger state sequence mismatch");
  if (ledger.state.current_stable && ledger.state.revocations[ledger.state.current_stable]) fail("current stable release is revoked");
  if (ledger.state.current_candidate && ledger.state.revocations[ledger.state.current_candidate]) fail("current candidate release is revoked");
  if (ledger.state.current_stable) { const stable = ledger.state.releases[ledger.state.current_stable]; if (!stable || !isHex(stable.qualification_receipt_sha256, 64) || !isHex(stable.qualification_approval_sha256, 64)) fail("stable promotion requires qualification receipt and approval binding"); }
  return true;
}
function verifyDerived(stateDir, ledger) {
  const expected = expectedDerived(ledger);
  const root = path.join(stateDir, "derived");
  const actual = new Map();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else actual.set(path.relative(root, full).split(path.sep).join("/"), fs.readFileSync(full, "utf8"));
    }
  }
  walk(root);
  if (expected.size !== actual.size) fail(`derived file count mismatch: expected ${expected.size}, got ${actual.size}`);
  for (const [rel, content] of expected) if (actual.get(rel) !== content) fail(`derived file mismatch: ${rel}`);
}
function transition(stateDir, ledger, action, details, mutate, opt) {
  const next = deepClone(ledger.state);
  mutate(next);
  next.sequence = ledger.state.sequence + 1;
  next.updated_at_utc = timestamp(opt.timestamp);
  const record = {
    sequence: next.sequence,
    action,
    timestamp_utc: next.updated_at_utc,
    actor: actor(opt.actor),
    details: stable(details),
    previous_record_sha256: ledger.history_tip_sha256,
    state_sha256: shaObject(next),
    state: next,
  };
  record.record_sha256 = shaObject(record);
  const out = deepClone(ledger);
  out.state = next;
  out.history.push(record);
  out.history_tip_sha256 = record.record_sha256;
  verifyLedger(out);
  atomicJson(ledgerPath(stateDir), out);
  render(stateDir, out);
  return out;
}
function ensureRelease(state, packet, publication) {
  const tag = packet.release_tag;
  const packetHash = shaObject(packet), publicationHash = shaObject(publication);
  const existing = state.releases[tag];
  if (existing) {
    if (existing.packet_sha256 !== packetHash || existing.publication_receipt_sha256 !== publicationHash) fail(`release ${tag} already exists with different bindings`);
    return existing;
  }
  state.releases[tag] = {
    release_tag: tag, version: packet.version, source_commit: packet.source_commit,
    packet_sha256: packetHash, publication_receipt_sha256: publicationHash,
    published_at_utc: publication.published_at_utc,
    status: "published", ever_candidate: false, ever_stable: false,
    candidate_promoted_at_utc: null, stable_promoted_at_utc: null,
    canary_receipt_sha256: null, qualification_receipt_sha256: null, qualification_approval_sha256: null, base_channel: packet.base_channel,
  };
  return state.releases[tag];
}
function exactConfirm(actual, expected) { if (String(actual || "") !== expected) fail(`confirmation mismatch; expected exactly: ${expected}`); }
function outputPath(opt) { return path.resolve(need(opt, "out")); }

const opt = parseArgs(process.argv.slice(2));
if (opt.command === "help" || opt.command === "--help" || opt.command === "-h") {
  console.log(`VOID release publication/promotion control v1\n\nCommands:\n  prepare --release-manifest FILE --checksums FILE --channel-manifest FILE --asset-dir DIR --repository OWNER/REPO --version X.Y.Z --release-tag release-vX.Y.Z --source-commit SHA --out FILE\n  record-published --packet FILE --release-json FILE --out FILE\n  candidate --state-dir DIR --packet FILE --publication-receipt FILE --confirm PHRASE\n  stable --state-dir DIR --packet FILE --publication-receipt FILE --canary-receipt FILE --qualification-receipt FILE --qualification-approval FILE --confirm PHRASE\n  freeze|unfreeze --state-dir DIR --repository OWNER/REPO --reason TEXT --confirm PHRASE\n  revoke --state-dir DIR --release-tag TAG --reason TEXT [--rollback-to TAG] --confirm PHRASE\n  rollback --state-dir DIR --release-tag TAG --reason TEXT --confirm PHRASE\n  verify|render|status --state-dir DIR\n`);
  process.exit(0);
}

if (opt.command === "prepare") {
  const manifestFile = path.resolve(need(opt, "releaseManifest"));
  const sumsFile = path.resolve(need(opt, "checksums"));
  const channelFile = path.resolve(need(opt, "channelManifest"));
  const assetDir = path.resolve(need(opt, "assetDir"));
  const repository = need(opt, "repository");
  const version = semver(need(opt, "version"));
  const releaseTag = need(opt, "releaseTag");
  const sourceCommit = need(opt, "sourceCommit");
  if (releaseTag !== `release-v${version}`) fail("release tag must exactly match release-v<version>");
  if (!isHex(sourceCommit, 40)) fail("source commit must be 40 lowercase hexadecimal characters");
  const manifest = readJson(manifestFile);
  const channel = validateBaseChannel(readJson(channelFile));
  if (manifest?.marker !== "VOID_PUBLIC_RELEASE_MANIFEST_V1" || manifest?.schema_version !== 1) fail("invalid release manifest");
  if (manifest.version !== version || manifest.git_commit !== sourceCommit) fail("release manifest version/commit mismatch");
  if (channel.repository !== repository || channel.release_tag !== releaseTag || channel.release.version !== version || channel.release.git_commit !== sourceCommit) fail("channel/release identity mismatch");
  const sums = parseSums(fs.readFileSync(sumsFile, "utf8"));
  const assets = [];
  for (const asset of Object.values(channel.assets)) {
    const file = path.join(assetDir, asset.name);
    if (!fs.existsSync(file)) fail(`missing release asset: ${file}`);
    const digest = shaFile(file), bytes = fs.statSync(file).size;
    if (digest !== asset.sha256 || bytes !== asset.bytes) fail(`channel asset binding mismatch: ${asset.name}`);
    if (asset.name !== path.basename(sumsFile) && sums.get(asset.name) !== digest) fail(`SHA256SUMS does not bind asset: ${asset.name}`);
    assets.push({name: asset.name, sha256: digest, bytes});
  }
  assets.sort((a, b) => a.name.localeCompare(b.name));
  const packet = {
    marker: PACKET_MARKER, schema_version: 1, repository, version, release_tag: releaseTag,
    source_commit: sourceCommit, created_at_utc: timestamp(opt.timestamp),
    release_manifest_sha256: shaFile(manifestFile), checksums_sha256: shaFile(sumsFile),
    base_channel_sha256: shaFile(channelFile), release_manifest: manifest, base_channel: channel, assets,
    policy: {immutable_release_required: true, release_attestation_required: true, asset_attestations_required: true, tag_replacement_allowed: false, asset_replacement_allowed: false, stable_promotion_requires_canary: true, stable_promotion_requires_qualification: true, guarded_lanes_activated: false},
  };
  validatePacket(packet);
  atomicJson(outputPath(opt), packet);
  console.log(`${TOOL_MARKER}_PREPARE_GREEN`);
  console.log(`packet_sha256=${shaObject(packet)}`);
  process.exit(0);
}

if (opt.command === "record-published") {
  const packet = validatePacket(readJson(path.resolve(need(opt, "packet"))));
  const release = readJson(path.resolve(need(opt, "releaseJson")));
  if (release.tagName !== packet.release_tag || release.targetCommitish !== packet.source_commit) fail("published release tag/commit mismatch");
  if (release.isDraft !== false || release.isImmutable !== true) fail("published release must be non-draft and immutable");
  const verified = new Map((release.verified_assets || []).map(a => [a.name, a]));
  const verifiedAssets = [];
  for (const asset of packet.assets) {
    const got = verified.get(asset.name);
    if (!got || got.sha256 !== asset.sha256 || got.bytes !== asset.bytes || got.release_asset_verified !== true || got.artifact_attestation_verified !== true) fail(`release verification missing or mismatched: ${asset.name}`);
    verifiedAssets.push({name: asset.name, sha256: asset.sha256, bytes: asset.bytes, release_asset_verified: true, artifact_attestation_verified: true});
  }
  const receipt = {
    marker: PUBLICATION_MARKER, schema_version: 1, repository: packet.repository,
    release_tag: packet.release_tag, source_commit: packet.source_commit,
    packet_sha256: shaObject(packet), published_at_utc: timestamp(release.publishedAt || opt.timestamp),
    release: {url: release.url || null, is_draft: false, is_immutable: true, is_prerelease: Boolean(release.isPrerelease)},
    verified_assets: verifiedAssets,
    verification: {release_attestation_verified: release.release_attestation_verified === true, all_assets_verified: true, artifact_attestations_verified: verifiedAssets.every(a => a.artifact_attestation_verified)},
    guarded_lanes_activated: false,
  };
  validatePublication(receipt, packet);
  atomicJson(outputPath(opt), receipt);
  console.log(`${TOOL_MARKER}_PUBLICATION_RECEIPT_GREEN`);
  console.log(`publication_receipt_sha256=${shaObject(receipt)}`);
  process.exit(0);
}

const stateDir = opt.stateDir ? path.resolve(String(opt.stateDir)) : "";
if (["candidate", "stable", "freeze", "unfreeze", "revoke", "rollback", "verify", "render", "status"].includes(opt.command) && !stateDir) fail("--state-dir is required");

if (opt.command === "candidate" || opt.command === "stable") {
  const packet = validatePacket(readJson(path.resolve(need(opt, "packet"))));
  const publication = validatePublication(readJson(path.resolve(need(opt, "publicationReceipt"))), packet);
  let canary = null, qualification = null, qualificationApproval = null;
  if (opt.command === "stable") {
    canary = validateCanary(readJson(path.resolve(need(opt, "canaryReceipt"))), packet, publication);
    qualification = validateQualification(readJson(path.resolve(need(opt, "qualificationReceipt"))), packet, publication, canary);
    qualificationApproval = validateQualificationApproval(readJson(path.resolve(need(opt, "qualificationApproval"))), qualification);
  }
  exactConfirm(opt.confirm, `PROMOTE ${packet.release_tag} TO ${opt.command.toUpperCase()}`);
  let ledger = loadLedger(stateDir, packet.repository);
  verifyLedger(ledger);
  const existing = opt.command === "candidate" ? ledger.state.current_candidate : ledger.state.current_stable;
  if (existing === packet.release_tag) {
    const entry = ledger.state.releases[packet.release_tag];
    if (entry?.packet_sha256 === shaObject(packet) && entry?.publication_receipt_sha256 === shaObject(publication)) {
      console.log(`${TOOL_MARKER}_${opt.command.toUpperCase()}_IDEMPOTENT`); process.exit(0);
    }
  }
  if (ledger.state.frozen) fail("release channels are frozen");
  if (ledger.state.revocations[packet.release_tag]) fail("cannot promote a revoked release");
  if (opt.command === "stable" && ledger.state.current_candidate !== packet.release_tag) fail("stable promotion requires the exact current candidate");
  ledger = transition(stateDir, ledger, opt.command === "candidate" ? "promote-candidate" : "promote-stable", {
    release_tag: packet.release_tag, packet_sha256: shaObject(packet), publication_receipt_sha256: shaObject(publication), canary_receipt_sha256: canary ? shaObject(canary) : null, qualification_receipt_sha256: qualification ? shaObject(qualification) : null, qualification_approval_sha256: qualificationApproval ? shaObject(qualificationApproval) : null,
  }, state => {
    const entry = ensureRelease(state, packet, publication);
    if (opt.command === "candidate") {
      entry.status = "candidate"; entry.ever_candidate = true; entry.candidate_promoted_at_utc = timestamp(opt.timestamp);
      state.current_candidate = packet.release_tag;
    } else {
      entry.status = "stable"; entry.ever_candidate = true; entry.ever_stable = true;
      entry.canary_receipt_sha256 = shaObject(canary); entry.qualification_receipt_sha256 = shaObject(qualification); entry.qualification_approval_sha256 = shaObject(qualificationApproval); entry.stable_promoted_at_utc = timestamp(opt.timestamp);
      if (state.current_stable !== packet.release_tag) state.previous_stable = state.current_stable;
      state.current_stable = packet.release_tag;
      state.current_candidate = packet.release_tag;
    }
  }, opt);
  console.log(`${TOOL_MARKER}_${opt.command.toUpperCase()}_GREEN`);
  console.log(`history_tip_sha256=${ledger.history_tip_sha256}`);
  process.exit(0);
}

if (opt.command === "freeze" || opt.command === "unfreeze") {
  const repository = need(opt, "repository"), reason = need(opt, "reason");
  exactConfirm(opt.confirm, opt.command === "freeze" ? "FREEZE VOID RELEASE CHANNELS" : "UNFREEZE VOID RELEASE CHANNELS");
  let ledger = loadLedger(stateDir, repository); verifyLedger(ledger);
  const desired = opt.command === "freeze";
  if (ledger.state.frozen === desired) { console.log(`${TOOL_MARKER}_${opt.command.toUpperCase()}_IDEMPOTENT`); process.exit(0); }
  ledger = transition(stateDir, ledger, opt.command, {reason}, state => { state.frozen = desired; state.freeze_reason = desired ? reason : null; }, opt);
  console.log(`${TOOL_MARKER}_${opt.command.toUpperCase()}_GREEN`);
  console.log(`history_tip_sha256=${ledger.history_tip_sha256}`);
  process.exit(0);
}

if (opt.command === "revoke") {
  const tag = need(opt, "releaseTag"), reason = need(opt, "reason"), rollbackTo = opt.rollbackTo ? String(opt.rollbackTo) : "";
  exactConfirm(opt.confirm, `REVOKE ${tag}`);
  let ledger = loadLedger(stateDir); verifyLedger(ledger);
  if (!ledger.state.releases[tag]) fail(`unknown release: ${tag}`);
  if (ledger.state.revocations[tag]) { console.log(`${TOOL_MARKER}_REVOKE_IDEMPOTENT`); process.exit(0); }
  if (ledger.state.current_stable === tag) {
    if (!rollbackTo) fail("revoking the current stable release requires --rollback-to");
    const target = ledger.state.releases[rollbackTo];
    if (!target?.ever_stable || ledger.state.revocations[rollbackTo]) fail("rollback target must be a previously stable, non-revoked release");
  }
  ledger = transition(stateDir, ledger, "revoke", {release_tag: tag, reason, rollback_to: rollbackTo || null}, state => {
    state.revocations[tag] = {release_tag: tag, reason, revoked_at_utc: timestamp(opt.timestamp), actor: actor(opt.actor), rollback_to: rollbackTo || null};
    state.releases[tag].status = "revoked";
    if (state.current_candidate === tag) state.current_candidate = null;
    if (state.current_stable === tag) {
      state.previous_stable = tag;
      state.current_stable = rollbackTo;
      if (state.releases[rollbackTo]) state.releases[rollbackTo].status = "stable";
    }
  }, opt);
  console.log(`${TOOL_MARKER}_REVOKE_GREEN`);
  console.log(`history_tip_sha256=${ledger.history_tip_sha256}`);
  process.exit(0);
}

if (opt.command === "rollback") {
  const tag = need(opt, "releaseTag"), reason = need(opt, "reason");
  exactConfirm(opt.confirm, `ROLL BACK VOID STABLE TO ${tag}`);
  let ledger = loadLedger(stateDir); verifyLedger(ledger);
  const target = ledger.state.releases[tag];
  if (!target?.ever_stable) fail("rollback target was never stable");
  if (ledger.state.revocations[tag]) fail("cannot roll back to a revoked release");
  if (ledger.state.current_stable === tag) { console.log(`${TOOL_MARKER}_ROLLBACK_IDEMPOTENT`); process.exit(0); }
  ledger = transition(stateDir, ledger, "rollback", {release_tag: tag, reason}, state => {
    state.previous_stable = state.current_stable;
    state.current_stable = tag;
    state.releases[tag].status = "stable";
  }, opt);
  console.log(`${TOOL_MARKER}_ROLLBACK_GREEN`);
  console.log(`history_tip_sha256=${ledger.history_tip_sha256}`);
  process.exit(0);
}

if (opt.command === "render") {
  const ledger = loadLedger(stateDir); verifyLedger(ledger); render(stateDir, ledger);
  console.log(`${TOOL_MARKER}_RENDER_GREEN`); process.exit(0);
}
if (opt.command === "verify") {
  const ledger = loadLedger(stateDir); verifyLedger(ledger); verifyDerived(stateDir, ledger);
  console.log(`${TOOL_MARKER}_VERIFY_GREEN`); console.log(`history_tip_sha256=${ledger.history_tip_sha256}`); process.exit(0);
}
if (opt.command === "status") {
  const ledger = loadLedger(stateDir); verifyLedger(ledger);
  console.log(stableJson({marker: TOOL_MARKER, repository: ledger.repository, history_tip_sha256: ledger.history_tip_sha256, state: ledger.state}).trim());
  process.exit(0);
}

fail(`unknown command: ${opt.command}`);
