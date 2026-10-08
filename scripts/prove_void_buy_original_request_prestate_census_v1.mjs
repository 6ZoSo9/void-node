#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tool = path.join(root, 'tools/void-buy-original-request-prestate-census-v1.mjs');
const toolSource = fs.readFileSync(tool, 'utf8');
for (const forbidden of [/\b(?:writeFileSync|appendFileSync|mkdirSync|chmodSync|chownSync|renameSync|unlinkSync|execSync|spawnSync|fetch\(|http\.request)\b/u]) {
  assert.doesNotMatch(toolSource, forbidden, 'census must not contain write or network primitives');
}
const invoke = (...args) => spawnSync(process.execPath, [tool, ...args], {
  encoding: 'utf8', timeout: 5000,
});
const parse = (x) => JSON.parse(x);
const plan = invoke('--plan');
assert.equal(plan.status, 0, plan.stderr);
assert.equal(parse(plan.stdout).source_history_read_performed, false);
assert.equal(parse(plan.stdout).status, 'HOLD_SOURCE_ONLY');
assert.equal(parse(plan.stdout).authority.production_gate_ready, false);
const invalid = invoke('--apply');
assert.equal(invalid.status, 2);
assert.equal(invalid.stdout, '');
assert.equal(parse(invalid.stderr).status, 'HOLD');
const fake = { marker: 'VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1', version: 1,
  coupled_launch_id: 'sha256:' + 'a'.repeat(64),
  source_composition_id: 'sha256:' + 'b'.repeat(64),
  activation_generation: '0x' + 'c'.repeat(64),
  generation_tip_sha256: 'sha256:' + 'd'.repeat(64),
  activation_receipt_id: 'voidbclive1_' + 'e'.repeat(64),
  activation_receipt_sha256: 'f'.repeat(64),
  expires_at_ms: 1810000000000,
};
const qualified = {
  request_id:'buyvoid_new_aaaaaaaa', source_chain:'base', payment_chain:'base',
  tx_hash:'0x'+'1'.repeat(64), quoted_void:'2', usdc_amount:'1',
  usdc_contract:'0x'+'2'.repeat(40), launch_authority:fake,
  receive_address:'0x'+'3'.repeat(40), delivery_address:'0x'+'4'.repeat(40),
};
const legacy = {
  ...qualified, request_id:'buyvoid_old_bbbbbbbb', tx_hash:'0x'+'5'.repeat(64),
  usdc_contract: undefined, launch_authority: undefined,
};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'void-buy-prestate-census-v1-'));
const p = path.join(dir,'requests.jsonl');
const write = rows => fs.writeFileSync(p, rows.map(row => JSON.stringify(row)).join('\n')+'\n', {mode:0o600});
const expectObserved = () => {
  const r = invoke('--read-only',p);
  assert.equal(r.status,0,r.stderr);
  assert.equal(r.stderr,'');
  const report=parse(r.stdout);
  assert.equal(report.status,'SOURCE_ONLY_OBSERVATION_NOT_AUTHORITY');
  assert.equal(report.authority.production_gate_ready,false);
  assert.equal(report.authority.request_ids_or_addresses_printed,false);
  assert.equal(report.historical_origin_proven,false);
  for(const sensitive of [qualified.request_id,legacy.request_id,qualified.tx_hash,
    qualified.delivery_address, fake.activation_receipt_id]) {
    assert.equal(r.stdout.includes(sensitive),false,'private details must not be printed');
  }
  return report;
};
const expectHold = pattern => {
  const r=invoke('--read-only',p);
  assert.equal(r.status,2,'expected HOLD on invalid original history');
  assert.equal(r.stdout,'');
  assert.match(parse(r.stderr).reason, pattern);
};
try {
  fs.chmodSync(dir,0o700);
  write([qualified,legacy]);
  let report=expectObserved();
  assert.equal(report.request_history_rows,2);
  assert.equal(report.distinct_request_ids,2);
  assert.equal(report.first_rows_fully_shape_qualified,1);
  assert.equal(report.first_rows_not_fully_shape_qualified,1);
  assert.equal(report.first_rows_missing_or_invalid_usdc_contract,1);
  assert.equal(report.first_rows_missing_or_invalid_launch_authority,1);
  assert.match(report.source_history_file_sha256,/^sha256:[0-9a-f]{64}$/u);
  const after={...legacy,usdc_contract:qualified.usdc_contract,
    launch_authority:fake,status:'late-backfill'};
  write([qualified,legacy,after]);
  report=expectObserved();
  assert.equal(report.distinct_request_ids,2);
  assert.equal(report.first_rows_fully_shape_qualified,1,'backfill must not qualify old first row');
  assert.equal(report.later_contract_backfill_rows_for_unqualified_first_rows,1);
  assert.equal(report.later_launch_backfill_rows_for_unqualified_first_rows,1);
  write([qualified,{...qualified,status:'observed'},qualified]);
  report=expectObserved();
  assert.equal(report.repeated_exact_request_snapshot_rows,1,'nonconsecutive replay must be counted');
  write([qualified,{...qualified,payment_chain:'ethereum'}]);
  report=expectObserved();
  assert.equal(report.rows_with_missing_or_conflicting_chain_evidence,1);
  assert.equal(report.first_rows_fully_shape_qualified,1);
  // Review P2: each later row may be internally canonical while changing
  // immutable first-row source-chain and token policy evidence.
  write([qualified, {...qualified, source_chain:'ethereum',
    payment_chain:'ethereum',usdc_contract:'0x'+'6'.repeat(40)}]);
  report=expectObserved();
  assert.equal(report.first_rows_fully_shape_qualified,1);
  assert.equal(report.rows_with_missing_or_conflicting_chain_evidence,0);
  assert.equal(report.later_source_chain_drift_rows_after_qualified_first_row,1);
  assert.equal(report.later_usdc_contract_drift_rows_after_qualified_first_row,1);
  write([qualified, {...qualified,usdc_contract:'0x'+'7'.repeat(40)}]);
  report=expectObserved();
  assert.equal(report.later_source_chain_drift_rows_after_qualified_first_row,0);
  assert.equal(report.later_usdc_contract_drift_rows_after_qualified_first_row,1);
  write([qualified, {...qualified, source_chain:undefined,payment_chain:undefined,
    usdc_contract:undefined}]);
  report=expectObserved();
  assert.equal(report.later_source_chain_drift_rows_after_qualified_first_row,1);
  assert.equal(report.later_usdc_contract_drift_rows_after_qualified_first_row,1);
  write([{...qualified,source_chain:undefined},qualified]);
  report=expectObserved();
  assert.equal(report.first_rows_missing_or_invalid_chain,1);
  assert.equal(report.later_chain_backfill_rows_for_unqualified_first_rows,1);
  fs.writeFileSync(p,Buffer.alloc(0),{mode:0o600});
  expectHold(/empty_history_unqualified_without_external_anchor/u);
  fs.writeFileSync(p,JSON.stringify(qualified),{mode:0o600});
  expectHold(/jsonl_noncanonical_or_truncated/u);
  fs.writeFileSync(p,Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),Buffer.from(JSON.stringify(qualified)+'\n')]),{mode:0o600});
  expectHold(/utf8_bom_not_canonical/u);
  fs.writeFileSync(p,Buffer.from([0xff,0xfe,0x0a]),{mode:0o600});
  expectHold(/read_failed/u);
  fs.writeFileSync(p,'{"request_id":"x"}\n',{mode:0o600});
  expectHold(/request_id_invalid/u);
  const symlink=path.join(dir,'symlink-requests.jsonl');
  fs.unlinkSync(p);
  fs.symlinkSync(symlink,p);
  expectHold(/not_a_bounded_regular_file/u);
  // A symlinked ancestor is likewise refused, even when the final file is regular.
  fs.unlinkSync(p);
  fs.writeFileSync(p,JSON.stringify(qualified)+'\n',{mode:0o600});
  const linkedParent=path.join(os.tmpdir(), 'void-buy-census-link-'+process.pid);
  fs.symlinkSync(dir,linkedParent);
  try {
    const r=invoke('--read-only',path.join(linkedParent,'requests.jsonl'));
    assert.equal(r.status,2);
    assert.match(parse(r.stderr).reason,/ancestor_not_plain_directory/u);
  } finally {fs.unlinkSync(linkedParent)}
  // Deterministic transient intermediate symlink substitution: after the
  // selected parent directory descriptor has been retained, replace its
  // pathname with a symlink to another synthetic directory before file open.
  // The instrumented *test copy* mutates fixture paths only; the shipped tool
  // has no environment hook or filesystem mutation primitive.
  const raceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'void-census-race-v1-'));
  try {
    const selected = path.join(raceRoot, 'selected');
    const alternate = path.join(raceRoot, 'alternate');
    fs.mkdirSync(selected, {mode:0o700});
    fs.mkdirSync(alternate, {mode:0o700});
    const originalFile = path.join(selected, 'requests.jsonl');
    fs.writeFileSync(originalFile, JSON.stringify(qualified)+'\n', {mode:0o600});
    fs.writeFileSync(path.join(alternate,'requests.jsonl'),
      JSON.stringify({...qualified,request_id:'buyvoid_alt_dddddddd'})+'\n',
      {mode:0o600});
    const raceCode = toolSource.replace(
      '    // TEST_CENSUS_PINNED_PARENT_BEFORE_FILE_OPEN',
      `    if (process.env.VOID_SYNTHETIC_CENSUS_RACE === '1') {
         fs.renameSync(path.dirname(file),path.dirname(file)+'.original');
         fs.symlinkSync(path.join(path.dirname(path.dirname(file)),'alternate'),
           path.dirname(file));
       }
       // TEST_CENSUS_PINNED_PARENT_BEFORE_FILE_OPEN`,
    ).replace(
      '    // TEST_CENSUS_PINNED_FILE_BEFORE_PATH_RECHECK',
      `    if (process.env.VOID_SYNTHETIC_CENSUS_RACE === '1') {
         const chosen = fs.lstatSync(
           path.dirname(file)+'.original/requests.jsonl', {bigint:true});
         const opened = fs.fstatSync(finalFd,{bigint:true});
         if (chosen.dev !== opened.dev || chosen.ino !== opened.ino) {
           fail('synthetic_wrong_opened_descriptor');
         }
       }
       // TEST_CENSUS_PINNED_FILE_BEFORE_PATH_RECHECK`,
    );
    assert.notEqual(raceCode,toolSource);
    const testCopy=path.join(raceRoot,'synthetic-race-only.mjs');
    fs.writeFileSync(testCopy,raceCode,{mode:0o600});
    const raced=spawnSync(process.execPath,[testCopy,'--read-only',originalFile],{
      encoding:'utf8',timeout:5000,
      env:{...process.env,VOID_SYNTHETIC_CENSUS_RACE:'1'},
    });
    assert.equal(raced.status,2,raced.stderr);
    assert.equal(raced.stdout,'');
    const report=parse(raced.stderr);
    assert.match(report.reason,/file_not_path_bound|ancestor_changed_or_rebound/u);
    assert.doesNotMatch(report.reason,/synthetic_wrong_opened_descriptor/u);
    assert.equal(fs.lstatSync(selected).isSymbolicLink(),true);
    fs.unlinkSync(selected);
    fs.renameSync(selected+'.original',selected);
    assert.equal(fs.lstatSync(path.join(selected,'requests.jsonl')).isFile(),true);
  } finally {
    fs.rmSync(raceRoot,{recursive:true,force:true});
  }
  const extra = invoke('--read-only',p,'--apply');
  assert.equal(extra.status,2);
  assert.equal(extra.stdout,'');
  console.log('VOID_BUY_ORIGINAL_REQUEST_PRESTATE_CENSUS_V1_SOURCE_GREEN');
  console.log('read_only_pinned_file_census=true');
  console.log('original_token_and_launch_qualification_counted=true');
  console.log('legacy_backfill_does_not_become_qualified=true');
  console.log('cross_request_legacy_does_not_globally_block_census=true');
  console.log('nonconsecutive_repeat_and_chain_alias_conflicts_counted=true');
  console.log('originally_qualified_later_chain_and_contract_drift_counted=true');
  console.log('sensitive_request_id_address_tx_output=false');
  console.log('symlink_and_malformed_ledger_refused=true');
  console.log('transient_intermediate_symlink_swap_cannot_redirect_opened_fd=true');
  console.log('empty_history_requires_independent_genesis_evidence=true');
  console.log('host_custody_or_payment_authority=false');
  console.log('production_gate_ready=false');
} finally {
  fs.rmSync(dir,{recursive:true,force:true});
}
