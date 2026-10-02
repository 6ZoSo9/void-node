#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOID_DATANET_FINAL_SIGNING_REVIEW_SEQUENCE_V1"
REPO="$HOME/dev/void-node"
REQUIRED_MERGED_HEAD="2d9526711618c7ff5af955350d742960e49ced20"
ACTIVATION_STAGE="$HOME/Downloads/void_epoch2_qbft_private_successor_ceremony_resume_v5_20261002T134600Z"
ACTIVATION_PLAN="$ACTIVATION_STAGE/void_epoch2_qbft_private_runtime_activation_plan_v1_20261002T134600Z.json"
ACTIVATION_RECEIPT="$ACTIVATION_STAGE/void_epoch2_qbft_private_runtime_activation_receipt_v1_20261002T134600Z.json"
ACTIVATION_PLAN_SHA="86128119c45197b04dd127986349c42c971a4287739864f44a50c0e6dc386a7f"
ACTIVATION_RECEIPT_SHA="1a9837b42bf20439d939f54ca8bd9c3a81d91d7a8cf83ddd54f58929fc2f5e13"
CONSTRUCT_CONFIRM="constructDatanetRegistryDeploymentTransactionV1"
BIND_CONFIRM="bindDatanetRegistryDeployerCredentialIdentityV1"
AUTH_FS_UUID="fb57fcbe-83b1-4a69-9701-7aec4cf5396f"
CREDENTIAL_REL="void-authority/datanet-content-commitment-registry-deployer-v1"
CREDENTIAL_ID="datanet-content-commitment-registry-deployer-wallet-v1"

fail(){ echo "${MARKER}_HOLD reason=$1" >&2; exit 2; }
cleanup(){
  rc=$?
  trap - EXIT
  if [ -n "${SSH_SOCK:-}" ]; then
    ssh -S "$SSH_SOCK" -O exit Nimo >/dev/null 2>&1 || true
    rm -f "$SSH_SOCK" >/dev/null 2>&1 || true
  fi
  exit "$rc"
}
trap cleanup EXIT

cat <<HDR
$MARKER
construction_confirmation=$CONSTRUCT_CONFIRM
credential_binding_confirmation=$BIND_CONFIRM
transaction_signing_authorized=false
transaction_submission=false
transaction_broadcast=false
deployment=false
chain2050_mutation=false
funds_movement=false
HDR

test "$(hostname)" = "zoso-Precision-Tower-7810" || fail precision_host_required
test -d "$REPO/.git" || fail repo_missing
cd "$REPO"

git fetch origin main
REMOTE_HEAD="$(git rev-parse origin/main)"
CURRENT_BRANCH="$(git branch --show-current)"
case "$CURRENT_BRANCH" in
  main) ;;
  fix/datanet-pinned-legacy-lineage-v2-20261002)
    test -z "$(git status --porcelain=v1 --untracked-files=all)" || fail merged_work_branch_dirty
    git merge-base --is-ancestor "$(git rev-parse HEAD)" "$REMOTE_HEAD" || fail merged_work_branch_not_in_main
    git switch main
    git branch -D "$CURRENT_BRANCH"
    ;;
  *) fail "unexpected_precision_branch:$CURRENT_BRANCH" ;;
esac

test -z "$(git status --porcelain=v1 --untracked-files=all)" || fail precision_worktree_dirty
git merge-base --is-ancestor "$REQUIRED_MERGED_HEAD" "$REMOTE_HEAD" || fail pr2349_not_merged

check_blob(){
  p="$1"; e="$2"; a="$(git rev-parse "$REMOTE_HEAD:$p" 2>/dev/null || true)"
  test "$a" = "$e" || fail "critical_blob_drift:$p"
}
check_blob tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs ea03f35c27953000b35da0638c3cb4043485f26e
check_blob ops/precision/void-datanet-registry-deployer-resolution-activation-bound-v1.mjs b33243347cf06ff56a42942c5398eca433b9b286
check_blob ops/precision/void-datanet-registry-unsigned-deployment-input-plan-v1.mjs 76ba6a98323760aeabf107837dd905572c56d474
check_blob ops/precision/void-datanet-registry-deployment-fee-funding-v1.mjs ef588880951bd1a09859cadee0f4206249a3f46b
check_blob ops/precision/void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs c785bc0146d80e2500d1833011d4d182ce6efd22
check_blob ops/precision/void-datanet-registry-transaction-construction-admission-v1.mjs 436a5c18c7b455b8f8c37b42a10d8ff44348d9c5
check_blob ops/precision/void-datanet-registry-unsigned-transaction-candidate-v1.mjs e60f8feabceb5aa9144604d2ab573286fe17a3fd
check_blob ops/nimo/void-nimo-datanet-registry-deployer-credential-binding-v1.mjs 93ea7166ffb2a8580c62a29fa6af998f3981ef88
check_blob ops/precision/void-datanet-registry-candidate-fresh-revalidation-v1.mjs 634bca2f28be80dac622ddbbe6fd6aca6b34f2a1
check_blob ops/precision/void-datanet-registry-final-signing-review-v1.mjs dfd19e535d0dcbf94185de4381a2da2f1720e27f
check_blob tools/void-datanet-registry-deployer-credential-binding-v1.mjs c53f10da6e4ca8bed7bd5d56633c18dbb406835c
check_blob tools/void-datanet-registry-candidate-fresh-revalidation-v1.mjs 4fa0d23aa9698134b95c0e5808397490fbe80dec
check_blob tools/void-datanet-registry-final-signing-review-v1.mjs 97bb6985523cf4310365b5c885205509a6a1b593

git merge --ff-only "$REMOTE_HEAD"
test "$(git rev-parse HEAD)" = "$REMOTE_HEAD" || fail precision_sync_failed

printf '%s  %s\n' "$ACTIVATION_PLAN_SHA" "$ACTIVATION_PLAN" | sha256sum -c - || fail activation_plan_sha_mismatch
printf '%s  %s\n' "$ACTIVATION_RECEIPT_SHA" "$ACTIVATION_RECEIPT" | sha256sum -c - || fail activation_receipt_sha_mismatch
python3 - "$ACTIVATION_PLAN" "$ACTIVATION_RECEIPT" <<'PY'
import json,sys
p=json.load(open(sys.argv[1])); r=json.load(open(sys.argv[2]))
assert p['activation_plan_id']=='voide2qactp1_d2c34dccdd0fe4e46fae7da36853f5bbc8f6b0598900a0d4a6510e1fdff9eb3b'
assert r['activation_receipt_id']=='voide2qactr1_914e3bf88df083fef1a3c52aea6f1eb53ad2458d5559db01a6a83f0088928174'
assert r['activation_plan_id']==p['activation_plan_id']
print('historical_activation_lineage_exact=true')
PY

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="$HOME/Downloads/void_datanet_final_signing_review_sequence_v1_$STAMP"
mkdir -m 700 "$STAGE"
RESOLUTION="$STAGE/datanet-resolution.json"
DEPLOYMENT_PLAN="$STAGE/deployment-plan.json"
PRIOR_FEE="$STAGE/prior-fee-funding.json"
PRE_SIGN="$STAGE/pre-sign.json"
CANDIDATE_FEE="$STAGE/candidate-fresh-fee.json"
ADMISSION="$STAGE/construction-admission.json"
CANDIDATE="$STAGE/unsigned-candidate.json"
PRIOR_BINDING="$STAGE/prior-credential-binding.json"
REVALIDATION="$STAGE/candidate-revalidation.json"
REVALIDATION_FEE="$STAGE/revalidation-fresh-fee.json"
FRESH_BINDING="$STAGE/fresh-credential-binding.json"
FINAL_REVIEW="$STAGE/final-signing-review.json"

echo "=== PRE-AUTHENTICATE NIMO ==="
SSH_SOCK="$HOME/.ssh/void-datanet-final-review-$$.sock"
rm -f "$SSH_SOCK"
ssh -o ControlMaster=yes -o ControlPath="$SSH_SOCK" -o ControlPersist=600 -o BatchMode=no -o NumberOfPasswordPrompts=1 -o ConnectTimeout=10 -Nf Nimo

REMOTE_STAGE="/home/zoso/Downloads/void_datanet_final_signing_review_sequence_v1_$STAMP"
CREDENTIAL_DIR="$(ssh -S "$SSH_SOCK" -o BatchMode=yes Nimo bash -s -- "$REMOTE_HEAD" "$AUTH_FS_UUID" "$CREDENTIAL_REL" "$CREDENTIAL_ID" "$REMOTE_STAGE" <<'REMOTE'
set -Eeuo pipefail
expected="$1"; uuid="$2"; rel="$3"; cid="$4"; stage="$5"
test "$(hostname)" = Nimo
cd "$HOME/dev/void-node"
test "$(git branch --show-current)" = main
test -z "$(git status --porcelain=v1 --untracked-files=all)"
git fetch origin main >/dev/null
test "$(git rev-parse origin/main)" = "$expected"
git merge --ff-only origin/main >/dev/null
test "$(git rev-parse HEAD)" = "$expected"
clear="$(readlink -f "/dev/disk/by-uuid/$uuid")"
test -b "$clear"
mountpoint="$(findmnt -rn -S "$clear" -o TARGET | head -n1)"
test -n "$mountpoint"
findmnt -rn -T "$mountpoint" -o OPTIONS | tr ',' '\n' | grep -qx ro
cred="$mountpoint/$rel"
file="$cred/$cid"
test -d "$cred" && test ! -L "$cred"
test -f "$file" && test ! -L "$file"
case "$(stat -Lc '%a' "$file")" in 400|600) ;; *) exit 2 ;; esac
test "$(stat -Lc '%h' "$file")" = 1
test ! -e "$stage"
mkdir -m 700 "$stage"
printf '%s\n' "$cred"
REMOTE
)"
test -n "$CREDENTIAL_DIR" || fail credential_directory_resolution_failed

echo "=== FRESH LIVE LINEAGE / INPUT / FEE ==="
node ops/precision/void-datanet-registry-deployer-resolution-activation-bound-v1.mjs "$ACTIVATION_PLAN" "$ACTIVATION_RECEIPT" "$RESOLUTION"
node ops/precision/void-datanet-registry-unsigned-deployment-input-plan-v1.mjs "$ACTIVATION_PLAN" "$ACTIVATION_RECEIPT" "$RESOLUTION" "$DEPLOYMENT_PLAN"
node ops/precision/void-datanet-registry-deployment-fee-funding-v1.mjs "$ACTIVATION_PLAN" "$ACTIVATION_RECEIPT" "$RESOLUTION" "$DEPLOYMENT_PLAN" "$PRIOR_FEE"
python3 - "$PRIOR_FEE" <<'PY'
import json,sys
v=json.load(open(sys.argv[1])); p=v['packet']
assert v['status']=='READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN'
assert p['observation']['max_fee_per_gas_wei']=='0'
assert p['observation']['max_priority_fee_per_gas_wei']=='0'
assert p['observation']['minimum_additional_funding_wei']=='0'
assert p['observation']['deployer_funding_sufficient'] is True
print('fresh_zero_fee_funding_green=true')
PY

echo "=== 120-SECOND CANDIDATE WINDOW ==="
node ops/precision/void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs "$ACTIVATION_PLAN" "$ACTIVATION_RECEIPT" "$RESOLUTION" "$DEPLOYMENT_PLAN" "$PRIOR_FEE" "$PRE_SIGN" "$CANDIDATE_FEE"
node ops/precision/void-datanet-registry-transaction-construction-admission-v1.mjs "$DEPLOYMENT_PLAN" "$CANDIDATE_FEE" "$PRE_SIGN" "$ADMISSION"
node ops/precision/void-datanet-registry-unsigned-transaction-candidate-v1.mjs --confirmation "$CONSTRUCT_CONFIRM" --deployment-plan "$DEPLOYMENT_PLAN" --fresh-fee-packet "$CANDIDATE_FEE" --pre-sign "$PRE_SIGN" --admission "$ADMISSION" --output "$CANDIDATE"

scp -o ControlPath="$SSH_SOCK" -o BatchMode=yes -p "$DEPLOYMENT_PLAN" "$CANDIDATE_FEE" "$PRE_SIGN" "$ADMISSION" "$CANDIDATE" "Nimo:$REMOTE_STAGE/"
RPLAN="$REMOTE_STAGE/$(basename "$DEPLOYMENT_PLAN")"
RFEE="$REMOTE_STAGE/$(basename "$CANDIDATE_FEE")"
RPRE="$REMOTE_STAGE/$(basename "$PRE_SIGN")"
RADM="$REMOTE_STAGE/$(basename "$ADMISSION")"
RCAND="$REMOTE_STAGE/$(basename "$CANDIDATE")"
RB1="$REMOTE_STAGE/$(basename "$PRIOR_BINDING")"
RB2="$REMOTE_STAGE/$(basename "$FRESH_BINDING")"

bind_remote(){
  out="$1"
  ssh -S "$SSH_SOCK" -o BatchMode=yes Nimo bash -s -- "$BIND_CONFIRM" "$CREDENTIAL_DIR" "$RCAND" "$RPLAN" "$RFEE" "$RPRE" "$RADM" "$out" <<'REMOTE'
set -Eeuo pipefail
cd "$HOME/dev/void-node"
node ops/nimo/void-nimo-datanet-registry-deployer-credential-binding-v1.mjs \
  --confirmation "$1" --candidate "$3" --deployment-plan "$4" \
  --fresh-fee-packet "$5" --pre-sign "$6" --construction-admission "$7" \
  --credentials-directory "$2" --output "$8"
REMOTE
}

echo "=== NIMO INITIAL CREDENTIAL BIND ==="
bind_remote "$RB1"
scp -o ControlPath="$SSH_SOCK" -o BatchMode=yes -p "Nimo:$RB1" "$PRIOR_BINDING"

echo "=== PRECISION CANDIDATE REVALIDATION ==="
node ops/precision/void-datanet-registry-candidate-fresh-revalidation-v1.mjs "$ACTIVATION_PLAN" "$ACTIVATION_RECEIPT" "$RESOLUTION" "$DEPLOYMENT_PLAN" "$CANDIDATE_FEE" "$PRE_SIGN" "$ADMISSION" "$CANDIDATE" "$PRIOR_BINDING" "$REVALIDATION" "$REVALIDATION_FEE"

echo "=== NIMO FRESH CREDENTIAL REBIND ==="
bind_remote "$RB2"
scp -o ControlPath="$SSH_SOCK" -o BatchMode=yes -p "Nimo:$RB2" "$FRESH_BINDING"

echo "=== FINAL SIGNING REVIEW: HARD STOP BEFORE SIGNING ==="
node ops/precision/void-datanet-registry-final-signing-review-v1.mjs "$DEPLOYMENT_PLAN" "$CANDIDATE_FEE" "$PRE_SIGN" "$ADMISSION" "$CANDIDATE" "$PRIOR_BINDING" "$REVALIDATION" "$REVALIDATION_FEE" "$FRESH_BINDING" "$FINAL_REVIEW"

python3 - "$FINAL_REVIEW" "$CANDIDATE" <<'PY'
import hashlib,json,sys
raw=open(sys.argv[1],'rb').read(); r=json.loads(raw); c=json.load(open(sys.argv[2]))
assert r['status']=='FINAL_SIGNING_REVIEW_GREEN_SINGLE_TRANSACTION_AUTHORIZATION_REQUIRED'
assert r['signing_authorized'] is False
assert r['authority']['transaction_signing_authorized'] is False
assert r['authority']['transaction_signing'] is False
assert r['authority']['transaction_submission'] is False
assert r['authority']['transaction_broadcast'] is False
assert r['authority']['chain2050_mutation'] is False
assert r['authority']['funds_movement'] is False
print('final_signing_review_id='+r['final_signing_review_id'])
print('candidate_id='+r['candidate_id'])
print('unsigned_transaction_hash='+c['transaction']['unsigned_transaction_hash'])
print('final_review_valid_until_utc='+r['valid_until_utc'])
print('final_review_sha256='+hashlib.sha256(raw).hexdigest())
print('signing_authorized=false')
PY

cat <<TAIL
stage=$STAGE
remote_stage=$REMOTE_STAGE
credential_content_access_performed=true
private_key_access_performed=true
raw_private_key_output=false
private_key_digest_output=false
signer_object_exposed=false
transaction_signing_authorized=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
deployment=false
chain2050_mutation=false
funds_movement=false
VOID_DATANET_FINAL_SIGNING_REVIEW_SEQUENCE_V1_GREEN
VOID_DATANET_FINAL_SIGNING_REVIEW_SEQUENCE_V1_STOP reason=separate_exact_signing_authorization_required
TAIL
