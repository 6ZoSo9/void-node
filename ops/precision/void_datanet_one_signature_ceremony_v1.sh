#!/usr/bin/env bash
(
set -Eeuo pipefail
umask 077

repo="$HOME/dev/void-node"
runner="$HOME/Downloads/void_datanet_final_signing_review_sequence_v1.sh"
sock="$HOME/.ssh/void-datanet-signing-v1.sock"
credential_dir="/media/zoso/VOID_AUTHORITY/void-authority/datanet-content-commitment-registry-deployer-v1"
log=""

cleanup() {
  ssh -S "$sock" -O exit Nimo >/dev/null 2>&1 || true
  [ -z "$log" ] || rm -f "$log"
}
trap cleanup EXIT

cd "$repo"
test "$(git branch --show-current)" = "main"
test -z "$(git status --porcelain=v1 --untracked-files=all)"

rm -f "$sock"
ssh -M -S "$sock" -fnNT -o ControlPersist=10m Nimo

ssh -S "$sock" Nimo '
set -e
root="$HOME/.local/state/void/datanet-registry-signing-v1"
identity="$HOME/.config/void/datanet-registry-signing-state-identity-v1.json"
cred_dir="/media/zoso/VOID_AUTHORITY/void-authority/datanet-content-commitment-registry-deployer-v1"
cred="$cred_dir/datanet-content-commitment-registry-deployer-wallet-v1"
test -d "$root"
test "$(stat -Lc %a "$root")" = 700
test -f "$identity"
test "$(stat -Lc %a "$identity")" = 600
findmnt -rn -T /media/zoso/VOID_AUTHORITY -o OPTIONS | tr "," "\n" | grep -qx ro
test -d "$cred_dir"
test "$(stat -Lc %a "$cred_dir")" = 700
test -f "$cred"
test ! -L "$cred"
test "$(stat -Lc %U "$cred")" = "$USER"
test "$(stat -Lc %h "$cred")" = 1
case "$(stat -Lc %a "$cred")" in 400|600) ;; *) exit 23 ;; esac
printf "NIMO_SIGNING_PREFLIGHT_GREEN\n"
'

log="$(mktemp)"
bash "$runner" | tee "$log"
stage="$(sed -n 's/^stage=//p' "$log" | tail -n1)"
test -n "$stage"
test -d "$stage"

request="$stage/signing-request.json"
authorization="$stage/signing-authorization.json"
signed="$stage/signed-transaction.json"

cd "$repo"

test "$(git hash-object tools/void-datanet-registry-exact-signing-request-v1.mjs)" = "37b33c8d14558fb6b5bb00ef198bad9b38e47d5e"
test "$(git hash-object ops/precision/void-datanet-registry-exact-signing-request-v1.mjs)" = "bd740f97adff40fb51d1c00adda606afc355a810"
test "$(git hash-object tools/void-datanet-registry-single-transaction-signing-authorization-v1.mjs)" = "cb5bf8440e11cc1106c3d1fe264ee3277aedef67"
test "$(git hash-object ops/precision/void-datanet-registry-single-transaction-signing-authorization-v1.mjs)" = "3efb19f0028dbb632ed432951a53c118799b4e81"
test "$(git hash-object tools/void-datanet-registry-single-use-signing-authorization-consumption-v1.mjs)" = "021601a3603176d4496df256b60272ab78869969"
test "$(git hash-object tools/void-datanet-registry-consumed-authorization-signing-v1.mjs)" = "ff09684bd2109f45f76541eacce72bdbf1e3ef60"

ssh -S "$sock" Nimo '
set -e
cd "$HOME/dev/void-node"
test "$(git hash-object ops/nimo/void-nimo-datanet-registry-signing-authorization-consumption-v1.mjs)" = "77eaca55b6eb8f835849426a23fd2a0a7f12a739"
test "$(git hash-object ops/nimo/void-nimo-datanet-registry-consumed-authorization-signing-v1.mjs)" = "ff9dba801553229a7e51c1c7efd7e06281872bad"
test "$(git hash-object tools/void-datanet-registry-single-use-signing-authorization-consumption-v1.mjs)" = "021601a3603176d4496df256b60272ab78869969"
test "$(git hash-object tools/void-datanet-registry-consumed-authorization-signing-v1.mjs)" = "ff09684bd2109f45f76541eacce72bdbf1e3ef60"
'

node ops/precision/void-datanet-registry-exact-signing-request-v1.mjs \
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
  "$request"

confirmation="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.required_confirmation)' "$request")"
expiry="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.valid_until_utc)' "$request")"

printf '\nEXACT ONE-SIGNATURE AUTHORIZATION REQUIRED\n%s\n\n' "$confirmation"
printf 'Paste that exact full line here (or Ctrl-C to stop):\n> '
IFS= read -r entered

if [ "$entered" != "$confirmation" ]; then
  echo "HOLD: exact signing authorization mismatch"
  exit 24
fi

remaining_ms="$(node -e 'process.stdout.write(String(Date.parse(process.argv[1])-Date.now()))' "$expiry")"
if [ "$remaining_ms" -lt 25000 ]; then
  echo "HOLD: less than 25 seconds remain; no authorization consumed and nothing signed"
  exit 25
fi

node ops/precision/void-datanet-registry-single-transaction-signing-authorization-v1.mjs \
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
  "$request" \
  "$authorization" \
  --confirmation "$entered"

scp -q -o ControlPath="$sock" \
  "$stage/final-signing-review.json" \
  "$request" \
  "$authorization" \
  "Nimo:$stage/"

ssh -S "$sock" Nimo "
set -Eeuo pipefail
cd \"\$HOME/dev/void-node\"
stage='$stage'
confirmation='$entered'
credential_dir='$credential_dir'

node ops/nimo/void-nimo-datanet-registry-signing-authorization-consumption-v1.mjs \\
  \"\$stage/unsigned-candidate.json\" \\
  \"\$stage/deployment-plan.json\" \\
  \"\$stage/candidate-fresh-fee.json\" \\
  \"\$stage/pre-sign.json\" \\
  \"\$stage/construction-admission.json\" \\
  \"\$stage/prior-credential-binding.json\" \\
  \"\$stage/candidate-revalidation.json\" \\
  \"\$stage/revalidation-fresh-fee.json\" \\
  \"\$stage/fresh-credential-binding.json\" \\
  \"\$stage/final-signing-review.json\" \\
  \"\$stage/signing-request.json\" \\
  \"\$stage/signing-authorization.json\"

node ops/nimo/void-nimo-datanet-registry-consumed-authorization-signing-v1.mjs \\
  --candidate \"\$stage/unsigned-candidate.json\" \\
  --deployment-plan \"\$stage/deployment-plan.json\" \\
  --candidate-fee-packet \"\$stage/candidate-fresh-fee.json\" \\
  --pre-sign \"\$stage/pre-sign.json\" \\
  --construction-admission \"\$stage/construction-admission.json\" \\
  --prior-binding \"\$stage/prior-credential-binding.json\" \\
  --candidate-revalidation \"\$stage/candidate-revalidation.json\" \\
  --revalidation-fee-packet \"\$stage/revalidation-fresh-fee.json\" \\
  --fresh-binding \"\$stage/fresh-credential-binding.json\" \\
  --final-signing-review \"\$stage/final-signing-review.json\" \\
  --signing-request \"\$stage/signing-request.json\" \\
  --signing-authorization \"\$stage/signing-authorization.json\" \\
  --credentials-directory \"\$credential_dir\" \\
  --confirmation \"\$confirmation\" \\
  --output \"\$stage/signed-transaction.json\"
"

scp -q -o ControlPath="$sock" "Nimo:$stage/signed-transaction.json" "$signed"
chmod 600 "$signed"

printf '\nVOID_DATANET_ONE_SIGNATURE_CEREMONY_GREEN\n'
printf 'signed_artifact=%s\n' "$signed"
sha256sum "$signed"
printf 'transaction_broadcast_authorized=false\n'
printf 'transaction_broadcast=false\n'
printf 'chain2050_write=false\n'
printf 'STOP: separate exact broadcast authorization required\n'
)
