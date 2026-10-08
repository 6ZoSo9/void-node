#!/usr/bin/env node
// Read-only source-level evidence census. Never authenticates a payment or
// reserves inventory. No credentials, ledger writes, RPC, or network calls.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

const MARKER = 'VOID_BUY_ORIGINAL_REQUEST_PRESTATE_CENSUS_V1';
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_REQUEST_ROWS = 100_000;
const REQUEST_ID = /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const BYTES32 = /^0x[0-9a-f]{64}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const RECEIPT = /^voidbclive1_[0-9a-f]{64}$/u;
const UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });
const AUTHORITY = Object.freeze({
  source_only_read_only_census: true,
  explicit_operator_file_path_required: true,
  request_ids_or_addresses_printed: false,
  historical_request_origin_authenticated: false,
  filesystem_rollback_prevention_proven: false,
  payment_verified_fsync_proven: false,
  launch_receipt_accepted_proven: false,
  capacity_lock_held: false,
  allocation_write: false,
  runtime_integration: false,
  wallet_or_signer_access: false,
  transaction_broadcast: false,
  chain2050_or_wc_write: false,
  presale_or_market_activation: false,
  funds_movement: false,
  production_gate_ready: false,
});
function fail(reason) {
  throw new Error('void_buy_request_prestate_' + reason);
}
function isRecord(row) {
  return row !== null && typeof row === 'object' && !Array.isArray(row);
}
function normalizedChain(value) {
  if (typeof value !== 'string') return '';
  const x = value.trim().toLowerCase();
  return x === 'eth' ? 'ethereum' : x;
}
function canonicalChainEvidence(row) {
  const chain = normalizedChain(row.source_chain);
  if (chain !== 'base' && chain !== 'ethereum') return false;
  for (const alias of ['payment_chain', 'chain']) {
    if (Object.hasOwn(row, alias) && normalizedChain(row[alias]) !== chain) return false;
  }
  return true;
}
function canonicalAddress(value) {
  return typeof value === 'string' &&
    ADDRESS.test(value.toLowerCase()) &&
    value.toLowerCase() !== '0x' + '0'.repeat(40);
}
function canonicalLaunch(value) {
  if (!isRecord(value)) return false;
  const keys = [
    'marker', 'version', 'coupled_launch_id', 'source_composition_id',
    'activation_generation', 'generation_tip_sha256',
    'activation_receipt_id', 'activation_receipt_sha256', 'expires_at_ms',
  ];
  if (Object.keys(value).sort().join('|') !== keys.sort().join('|')) return false;
  return value.marker === 'VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1' &&
    value.version === 1 &&
    [value.coupled_launch_id, value.source_composition_id, value.generation_tip_sha256]
      .every(x => typeof x === 'string' && SHA256.test(x)) &&
    typeof value.activation_generation === 'string' && BYTES32.test(value.activation_generation) &&
    typeof value.activation_receipt_id === 'string' && RECEIPT.test(value.activation_receipt_id) &&
    typeof value.activation_receipt_sha256 === 'string' && HEX64.test(value.activation_receipt_sha256) &&
    Number.isSafeInteger(value.expires_at_ms) && value.expires_at_ms > 0;
}
function sameIdentity(a, b) {
  return a.dev === b.dev && a.ino === b.ino && a.mode === b.mode &&
    a.nlink === b.nlink && a.size === b.size &&
    a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
}
function pinnedRead(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file) ||
      path.basename(file) !== 'requests.jsonl' || file !== path.normalize(file)) {
    fail('path_invalid');
  }
  // Symlink ancestors can redirect a pathname between preflight and open.
  // Reject them and revalidate their device/inode after the pinned read.
  const pieces = path.dirname(file).split(path.sep).filter(Boolean);
  const ancestors = [];
  let at = path.parse(file).root;
  for (const part of pieces) {
    at = path.join(at, part);
    const st = fs.lstatSync(at, { bigint: true });
    if (!st.isDirectory() || st.isSymbolicLink()) fail('ancestor_not_plain_directory');
    ancestors.push({ pathname: at, stat: st });
  }
  const beforePath = fs.lstatSync(file, { bigint: true });
  if (!beforePath.isFile() || beforePath.isSymbolicLink() || beforePath.nlink !== 1n ||
      beforePath.size > BigInt(MAX_FILE_BYTES)) fail('not_a_bounded_regular_file');
  const flags = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW |
    fs.constants.O_CLOEXEC | fs.constants.O_NONBLOCK;
  const fd = fs.openSync(file, flags);
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!sameIdentity(beforePath, before)) fail('file_not_path_bound');
    const size = Number(before.size);
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_FILE_BYTES) fail('file_unbounded');
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const read = fs.readSync(fd, bytes, offset, size - offset, offset);
      if (read <= 0) fail('short_read');
      offset += read;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const currentPath = fs.lstatSync(file, { bigint: true });
    if (!sameIdentity(before, after) || !sameIdentity(after, currentPath)) {
      fail('file_changed_or_rebound');
    }
    for (const ancestor of ancestors) {
      const current = fs.lstatSync(ancestor.pathname, { bigint: true });
      if (!current.isDirectory() || current.isSymbolicLink() ||
          current.ino !== ancestor.stat.ino || current.dev !== ancestor.stat.dev ||
          current.mode !== ancestor.stat.mode) fail('ancestor_changed_or_rebound');
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}
function parseCanonicalLines(bytes) {
  if (bytes.length === 0) return [];
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail('utf8_bom_not_canonical');
  }
  const text = UTF8.decode(bytes);
  if (!text.endsWith('\n') || text.includes('\r') || text.charCodeAt(0) === 0xfeff) {
    fail('jsonl_noncanonical_or_truncated');
  }
  const lines = text.slice(0, -1).split('\n');
  if (lines.length > MAX_REQUEST_ROWS) fail('too_many_rows');
  return lines.map(line => {
    if (!line) fail('empty_row');
    let row;
    try { row = JSON.parse(line); } catch { fail('invalid_json'); }
    if (!isRecord(row) || JSON.stringify(row) !== line) fail('noncanonical_row');
    if (typeof row.request_id !== 'string' || !REQUEST_ID.test(row.request_id)) {
      fail('request_id_invalid');
    }
    return { row, exactLine: line };
  });
}
function counts(bytes) {
  const lines = parseCanonicalLines(bytes);
  const byId = new Map();
  let laterContractBackfills = 0;
  let laterLaunchBackfills = 0;
  let laterSourceBackfills = 0;
  let repeatedExactRows = 0;
  let aliasConflicts = 0;
  let laterLaunchDrift = 0;
  for (const { row, exactLine } of lines) {
    const chainOk = canonicalChainEvidence(row);
    if (!chainOk) aliasConflicts++;
    const prev = byId.get(row.request_id);
    if (!prev) {
      byId.set(row.request_id, {
        firstChain: chainOk, firstToken: canonicalAddress(row.usdc_contract),
        firstLaunch: canonicalLaunch(row.launch_authority),
        tokenText: typeof row.usdc_contract === 'string' ? row.usdc_contract.toLowerCase() : '',
        launchText: JSON.stringify(row.launch_authority ?? null),
        seen: new Set([exactLine]),
      });
      continue;
    }
    if (prev.seen.has(exactLine)) repeatedExactRows++;
    prev.seen.add(exactLine);
    if (!prev.firstToken && canonicalAddress(row.usdc_contract)) laterContractBackfills++;
    if (!prev.firstLaunch && canonicalLaunch(row.launch_authority)) laterLaunchBackfills++;
    if (!prev.firstChain && chainOk) laterSourceBackfills++;
    if (prev.firstLaunch && JSON.stringify(row.launch_authority ?? null) !== prev.launchText) {
      laterLaunchDrift++;
    }
  }
  const all = [...byId.values()];
  const qualified = all.filter(x => x.firstChain && x.firstToken && x.firstLaunch).length;
  const result = {
    marker: MARKER,
    version: 1,
    status: 'SOURCE_ONLY_OBSERVATION_NOT_AUTHORITY',
    source_history_file_sha256: 'sha256:' + createHash('sha256').update(bytes).digest('hex'),
    request_history_bytes: bytes.length,
    request_history_rows: lines.length,
    distinct_request_ids: byId.size,
    first_rows_fully_shape_qualified: qualified,
    first_rows_missing_or_invalid_chain: all.filter(x => !x.firstChain).length,
    first_rows_missing_or_invalid_usdc_contract: all.filter(x => !x.firstToken).length,
    first_rows_missing_or_invalid_launch_authority: all.filter(x => !x.firstLaunch).length,
    first_rows_not_fully_shape_qualified: all.length - qualified,
    later_contract_backfill_rows_for_unqualified_first_rows: laterContractBackfills,
    later_launch_backfill_rows_for_unqualified_first_rows: laterLaunchBackfills,
    later_chain_backfill_rows_for_unqualified_first_rows: laterSourceBackfills,
    later_launch_change_rows_after_qualified_first_row: laterLaunchDrift,
    repeated_exact_request_snapshot_rows: repeatedExactRows,
    rows_with_missing_or_conflicting_chain_evidence: aliasConflicts,
    live_storage_identity_proven: false,
    historical_origin_proven: false,
    operator_observation_only: true,
    authority: AUTHORITY,
  };
  return Object.freeze(result);
}
function plan() {
  return {
    marker: MARKER, version: 1, mode: 'plan',
    source_history_read_performed: false, output_contains_buyer_details: false,
    accepts_only_absolute_requests_jsonl_path: true, status: 'HOLD_SOURCE_ONLY',
    authority: AUTHORITY,
  };
}
function main(args) {
  if (args.length === 0 || (args.length === 1 && args[0] === '--help')) {
    process.stdout.write('Read-only historical request first-row census\n' +
      '  --plan\n  --read-only /ABSOLUTE/PATH/requests.jsonl\n');
    return;
  }
  if (args.length === 1 && args[0] === '--plan') {
    process.stdout.write(JSON.stringify(plan()) + '\n');
    return;
  }
  if (args.length !== 2 || args[0] !== '--read-only') fail('invalid_arguments');
  process.stdout.write(JSON.stringify(counts(pinnedRead(args[1]))) + '\n');
}
try { main(process.argv.slice(2)); } catch (error) {
  const reason = error instanceof Error &&
    /^void_buy_request_prestate_[a-z0-9_]+$/u.test(error.message)
    ? error.message : 'void_buy_request_prestate_read_failed';
  // Deliberately do not echo filenames, addresses, request IDs, or exception
  // objects that could contain private ledger content.
  process.stderr.write(JSON.stringify({marker: MARKER,status: 'HOLD',reason,
    source_history_observed: false,authority: AUTHORITY}) + '\n');
  process.exitCode = 2;
}
