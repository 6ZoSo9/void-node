#!/usr/bin/env bash
set -euo pipefail
set +H
cd "${VOID_REPO:-$PWD}"

MARKER="VOID_PUBLIC_RELEASE_QUALIFICATION_V1"
OUT="$(mktemp -d /tmp/void-release-qualification-proof-XXXXXX)"
trap 'rm -rf "$OUT"' EXIT

expect_fail(){
  local label="$1"; shift
  if "$@" >"$OUT/${label}.out" 2>"$OUT/${label}.err"; then
    echo "[FAIL] expected failure: $label" >&2
    cat "$OUT/${label}.out" "$OUT/${label}.err" >&2 || true
    exit 1
  fi
  echo "[PASS] expected failure: $label"
}
object_sha(){
  node - "$1" <<'NODE'
const fs=require('node:fs'),crypto=require('node:crypto');
function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;}
const j=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
process.stdout.write(crypto.createHash('sha256').update(JSON.stringify(stable(j))).digest('hex'));
NODE
}

build_fixture(){
  local version="$1" dir="$2" commit="$3" tag base psha rsha
  tag="release-v${version}"
  mkdir -p "$dir"
  node tools/build-public-release-v1.mjs --out "$dir" --version "$version"
  (cd "$dir" && sha256sum --check --strict SHA256SUMS)
  base="$(python3 - "$dir" <<'PY'
import pathlib,sys
print(pathlib.Path(sys.argv[1]).resolve().as_uri()+'/')
PY
)"
  node tools/build-public-release-channel-v1.mjs \
    --manifest "$dir/void-node-release-manifest.json" \
    --checksums "$dir/SHA256SUMS" \
    --base-url "$base" \
    --repository 6ZoSo9/void-node \
    --release-tag "$tag" \
    --channel candidate \
    --test-allow-file \
    --out "$dir/candidate-v1.json"
  node tools/void-release-promotion-v1.mjs prepare \
    --release-manifest "$dir/void-node-release-manifest.json" \
    --checksums "$dir/SHA256SUMS" \
    --channel-manifest "$dir/candidate-v1.json" \
    --asset-dir "$dir" \
    --repository 6ZoSo9/void-node \
    --version "$version" \
    --release-tag "$tag" \
    --source-commit "$commit" \
    --timestamp "2026-07-22T08:00:00Z" \
    --out "$dir/publication-packet-v1.json"
  python3 - "$dir" "$tag" "$commit" <<'PY'
import hashlib,json,pathlib,sys
root=pathlib.Path(sys.argv[1]); tag=sys.argv[2]; commit=sys.argv[3]
p=json.loads((root/'publication-packet-v1.json').read_text())
assets=[]
for a in p['assets']:
    q=root/a['name']
    assets.append({'name':a['name'],'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'bytes':q.stat().st_size,'release_asset_verified':True,'artifact_attestation_verified':True})
obj={'tagName':tag,'targetCommitish':commit,'isDraft':False,'isImmutable':True,'isPrerelease':False,'url':'https://example.invalid/releases/'+tag,'publishedAt':'2026-07-22T08:01:00Z','release_attestation_verified':True,'verified_assets':assets}
(root/'release-verification-v1.json').write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n')
PY
  node tools/void-release-promotion-v1.mjs record-published \
    --packet "$dir/publication-packet-v1.json" \
    --release-json "$dir/release-verification-v1.json" \
    --out "$dir/publication-receipt-v1.json"
  psha="$(object_sha "$dir/publication-packet-v1.json")"
  rsha="$(object_sha "$dir/publication-receipt-v1.json")"
  python3 - "$dir" "$tag" "$commit" "$psha" "$rsha" <<'PY'
import json,pathlib,sys
root=pathlib.Path(sys.argv[1]); tag,commit,psha,rsha=sys.argv[2:]
r={'marker':'VOID_RELEASE_CANARY_RECEIPT_V1','schema_version':1,'repository':'6ZoSo9/void-node','release_tag':tag,'source_commit':commit,'packet_sha256':psha,'publication_receipt_sha256':rsha,'generated_at_utc':'2026-07-22T08:02:00Z','passed':True,'checks':{'immutable_release':True,'release_attestation':True,'asset_attestations':True,'sha256':True,'install':True,'update_check':True,'health':True,'rollback':True},'service_started_implicitly':False,'guarded_lanes_activated':False}
(root/'canary-receipt-v1.json').write_text(json.dumps(r,indent=2,sort_keys=True)+'\n')
PY
}

echo "=== [1] static contract ==="
node scripts/prove_public_release_qualification_v1.mjs
node --check tools/void-release-qualification-v1.mjs
node --check tools/void-release-promotion-v1.mjs
bash -n ops/release/void-release-qualification-runner-v1.sh
bash -n ops/release/void-release-qualification-dispatch-v1.sh
python3 -m py_compile ops/release/void-release-qualification-pr-v1.py

echo "=== [2] build immutable release fixture and qualification plan ==="
COMMIT="$(git rev-parse HEAD)"
FIX="$OUT/release-v1.2.0"
build_fixture 1.2.0 "$FIX" "$COMMIT"
node tools/void-release-qualification-v1.mjs prepare \
  --packet "$FIX/publication-packet-v1.json" \
  --publication-receipt "$FIX/publication-receipt-v1.json" \
  --canary-receipt "$FIX/canary-receipt-v1.json" \
  --timestamp "2026-07-22T08:03:00Z" \
  --out "$FIX/qualification-plan-v1.json"
mkdir -p "$FIX/results" "$FIX/runner-output"

echo "=== [3] execute complete bounded qualification matrix ==="
TARGETS=(
  ubuntu-22.04-x64
  ubuntu-24.04-x64
  debian-12-x64
  windows-wsl2-ubuntu-24.04-x64
  upgrade-from-current-stable
  rollback-health-failure
  two-node-sync
  participant-ui-smoke
)
idx=0
for target in "${TARGETS[@]}"; do
  idx=$((idx+1))
  target_out="$FIX/runner-output/$target"
  VOID_QUALIFICATION_TARGET="$target" \
  VOID_QUALIFICATION_OUT="$target_out" \
  VOID_QUALIFICATION_TEST_MODE=1 \
    bash ops/release/void-release-qualification-runner-v1.sh
  node tools/void-release-qualification-v1.mjs result \
    --plan "$FIX/qualification-plan-v1.json" \
    --target "$target" \
    --runner-id "qualification-runner-$idx" \
    --run-id "qualification-run-$idx" \
    --checks "$target_out/$target.checks.json" \
    --safety "$target_out/$target.safety.json" \
    --evidence-files "$target_out/$target.log" \
    --timestamp "2026-07-22T08:1${idx}:00Z" \
    --out "$FIX/results/$target.json"
done

echo "=== [4] missing, duplicate, failed, and reviewer-separation guards ==="
mkdir -p "$OUT/missing-results"
cp "$FIX/results"/*.json "$OUT/missing-results/"
rm "$OUT/missing-results/participant-ui-smoke.json"
expect_fail missing-target node tools/void-release-qualification-v1.mjs evaluate \
  --plan "$FIX/qualification-plan-v1.json" --result-dir "$OUT/missing-results" --out "$OUT/missing-receipt.json"
mkdir -p "$OUT/duplicate-results"
cp "$FIX/results"/*.json "$OUT/duplicate-results/"
cp "$FIX/results/ubuntu-22.04-x64.json" "$OUT/duplicate-results/duplicate.json"
expect_fail duplicate-target node tools/void-release-qualification-v1.mjs evaluate \
  --plan "$FIX/qualification-plan-v1.json" --result-dir "$OUT/duplicate-results" --out "$OUT/duplicate-receipt.json"
python3 - "$FIX/runner-output/ubuntu-22.04-x64/ubuntu-22.04-x64.checks.json" "$OUT/failed-checks.json" <<'PY'
import json,sys
j=json.load(open(sys.argv[1]));j['clean_install']=False;open(sys.argv[2],'w').write(json.dumps(j,indent=2,sort_keys=True)+'\n')
PY
expect_fail failed-check node tools/void-release-qualification-v1.mjs result \
  --plan "$FIX/qualification-plan-v1.json" --target ubuntu-22.04-x64 \
  --runner-id bad-runner --run-id bad-run \
  --checks "$OUT/failed-checks.json" \
  --safety "$FIX/runner-output/ubuntu-22.04-x64/ubuntu-22.04-x64.safety.json" \
  --evidence-files "$FIX/runner-output/ubuntu-22.04-x64/ubuntu-22.04-x64.log" \
  --out "$OUT/failed-result.json"

echo "=== [5] evaluate, independently approve, verify, and render ==="
node tools/void-release-qualification-v1.mjs evaluate \
  --plan "$FIX/qualification-plan-v1.json" \
  --result-dir "$FIX/results" \
  --timestamp "2026-07-22T08:30:00Z" \
  --out "$FIX/qualification-receipt-v1.json"
expect_fail reviewer-is-runner node tools/void-release-qualification-v1.mjs approve \
  --receipt "$FIX/qualification-receipt-v1.json" \
  --reviewer-id qualification-runner-1 \
  --confirm "APPROVE RELEASE QUALIFICATION release-v1.2.0" \
  --out "$OUT/bad-approval.json"
node tools/void-release-qualification-v1.mjs approve \
  --receipt "$FIX/qualification-receipt-v1.json" \
  --reviewer-id release-review-board-1 \
  --confirm "APPROVE RELEASE QUALIFICATION release-v1.2.0" \
  --timestamp "2026-07-22T08:31:00Z" \
  --out "$FIX/qualification-approval-v1.json"
node tools/void-release-qualification-v1.mjs verify \
  --plan "$FIX/qualification-plan-v1.json" \
  --result-dir "$FIX/results" \
  --receipt "$FIX/qualification-receipt-v1.json" \
  --approval "$FIX/qualification-approval-v1.json"
node tools/void-release-qualification-v1.mjs render \
  --receipt "$FIX/qualification-receipt-v1.json" \
  --approval "$FIX/qualification-approval-v1.json" \
  --out-dir "$FIX/public-summary"

echo "=== [6] stable promotion refuses bypass and accepts exact qualification ==="
STATE="$OUT/promotion-state"
node tools/void-release-promotion-v1.mjs candidate \
  --state-dir "$STATE" \
  --packet "$FIX/publication-packet-v1.json" \
  --publication-receipt "$FIX/publication-receipt-v1.json" \
  --confirm "PROMOTE release-v1.2.0 TO CANDIDATE" \
  --timestamp "2026-07-22T08:32:00Z"
expect_fail stable-without-qualification node tools/void-release-promotion-v1.mjs stable \
  --state-dir "$STATE" \
  --packet "$FIX/publication-packet-v1.json" \
  --publication-receipt "$FIX/publication-receipt-v1.json" \
  --canary-receipt "$FIX/canary-receipt-v1.json" \
  --confirm "PROMOTE release-v1.2.0 TO STABLE"
expect_fail stable-without-approval node tools/void-release-promotion-v1.mjs stable \
  --state-dir "$STATE" \
  --packet "$FIX/publication-packet-v1.json" \
  --publication-receipt "$FIX/publication-receipt-v1.json" \
  --canary-receipt "$FIX/canary-receipt-v1.json" \
  --qualification-receipt "$FIX/qualification-receipt-v1.json" \
  --confirm "PROMOTE release-v1.2.0 TO STABLE"
node tools/void-release-promotion-v1.mjs stable \
  --state-dir "$STATE" \
  --packet "$FIX/publication-packet-v1.json" \
  --publication-receipt "$FIX/publication-receipt-v1.json" \
  --canary-receipt "$FIX/canary-receipt-v1.json" \
  --qualification-receipt "$FIX/qualification-receipt-v1.json" \
  --qualification-approval "$FIX/qualification-approval-v1.json" \
  --confirm "PROMOTE release-v1.2.0 TO STABLE" \
  --timestamp "2026-07-22T08:33:00Z"
node tools/void-release-promotion-v1.mjs verify --state-dir "$STATE"
python3 - "$STATE" <<'PY'
import json,pathlib,sys
s=pathlib.Path(sys.argv[1])
ledger=json.loads((s/'promotion-ledger-v1.json').read_text())
entry=ledger['state']['releases']['release-v1.2.0']
assert len(entry['qualification_receipt_sha256'])==64,entry
assert len(entry['qualification_approval_sha256'])==64,entry
stable=json.loads((s/'derived/channels/stable-v1.json').read_text())
assert len(stable['promotion']['qualification_receipt_sha256'])==64,stable
assert len(stable['promotion']['qualification_approval_sha256'])==64,stable
print('stable_qualification_binding_green=true')
PY

echo "=== [7] tamper and exact qualification-PR boundaries ==="
cp -a "$FIX/results" "$OUT/tampered-results"
python3 - "$OUT/tampered-results/ubuntu-24.04-x64.json" <<'PY'
import json,sys
p=sys.argv[1];j=json.load(open(p));j['run_id']='tampered-run';open(p,'w').write(json.dumps(j,indent=2,sort_keys=True)+'\n')
PY
expect_fail result-tamper node tools/void-release-qualification-v1.mjs verify \
  --plan "$FIX/qualification-plan-v1.json" \
  --result-dir "$OUT/tampered-results" \
  --receipt "$FIX/qualification-receipt-v1.json" \
  --approval "$FIX/qualification-approval-v1.json"
QSHA="$(sha256sum "$FIX/qualification-receipt-v1.json" | awk '{print $1}')"
python3 ops/release/void-release-qualification-pr-v1.py \
  --repo "$PWD" \
  --receipt "$FIX/qualification-receipt-v1.json" \
  --approval "$FIX/qualification-approval-v1.json" \
  --confirm "PUBLISH VOID RELEASE QUALIFICATION ${QSHA}" \
  --validate-only

echo "=== [8] no live mutation boundary ==="
echo "release_tag_published=false"
echo "official_release_published=false"
echo "stable_promotion_performed_only_in_temp_fixture=true"
echo "live_deployment=false"
echo "service_restart=false"
echo "money_movement=false"
echo "buy_void_fulfillment=false"
echo "validator_admission=false"
echo "treasury_movement=false"
echo "authority_transfer=false"
echo "guarded_lanes_activated=false"

echo "${MARKER}_FULL_GREEN"
