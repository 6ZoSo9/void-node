#!/usr/bin/env bash
set -euo pipefail
set +H
cd "${VOID_REPO:-$PWD}"

MARKER="VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_V1"
OUT="$(mktemp -d /tmp/void-release-publication-promotion-proof-XXXXXX)"
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
  local version="$1" dir="$2" commit="$3" tag
  tag="release-v${version}"
  mkdir -p "$dir"
  node tools/build-public-release-v1.mjs --out "$dir" --version "$version"
  (cd "$dir" && sha256sum --check --strict SHA256SUMS)
  local base
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
    --timestamp "2026-07-21T20:00:00Z" \
    --out "$dir/publication-packet-v1.json"
  python3 - "$dir" "$tag" "$commit" <<'PY'
import hashlib,json,pathlib,sys
root=pathlib.Path(sys.argv[1]); tag=sys.argv[2]; commit=sys.argv[3]
p=json.loads((root/'publication-packet-v1.json').read_text())
assets=[]
for a in p['assets']:
    q=root/a['name']
    assets.append({'name':a['name'],'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'bytes':q.stat().st_size,'release_asset_verified':True,'artifact_attestation_verified':True})
obj={'tagName':tag,'targetCommitish':commit,'isDraft':False,'isImmutable':True,'isPrerelease':False,'url':'https://example.invalid/releases/'+tag,'publishedAt':'2026-07-21T20:01:00Z','release_attestation_verified':True,'verified_assets':assets}
(root/'release-verification-v1.json').write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n')
obj['isImmutable']=False
(root/'release-verification-mutable-v1.json').write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n')
PY
  expect_fail "mutable-${version}" node tools/void-release-promotion-v1.mjs record-published \
    --packet "$dir/publication-packet-v1.json" \
    --release-json "$dir/release-verification-mutable-v1.json" \
    --out "$dir/mutable-publication-receipt.json"
  node tools/void-release-promotion-v1.mjs record-published \
    --packet "$dir/publication-packet-v1.json" \
    --release-json "$dir/release-verification-v1.json" \
    --out "$dir/publication-receipt-v1.json"
  local psha rsha
  psha="$(object_sha "$dir/publication-packet-v1.json")"
  rsha="$(object_sha "$dir/publication-receipt-v1.json")"
  python3 - "$dir" "$tag" "$commit" "$psha" "$rsha" <<'PY'
import json,pathlib,sys
root=pathlib.Path(sys.argv[1]);tag,commit,psha,rsha=sys.argv[2:]
r={'marker':'VOID_RELEASE_CANARY_RECEIPT_V1','schema_version':1,'repository':'6ZoSo9/void-node','release_tag':tag,'source_commit':commit,'packet_sha256':psha,'publication_receipt_sha256':rsha,'generated_at_utc':'2026-07-21T20:02:00Z','passed':True,'checks':{'immutable_release':True,'release_attestation':True,'asset_attestations':True,'sha256':True,'install':True,'update_check':True,'health':True,'rollback':True},'service_started_implicitly':False,'guarded_lanes_activated':False}
(root/'canary-receipt-v1.json').write_text(json.dumps(r,indent=2,sort_keys=True)+'\n')
PY
}

echo "=== [1] static contract ==="
node scripts/prove_public_release_publication_promotion_v1.mjs
node --check tools/void-release-promotion-v1.mjs
python3 -m py_compile ops/release/void-release-promotion-pr-v1.py
bash -n ops/release/void-release-dispatch-v1.sh

echo "=== [2] build two immutable-release fixtures ==="
COMMIT="$(git rev-parse HEAD)"
build_fixture 1.0.0 "$OUT/v1" "$COMMIT"
build_fixture 1.1.0 "$OUT/v2" "$COMMIT"
STATE="$OUT/state"

echo "=== [3] candidate then canary-gated stable v1 ==="
node tools/void-release-promotion-v1.mjs candidate \
  --state-dir "$STATE" --packet "$OUT/v1/publication-packet-v1.json" \
  --publication-receipt "$OUT/v1/publication-receipt-v1.json" \
  --confirm "PROMOTE release-v1.0.0 TO CANDIDATE" --timestamp "2026-07-21T20:03:00Z"
expect_fail stable-without-canary node tools/void-release-promotion-v1.mjs stable \
  --state-dir "$STATE" --packet "$OUT/v1/publication-packet-v1.json" \
  --publication-receipt "$OUT/v1/publication-receipt-v1.json" \
  --confirm "PROMOTE release-v1.0.0 TO STABLE"
node tools/void-release-promotion-v1.mjs stable \
  --state-dir "$STATE" --packet "$OUT/v1/publication-packet-v1.json" \
  --publication-receipt "$OUT/v1/publication-receipt-v1.json" \
  --canary-receipt "$OUT/v1/canary-receipt-v1.json" \
  --confirm "PROMOTE release-v1.0.0 TO STABLE" --timestamp "2026-07-21T20:04:00Z"
node tools/void-release-promotion-v1.mjs stable \
  --state-dir "$STATE" --packet "$OUT/v1/publication-packet-v1.json" \
  --publication-receipt "$OUT/v1/publication-receipt-v1.json" \
  --canary-receipt "$OUT/v1/canary-receipt-v1.json" \
  --confirm "PROMOTE release-v1.0.0 TO STABLE" --timestamp "2026-07-21T20:04:00Z"
node tools/void-release-promotion-v1.mjs verify --state-dir "$STATE"

echo "=== [4] freeze blocks v2 stable promotion ==="
node tools/void-release-promotion-v1.mjs candidate \
  --state-dir "$STATE" --packet "$OUT/v2/publication-packet-v1.json" \
  --publication-receipt "$OUT/v2/publication-receipt-v1.json" \
  --confirm "PROMOTE release-v1.1.0 TO CANDIDATE" --timestamp "2026-07-21T20:05:00Z"
node tools/void-release-promotion-v1.mjs freeze \
  --state-dir "$STATE" --repository 6ZoSo9/void-node --reason "canary review" \
  --confirm "FREEZE VOID RELEASE CHANNELS" --timestamp "2026-07-21T20:06:00Z"
expect_fail frozen-stable node tools/void-release-promotion-v1.mjs stable \
  --state-dir "$STATE" --packet "$OUT/v2/publication-packet-v1.json" \
  --publication-receipt "$OUT/v2/publication-receipt-v1.json" \
  --canary-receipt "$OUT/v2/canary-receipt-v1.json" \
  --confirm "PROMOTE release-v1.1.0 TO STABLE"
node tools/void-release-promotion-v1.mjs unfreeze \
  --state-dir "$STATE" --repository 6ZoSo9/void-node --reason "review complete" \
  --confirm "UNFREEZE VOID RELEASE CHANNELS" --timestamp "2026-07-21T20:07:00Z"
node tools/void-release-promotion-v1.mjs stable \
  --state-dir "$STATE" --packet "$OUT/v2/publication-packet-v1.json" \
  --publication-receipt "$OUT/v2/publication-receipt-v1.json" \
  --canary-receipt "$OUT/v2/canary-receipt-v1.json" \
  --confirm "PROMOTE release-v1.1.0 TO STABLE" --timestamp "2026-07-21T20:08:00Z"

echo "=== [5] revoke v2 and atomically return stable to v1 ==="
node tools/void-release-promotion-v1.mjs revoke \
  --state-dir "$STATE" --release-tag release-v1.1.0 --reason "post-promotion defect" \
  --rollback-to release-v1.0.0 --confirm "REVOKE release-v1.1.0" --timestamp "2026-07-21T20:09:00Z"
node tools/void-release-promotion-v1.mjs verify --state-dir "$STATE"
python3 - "$STATE" <<'PY'
import json,pathlib,sys
s=pathlib.Path(sys.argv[1]); ledger=json.loads((s/'promotion-ledger-v1.json').read_text())
assert ledger['state']['current_stable']=='release-v1.0.0',ledger['state']
assert 'release-v1.1.0' in ledger['state']['revocations'],ledger['state']
stable=json.loads((s/'derived/channels/stable-v1.json').read_text())
assert stable['release_tag']=='release-v1.0.0',stable
assert stable['publication']['release_immutable'] is True
assert stable['publication']['revoked'] is False
assert stable['promotion']['state']=='stable'
print('stable_rollback_and_revocation_registry_green=true')
PY
expect_fail rollback-to-revoked node tools/void-release-promotion-v1.mjs rollback \
  --state-dir "$STATE" --release-tag release-v1.1.0 --reason "invalid" \
  --confirm "ROLL BACK VOID STABLE TO release-v1.1.0"

echo "=== [6] derived-state repair and ledger tamper detection ==="
printf '\n' >> "$STATE/derived/channels/stable-v1.json"
expect_fail derived-tamper node tools/void-release-promotion-v1.mjs verify --state-dir "$STATE"
node tools/void-release-promotion-v1.mjs render --state-dir "$STATE"
node tools/void-release-promotion-v1.mjs verify --state-dir "$STATE"
cp -a "$STATE" "$OUT/tampered-state"
python3 - "$OUT/tampered-state/promotion-ledger-v1.json" <<'PY'
import json,pathlib,sys
p=pathlib.Path(sys.argv[1]);j=json.loads(p.read_text());j['history'][0]['details']['release_tag']='release-v9.9.9';p.write_text(json.dumps(j,indent=2,sort_keys=True)+'\n')
PY
expect_fail ledger-tamper node tools/void-release-promotion-v1.mjs verify --state-dir "$OUT/tampered-state"

echo "=== [7] exact promotion-PR validation boundary ==="
TIP="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["history_tip_sha256"])' "$STATE/promotion-ledger-v1.json")"
python3 ops/release/void-release-promotion-pr-v1.py \
  --repo "$PWD" --state-dir "$STATE" --action revoke \
  --confirm "PUBLISH VOID RELEASE CHANNEL STATE ${TIP}" --validate-only

echo "=== [8] no live mutation boundary ==="
echo "release_tag_published=false"
echo "live_deployment=false"
echo "service_restart=false"
echo "money_movement=false"
echo "buy_void_fulfillment=false"
echo "validator_admission=false"
echo "treasury_movement=false"
echo "authority_transfer=false"
echo "guarded_lanes_activated=false"

echo "${MARKER}_FULL_GREEN"
