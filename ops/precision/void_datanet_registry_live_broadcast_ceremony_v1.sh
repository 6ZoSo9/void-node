#!/usr/bin/env bash
(
set -Eeuo pipefail
umask 077

repo="$HOME/dev/void-node"
required_merge="b1d832035e98be201f10e0f6985847e8ad205f51"
stage="$HOME/Downloads/void_datanet_final_signing_review_sequence_v1_20261002T205025Z"
signed_sha256="344018874a6719dd60faf9d7a251573cbcf87fcd932237a3eaaf19c06be82e1a"
state="$HOME/.local/state/void/datanet-registry-broadcast-v1"

cd "$repo"

test "$(git branch --show-current)" = "main"
test -z "$(git status --porcelain=v1 --untracked-files=all)"

git fetch origin main
git merge --ff-only origin/main
git merge-base --is-ancestor "$required_merge" HEAD

test "$(git hash-object tools/void-datanet-registry-signed-verification-broadcast-request-v1.mjs)" = "d0611910a1eba7b602f492adbd0691c9a8059aa9"
test "$(git hash-object tools/void-datanet-registry-single-transaction-broadcast-authorization-v1.mjs)" = "ae863b9b2216ea5acc91ca55e82c3c307b603a6b"
test "$(git hash-object ops/precision/void-datanet-registry-single-transaction-broadcast-authorization-v1.mjs)" = "a4d9ccebf8e2494ece68b84f46fda5f945081245"
test "$(git hash-object tools/void-datanet-registry-prebroadcast-observer-v1.mjs)" = "a2ef7d0f3a52239e39da65707b40d1514ccf254c"
test "$(git hash-object ops/precision/void-datanet-registry-prebroadcast-observer-v1.mjs)" = "c52832bc968587a46059288ae9ca3e7c60b2ea49"
test "$(git hash-object tools/void-datanet-registry-single-use-broadcast-authorization-consumption-v1.mjs)" = "6ac45b2eca7c63e6e1d169dc1b5ff750878302b5"
test "$(git hash-object ops/precision/void-datanet-registry-broadcast-authorization-consumption-v1.mjs)" = "8c6580143622508da694a510be5ec8f3dcc72c8a"
test "$(git hash-object tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs)" = "2b2a3f06d0ca8748a70b8e976d71c48cf7a74fb4"
test "$(git hash-object ops/precision/void-datanet-registry-exact-single-broadcast-execution-v1.mjs)" = "642bc6988fdc9bd6a0828bb6b650af39da6dcc7a"

printf '%s  %s\n' "$signed_sha256" "$stage/signed-transaction.json" | sha256sum -c -

for f in \
  "$stage/unsigned-candidate.json" \
  "$stage/deployment-plan.json" \
  "$stage/candidate-fresh-fee.json" \
  "$stage/pre-sign.json" \
  "$stage/construction-admission.json" \
  "$stage/prior-credential-binding.json" \
  "$stage/candidate-revalidation.json" \
  "$stage/revalidation-fresh-fee.json" \
  "$stage/fresh-credential-binding.json" \
  "$stage/final-signing-review.json" \
  "$stage/signing-request.json" \
  "$stage/signing-authorization.json" \
  "$stage/signed-transaction.json" \
  "$stage/signed-verification-fixed-v1.json" \
  "$stage/broadcast-request-fixed-v1.json"
do
  test -f "$f"
done

if [ ! -e "$state" ]; then
  install -d -m 700 "$state"
fi

test -d "$state"
test ! -L "$state"
test "$(stat -Lc '%U' "$state")" = "$USER"
test "$(stat -Lc '%a' "$state")" = "700"
test -z "$(find "$state" -mindepth 1 -maxdepth 1 -print -quit)"

node scripts/prove_void_datanet_registry_exact_single_broadcast_execution_v1.mjs >/dev/null

attempt="$stage/broadcast-live-v1_$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 700 "$attempt"

authorization="$attempt/broadcast-authorization.json"
observation="$attempt/prebroadcast-observation.json"
consumption="$attempt/broadcast-consumption.json"
execution="$attempt/broadcast-execution.json"

confirmation="$(node - "$stage/broadcast-request-fixed-v1.json" <<'NODE'
const fs=require("fs");
const j=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
process.stdout.write(j.required_confirmation);
NODE
)"

node - \
  "$stage/unsigned-candidate.json" \
  "$stage/signed-transaction.json" \
  "$stage/broadcast-request-fixed-v1.json" <<'NODE'
const fs=require("fs");
const [candidateFile,signedFile,requestFile]=process.argv.slice(2);
const c=JSON.parse(fs.readFileSync(candidateFile,"utf8"));
const s=JSON.parse(fs.readFileSync(signedFile,"utf8"));
const r=JSON.parse(fs.readFileSync(requestFile,"utf8"));

const expected={
  chain_id:"2050",
  nonce:"0",
  from_address:"0x6c93ddfcc4116574fe66d63c1c67daedc0070dbb",
  predicted_contract_address:"0xe60b15ed8df7c4ec5334067ead18c924744c2681",
  gas_limit:"846479",
  max_fee_per_gas_wei:"0",
  max_priority_fee_per_gas_wei:"0",
  value_wei:"0",
  signed_transaction_id:"voiddrstx1_a9b5ac81fe5d3cf69993c6782b28ea990b24bc7a3bf6fc517eab81a2fa997eb0",
  signed_transaction_hash:"0x733ba7e0385179b7ff97c53eb1f1a63c0711c774ff4fead38f64169a20026188",
};
for(const [k,v] of Object.entries(expected)){
  let got;
  if(k==="signed_transaction_id"||k==="signed_transaction_hash") got=s[k];
  else got=c.transaction[k];
  if(got!==v) throw new Error("exact_consequence_mismatch:"+k+":"+String(got));
}
if(r.signed_transaction_id!==expected.signed_transaction_id) throw new Error("request_signed_id_mismatch");
if(r.transaction_summary?.signed_transaction_hash!==expected.signed_transaction_hash) throw new Error("request_signed_hash_mismatch");
NODE

cat <<EOF

VOID DATANET REGISTRY LIVE BROADCAST CEREMONY V1

This authorization permits ONE Chain-2050 eth_sendRawTransaction attempt.

chain_id=2050
deployer=0x6c93ddfcc4116574fe66d63c1c67daedc0070dbb
nonce=0
native_value_wei=0
gas_limit=846479
max_fee_per_gas_wei=0
max_priority_fee_per_gas_wei=0
maximum_native_fee_spend_wei=0
predicted_contract_address=0xe60b15ed8df7c4ec5334067ead18c924744c2681
signed_transaction_hash=0x733ba7e0385179b7ff97c53eb1f1a63c0711c774ff4fead38f64169a20026188
one_submission_attempt_only=true
replacement_transaction=false
automatic_retry=false

The next line is the exact operation-bound authorization:
$confirmation

Paste that exact full line below to authorize the one broadcast attempt,
or press Ctrl-C to stop with no Chain-2050 write.

EOF

printf '> '
IFS= read -r entered

if [ "$entered" != "$confirmation" ]; then
  echo "HOLD: exact broadcast authorization mismatch"
  exit 30
fi

node ops/precision/void-datanet-registry-single-transaction-broadcast-authorization-v1.mjs \
  --candidate "$stage/unsigned-candidate.json" \
  --deployment-plan "$stage/deployment-plan.json" \
  --candidate-fee-packet "$stage/candidate-fresh-fee.json" \
  --pre-sign "$stage/pre-sign.json" \
  --construction-admission "$stage/construction-admission.json" \
  --prior-binding "$stage/prior-credential-binding.json" \
  --candidate-revalidation "$stage/candidate-revalidation.json" \
  --revalidation-fee-packet "$stage/revalidation-fresh-fee.json" \
  --fresh-binding "$stage/fresh-credential-binding.json" \
  --final-signing-review "$stage/final-signing-review.json" \
  --signing-request "$stage/signing-request.json" \
  --signing-authorization "$stage/signing-authorization.json" \
  --signed-transaction "$stage/signed-transaction.json" \
  --signed-verification "$stage/signed-verification-fixed-v1.json" \
  --broadcast-request "$stage/broadcast-request-fixed-v1.json" \
  --confirmation "$entered" \
  --output "$authorization"

node ops/precision/void-datanet-registry-prebroadcast-observer-v1.mjs \
  --broadcast-request "$stage/broadcast-request-fixed-v1.json" \
  --broadcast-authorization "$authorization" \
  --output "$observation"

node - "$authorization" "$observation" <<'NODE'
const fs=require("fs");
const [aFile,oFile]=process.argv.slice(2);
const a=JSON.parse(fs.readFileSync(aFile,"utf8"));
const o=JSON.parse(fs.readFileSync(oFile,"utf8"));
const now=Date.now();
const authRemaining=Date.parse(a.valid_until_utc)-now;
const obsRemaining=Date.parse(o.valid_until_utc)-now;
if(authRemaining<60000) throw new Error("authorization_window_too_short_before_consumption");
if(obsRemaining<60000) throw new Error("prebroadcast_window_too_short_before_consumption");
NODE

node ops/precision/void-datanet-registry-broadcast-authorization-consumption-v1.mjs \
  --broadcast-request "$stage/broadcast-request-fixed-v1.json" \
  --broadcast-authorization "$authorization" \
  --prebroadcast-observation "$observation" \
  --state-dir "$state" \
  --output "$consumption"

node ops/precision/void-datanet-registry-exact-single-broadcast-execution-v1.mjs \
  --broadcast-request "$stage/broadcast-request-fixed-v1.json" \
  --broadcast-authorization "$authorization" \
  --prebroadcast-observation "$observation" \
  --signed-transaction "$stage/signed-transaction.json" \
  --state-dir "$state" \
  --confirmation "$entered" \
  --output "$execution"

echo
echo "VOID_DATANET_REGISTRY_LIVE_BROADCAST_CEREMONY_V1_COMPLETE"
echo "attempt=$attempt"
echo "authorization=$authorization"
echo "observation=$observation"
echo "consumption=$consumption"
echo "execution=$execution"
sha256sum "$authorization" "$observation" "$consumption" "$execution"
echo "automatic_retry=false"
echo "replacement_transaction=false"
echo "STOP: inspect execution classification and receipt before any later finalization action"
)
