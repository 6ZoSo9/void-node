#!/usr/bin/env node
import fs from 'node:fs';

const MARKER='VOID_PUBLIC_FIRST_OFFICIAL_RELEASE_LAUNCH_GATE_V1';
const required=[
  '.github/workflows/public-first-official-release-launch-gate-v1.yml',
  'tools/void-first-official-release-launch-gate-v1.mjs',
  'ops/release/void-first-official-release-launch-gate-v1.sh',
  'ops/release/void-first-official-release-launch-record-v1.sh',
  'ops/security/public-first-official-release-launch-gate-v1-proof.sh',
  'release/launch-gate/public-first-official-release-launch-gate-v1.schema.json',
  'release/launch-gate/templates/launch-packet-v1.json',
  'release/launch-gate/templates/launch-approval-v1.json',
  'release/launch-gate/templates/launch-authorization-v1.json',
  'release/launch-gate/templates/launch-abort-v1.json',
  'release/launch-gate/templates/launch-record-manifest-v1.json',
  'docs/public/first-official-release-launch-gate-v1.md',
  'docs/operators/first-official-release-launch-gate-v1.md',
  'docs/security/public-first-official-release-launch-gate-v1-threat-model.md',
  'public/public-node/void-network/release-launch-gate-v1.json',
  'public/public-node/void-network/release-launch-gate-v1.html',
];
function fail(message){console.error(`[FAIL] ${message}`);process.exit(1)}
function pass(message){console.log(`[PASS] ${message}`)}
for(const file of required){if(!fs.existsSync(file))fail(`missing ${file}`);pass(file)}
for(const file of required.filter((x)=>x.endsWith('.json'))){try{JSON.parse(fs.readFileSync(file,'utf8'));pass(`${file} JSON`)}catch(e){fail(`${file} JSON: ${e.message}`)}}
const tool=fs.readFileSync('tools/void-first-official-release-launch-gate-v1.mjs','utf8');
for(const needle of ['PREPARE_GREEN','APPROVE_GREEN','SEAL_GREEN','VERIFY_GREEN','RENDER_GREEN','VERIFY_RECORD_GREEN','FINALIZE_COMMAND_GREEN','ABORT_GREEN','manual_publication_action_required','post_publication_canary_and_qualification_still_required_for_stable']){
  if(!tool.includes(needle))fail(`launch control contract missing: ${needle}`);
}
if(/node:child_process|execSync|spawnSync|\beval\s*\(|\bexec\s*\(/.test(tool))fail('launch control must not execute external publication commands');
pass('launch-control-no-command-execution');
const shell=fs.readFileSync('ops/release/void-first-official-release-launch-gate-v1.sh','utf8');
for(const needle of ['prepare-live','verify-live','render-live','immutable-releases','void-release-publication','publication_executed=false'])if(!shell.includes(needle))fail(`live preflight contract missing: ${needle}`);
if(/gh\s+workflow\s+run|gh\s+release\s+create|git\s+tag\s+-a|git\s+push[^\n]*refs\/tags/.test(shell))fail('launch gate shell contains a publication mutation command');
const recordShell=fs.readFileSync('ops/release/void-first-official-release-launch-record-v1.sh','utf8');
for(const needle of ['release/launch-gate/records/','verify-record','finalize-command','commit=false','publication_command_executed=false'])if(!recordShell.includes(needle))fail(`launch-record helper contract missing: ${needle}`);
if(/gh\s+workflow\s+run|gh\s+release\s+create|git\s+push|gh\s+pr\s+create|gh\s+pr\s+merge/.test(recordShell))fail('launch-record helper crosses commit/push/PR/publication boundary');
pass('launch-gate-shells-no-publication-mutation');
const publicationWorkflow=fs.readFileSync('.github/workflows/public-release-publication-promotion-v1.yml','utf8');
for(const needle of ['launch_record_commit:','launch_packet_sha256:','launch_approval_sha256:','launch_authorization_sha256:','VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_GATE_WORKFLOW_V1','Verify sealed launch-gate record before any publication mutation','void-first-official-release-launch-gate-v1.mjs verify-record','release/launch-gate/records/${LAUNCH_ID}','git merge-base --is-ancestor "$SOURCE_COMMIT" "$LAUNCH_RECORD_COMMIT"'])if(!publicationWorkflow.includes(needle))fail(`publication workflow launch gate missing: ${needle}`);
if(publicationWorkflow.includes('test "$SOURCE_COMMIT" = "$(git rev-parse origin/main)"'))fail('publication workflow still requires the source commit itself to contain the later launch record');
const recordGate=publicationWorkflow.indexOf('Verify sealed launch-gate record before any publication mutation');
const firstMutation=publicationWorkflow.indexOf('Attest release assets with build provenance');
if(recordGate<0||firstMutation<0||recordGate>firstMutation)fail('launch-record verification does not precede publication authority');
pass('publication-workflow-enforces-committed-launch-record');
const qualificationProof=fs.readFileSync('ops/security/public-release-qualification-v1-proof.sh','utf8');
if(!qualificationProof.includes('PYTHONPYCACHEPREFIX="$OUT/qualification-pycache" python3 -m py_compile'))fail('qualification proof still leaks Python bytecode');
const publicationProof=fs.readFileSync('ops/security/public-release-publication-promotion-v1-proof.sh','utf8');
if(!publicationProof.includes('PYTHONPYCACHEPREFIX="$OUT/publication-pycache" python3 -m py_compile'))fail('publication proof still leaks Python bytecode');
pass('release-python-cache-redirects');
const workflow=fs.readFileSync('.github/workflows/public-first-official-release-launch-gate-v1.yml','utf8');
for(const needle of ['permissions:\n  contents: read','actions/checkout@v6','actions/setup-node@v6','public-first-official-release-launch-gate-v1-proof'])if(!workflow.includes(needle))fail(`workflow contract missing: ${needle}`);
if(/contents:\s*write|id-token:\s*write|attestations:\s*write|environment:\s*void-release-publication|gh release create|gh workflow run/.test(workflow))fail('launch-gate workflow has publication authority');
pass('workflow-read-only-no-publication-authority');
const make=fs.readFileSync('Makefile','utf8');
for(const needle of ['public-first-official-release-launch-gate-v1-static-proof:','public-first-official-release-launch-gate-v1-proof:'])if(!make.includes(needle))fail(`Makefile missing: ${needle}`);
pass('makefile-wiring');
console.log(`${MARKER}_STATIC_GREEN`);
