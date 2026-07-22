#!/usr/bin/env bash
set -euo pipefail

echo '=== [1] static launch-gate contract ==='
node scripts/prove_public_first_official_release_launch_gate_v1.mjs

echo '=== [2] existing release foundations remain statically green ==='
node scripts/prove_public_release_distribution_v1.mjs
node scripts/prove_public_release_update_channel_v1.mjs
node scripts/prove_public_release_publication_promotion_v1.mjs
node scripts/prove_public_release_qualification_v1.mjs
node scripts/prove_public_first_official_release_rehearsal_v1.mjs
node scripts/prove_public_python_bytecode_hygiene_v1.mjs
grep -Fq 'PYTHONPYCACHEPREFIX="$OUT/qualification-pycache" python3 -m py_compile' ops/security/public-release-qualification-v1-proof.sh
grep -Fq 'PYTHONPYCACHEPREFIX="$OUT/publication-pycache" python3 -m py_compile' ops/security/public-release-publication-promotion-v1-proof.sh
CACHE_PROBE="$(mktemp -d -t void-launch-gate-python-cache-probe-XXXXXX)"
PYTHONPYCACHEPREFIX="$CACHE_PROBE" python3 -m py_compile   ops/release/void-release-qualification-pr-v1.py   ops/release/void-release-promotion-pr-v1.py
if find ops/release \( -type d -name '__pycache__' -o -type f \( -name '*.pyc' -o -name '*.pyo' -o -name '*.pyd' \) \) | grep -q .; then
  echo '[FAIL] release proof syntax checks leaked Python bytecode' >&2
  exit 1
fi
rm -rf "$CACHE_PROBE"
echo 'release_python_cache_redirects_green=true'

echo '=== [3] deterministic exact-version release assets ==='
ROOT="$(mktemp -d -t void-first-official-release-launch-gate-v1-XXXXXX)"
trap 'rm -rf "$ROOT"' EXIT
VERSION="$(node -p 'require("./package.json").version')"
COMMIT="$(git rev-parse HEAD)"
REPOSITORY="6ZoSo9/void-node"
TAG="release-v${VERSION}"
NOW="2030-01-01T00:00:00Z"
EXPIRES="2030-01-01T04:00:00Z"
A="$ROOT/build-a"
B="$ROOT/build-b"
REHEARSAL="$ROOT/rehearsal"
STATE="$ROOT/gate"
PREFLIGHT="$ROOT/preflight.json"
TOOL="tools/void-first-official-release-launch-gate-v1.mjs"
WORKFLOW=".github/workflows/public-release-publication-promotion-v1.yml"

node tools/build-public-release-v1.mjs --out "$A" --version "$VERSION"
(cd "$A" && sha256sum --check --strict SHA256SUMS)
node tools/build-public-release-v1.mjs --out "$B" --version "$VERSION"
(cd "$B" && sha256sum --check --strict SHA256SUMS)
cmp "$A/SHA256SUMS" "$B/SHA256SUMS"
echo 'deterministic_release_sha256sums_match=true'

echo '=== [4] exact no-publish rehearsal binding ==='
node tools/void-first-official-release-rehearsal-v1.mjs run-all \
  --repository "$REPOSITORY" --version "$VERSION" --source-commit "$COMMIT" \
  --release-dir "$A" --state-dir "$REHEARSAL" --now "$NOW"
node tools/void-first-official-release-rehearsal-v1.mjs verify --release-dir "$A" --state-dir "$REHEARSAL"

python3 - "$PREFLIGHT" "$REPOSITORY" "$VERSION" "$TAG" "$COMMIT" "$NOW" "$(sha256sum "$WORKFLOW" | awk '{print $1}')" <<'PY'
import json,sys
out,repo,version,tag,commit,now,wsha=sys.argv[1:]
obj={
 'marker':'VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_PREFLIGHT_V1','schema_version':1,
 'repository':repo,'version':version,'release_tag':tag,'source_commit':commit,
 'origin_main_commit':commit,'package_version':version,'branch':'main',
 'working_tree_clean':True,'remote_transport':'ssh','github_auth_ok':True,
 'remote_tag_absent':True,'github_release_absent':True,'immutable_releases_enabled':True,
 'publication_environment':{'name':'void-release-publication','exists':True,'protected':True,'required_reviewers':2,'prevent_self_review':True},
 'publication_workflow':{'path':'.github/workflows/public-release-publication-promotion-v1.yml','sha256':wsha,'publish_action':'publish','confirmation':f'PUBLISH VOID RELEASE {tag} AT {commit}'},
 'foundation_proofs':{'distribution':True,'update_channel':True,'publication_promotion':True,'qualification':True,'rehearsal':True,'python_bytecode_hygiene':True},
 'observed_at_utc':now,'live_github_observation':False,
}
open(out,'w').write(json.dumps(obj,indent=2,sort_keys=True)+'\n')
PY

expect_fail(){
  local label="$1"; shift
  local log="$ROOT/expected-failure-${label}.log"
  set +e
  "$@" >"$log" 2>&1
  local rc=$?
  set -e
  if [ "$rc" -eq 0 ]; then cat "$log"; echo "[FAIL] expected failure: $label"; exit 1; fi
  echo "[PASS] expected failure: $label"
}

echo '=== [5] prepare, independently approve, seal, verify, and render ==='
node "$TOOL" prepare --test-mode \
  --repository "$REPOSITORY" --version "$VERSION" --source-commit "$COMMIT" \
  --release-dir-a "$A" --release-dir-b "$B" --rehearsal-state-dir "$REHEARSAL" \
  --preflight "$PREFLIGHT" --workflow-file "$WORKFLOW" --preparer-id release-preparer-a \
  --now "$NOW" --expires-at "$EXPIRES" --state-dir "$STATE"
PACKET="$STATE/launch-packet-v1.json"
APPROVAL="$STATE/launch-approval-v1.json"
AUTH="$STATE/launch-authorization-v1.json"
ABORT="$STATE/launch-abort-v1.json"
PACKET_SHA="$(sha256sum "$PACKET" | awk '{print $1}')"
APPROVE_PHRASE="APPROVE VOID RELEASE LAUNCH ${TAG} AT ${COMMIT} PACKET ${PACKET_SHA}"
SEAL_PHRASE="SEAL VOID RELEASE LAUNCH ${TAG} AT ${COMMIT} UNTIL ${EXPIRES} PACKET ${PACKET_SHA}"
ABORT_PHRASE="ABORT VOID RELEASE LAUNCH ${TAG} AT ${COMMIT} PACKET ${PACKET_SHA}"

expect_fail reviewer-is-preparer node "$TOOL" approve --packet "$PACKET" --reviewer-id release-preparer-a --confirmation "$APPROVE_PHRASE" --now "2030-01-01T00:10:00Z" --out "$ROOT/bad-approval.json"
expect_fail wrong-approval-phrase node "$TOOL" approve --packet "$PACKET" --reviewer-id release-reviewer-b --confirmation "WRONG" --now "2030-01-01T00:10:00Z" --out "$ROOT/bad-approval2.json"
node "$TOOL" approve --packet "$PACKET" --reviewer-id release-reviewer-b --confirmation "$APPROVE_PHRASE" --now "2030-01-01T00:10:00Z" --out "$APPROVAL"
expect_fail wrong-seal-authorizer node "$TOOL" seal --packet "$PACKET" --approval "$APPROVAL" --authorizer-id release-preparer-a --confirmation "$SEAL_PHRASE" --now "2030-01-01T00:20:00Z" --out "$ROOT/bad-auth.json"
node "$TOOL" seal --packet "$PACKET" --approval "$APPROVAL" --authorizer-id release-reviewer-b --confirmation "$SEAL_PHRASE" --now "2030-01-01T00:20:00Z" --out "$AUTH"
COMMON=(--test-mode --packet "$PACKET" --approval "$APPROVAL" --authorization "$AUTH" --preflight "$PREFLIGHT" --release-dir-a "$A" --release-dir-b "$B" --rehearsal-state-dir "$REHEARSAL" --workflow-file "$WORKFLOW")
node "$TOOL" verify "${COMMON[@]}" --now "2030-01-01T01:00:00Z"
node "$TOOL" render "${COMMON[@]}" --now "2030-01-01T01:00:00Z" --out-dir "$STATE/rendered"
LAUNCH_ID="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["launch_id"])' "$PACKET")"
RECORD_DIR="$STATE/rendered/launch-record/$LAUNCH_ID"
node "$TOOL" verify-record --test-mode \
  --record-dir "$RECORD_DIR" --release-dir-a "$A" --release-dir-b "$B" \
  --workflow-file "$WORKFLOW" --now "2030-01-01T01:00:00Z"
RECORD_COMMIT="cccccccccccccccccccccccccccccccccccccccc"
FINAL_COMMAND="$STATE/rendered/publication-command-final-v1.json"
node "$TOOL" finalize-command --test-mode \
  --record-dir "$RECORD_DIR" --release-dir-a "$A" --release-dir-b "$B" \
  --workflow-file "$WORKFLOW" --now "2030-01-01T01:00:00Z" \
  --launch-record-commit "$RECORD_COMMIT" --out "$FINAL_COMMAND"
python3 - "$STATE/rendered/publication-command-v1.json" "$FINAL_COMMAND" "$TAG" "$COMMIT" "$LAUNCH_ID" "$RECORD_COMMIT" "$PACKET" "$APPROVAL" "$AUTH" <<'PY'
import hashlib,json,sys
draft,final,tag,commit,launch_id,record_commit,packet,approval,auth=sys.argv[1:]
def h(p): return hashlib.sha256(open(p,'rb').read()).hexdigest()
d=json.load(open(draft));p=json.load(open(final))
assert d['executable_by_gate'] is False and d['launch_record_commit_finalized'] is False
assert p['executable_by_gate'] is False and p['launch_record_commit_finalized'] is True
assert p['launch_record_commit']==record_commit
assert p['command_argv'][:4]==['gh','workflow','run','public-release-publication-promotion-v1.yml']
for required in [
 f'confirmation=PUBLISH VOID RELEASE {tag} AT {commit}',
 f'launch_id={launch_id}',f'launch_record_commit={record_commit}',
 f'launch_packet_sha256={h(packet)}',f'launch_approval_sha256={h(approval)}',
 f'launch_authorization_sha256={h(auth)}'
]: assert required in p['command_argv'], required
assert p['policy']['publication_executed'] is False
print('sealed_launch_record_verified=true')
print('exact_inert_publication_command_finalized=true')
PY

TAMPERED_RECORD="$ROOT/tampered-launch-record"
cp -a "$RECORD_DIR" "$TAMPERED_RECORD"
printf '\n' >> "$TAMPERED_RECORD/launch-approval-v1.json"
expect_fail launch-record-tamper node "$TOOL" verify-record --test-mode --record-dir "$TAMPERED_RECORD" --release-dir-a "$A" --release-dir-b "$B" --workflow-file "$WORKFLOW" --now "2030-01-01T01:00:00Z"
expect_fail expired-authorization node "$TOOL" verify "${COMMON[@]}" --now "2030-01-01T04:00:01Z"

echo '=== [6] fail-closed preflight, asset, and packet boundaries ==='
python3 - "$PREFLIGHT" "$ROOT/preflight-immutable-false.json" "$ROOT/preflight-tag-present.json" "$ROOT/preflight-env-unprotected.json" <<'PY'
import copy,json,sys
src=json.load(open(sys.argv[1]))
a=copy.deepcopy(src);a['immutable_releases_enabled']=False
b=copy.deepcopy(src);b['remote_tag_absent']=False
c=copy.deepcopy(src);c['publication_environment']['protected']=False
for obj,out in [(a,sys.argv[2]),(b,sys.argv[3]),(c,sys.argv[4])]:open(out,'w').write(json.dumps(obj,indent=2,sort_keys=True)+'\n')
PY
for case in immutable-false tag-present env-unprotected; do
  expect_fail "$case" node "$TOOL" prepare --test-mode --repository "$REPOSITORY" --version "$VERSION" --source-commit "$COMMIT" --release-dir-a "$A" --release-dir-b "$B" --rehearsal-state-dir "$REHEARSAL" --preflight "$ROOT/preflight-${case}.json" --workflow-file "$WORKFLOW" --preparer-id release-preparer-a --now "$NOW" --expires-at "$EXPIRES" --state-dir "$ROOT/state-${case}"
done

TAMPER_NAME="$(awk 'NR==1{print $2}' "$B/SHA256SUMS")"
printf 'tamper\n' >> "$B/$TAMPER_NAME"
expect_fail deterministic-build-tamper node "$TOOL" prepare --test-mode --repository "$REPOSITORY" --version "$VERSION" --source-commit "$COMMIT" --release-dir-a "$A" --release-dir-b "$B" --rehearsal-state-dir "$REHEARSAL" --preflight "$PREFLIGHT" --workflow-file "$WORKFLOW" --preparer-id release-preparer-a --now "$NOW" --expires-at "$EXPIRES" --state-dir "$ROOT/state-tamper"
rm -rf "$B"
node tools/build-public-release-v1.mjs --out "$B" --version "$VERSION" >/dev/null

cp "$PACKET" "$ROOT/tampered-packet.json"
python3 - "$ROOT/tampered-packet.json" <<'PY'
import json,sys
p=sys.argv[1];j=json.load(open(p));j['release']['assets'][0]['bytes']+=1;open(p,'w').write(json.dumps(j,indent=2,sort_keys=True)+'\n')
PY
expect_fail packet-tamper node "$TOOL" verify --test-mode --packet "$ROOT/tampered-packet.json" --approval "$APPROVAL" --authorization "$AUTH" --preflight "$PREFLIGHT" --release-dir-a "$A" --release-dir-b "$B" --rehearsal-state-dir "$REHEARSAL" --workflow-file "$WORKFLOW" --now "2030-01-01T01:00:00Z"

echo '=== [7] explicit abort invalidates the sealed launch and committed record ==='
node "$TOOL" abort --packet "$PACKET" --approval "$APPROVAL" --authorization "$AUTH" --actor-id release-preparer-a --reason "operator requested abort during proof" --confirmation "$ABORT_PHRASE" --now "2030-01-01T01:30:00Z" --out "$ABORT"
expect_fail aborted-launch node "$TOOL" verify "${COMMON[@]}" --abort "$ABORT" --now "2030-01-01T01:31:00Z"

echo '=== [8] no publication or live mutation boundary ==='
echo 'sealed_launch_record_rendered=true'
echo 'publication_command_finalized_with_record_commit=true'
echo 'publication_command_rendered=true'
echo 'publication_command_executed=false'
echo 'release_tag_published=false'
echo 'official_release_published=false'
echo 'stable_channel_changed=false'
echo 'live_deployment=false'
echo 'service_restart=false'
echo 'money_movement=false'
echo 'buy_void_fulfillment=false'
echo 'validator_admission=false'
echo 'treasury_movement=false'
echo 'authority_transfer=false'
echo 'guarded_lanes_activated=false'
echo 'VOID_PUBLIC_FIRST_OFFICIAL_RELEASE_LAUNCH_GATE_V1_FULL_GREEN'
