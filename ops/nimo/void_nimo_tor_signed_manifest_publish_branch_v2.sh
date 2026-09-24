#!/usr/bin/env bash
set -euo pipefail
umask 077

MARKER="VOID_NIMO_TOR_SIGNED_MANIFEST_PUBLISH_BRANCH_V2"
REPO="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
EXPECTED_MAIN="104c3b4ead8970267204ddd5e77cea7b4ca02ddc"
EXPECTED_ROOT_ID="voidptr1_14f2cba76fc64e04cf8efd50e300dba21170f59e2c3441b33f6b415d31b1b839"
EXPECTED_KEY_ID="voidtpk1_6111a98528baf5e781f02456b17bd8f5f01ec0a5e81432366564e515be705c94"
EXPECTED_MANIFEST_ID="voidpbm1_6efd49d081dc92c8326577f61382e6e6410802b55ace6634ca104f9c12c501f8"
EXPECTED_QUALIFICATION_ID="voidptq1_93f0d98ac0ca398ccc93f7c23ac42494449e4a18f41a76edb772b4ce5e1dc116"
EXPECTED_ONION="6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion"
EXPECTED_SIGNED_SHA256="c542e5cc81298bf474b76aeea316203266c45ee043dfb8ae1cad24ae2fe7ad8b"
POINTER="$HOME/.local/state/void/tor-bootstrap-manifest-v1/current-signed-envelope-path"
DEST="public/bootstrap/tor-signed-v1.json"
BRANCH="publish/tor-signed-bootstrap-v1-20260924"
NODE_BIN="$(command -v node || true)"

echo "$MARKER"
echo "repo=$REPO"
echo "expected_main=$EXPECTED_MAIN"
echo "destination=$DEST"
echo "branch=$BRANCH"
echo "git_fetch=true"
echo "git_branch_create=true"
echo "git_commit=true"
echo "git_push=true"
echo "main_mutation=false"
echo "private_key_access=false"
echo "signature_generation=false"
echo "funds_movement=false"

test -n "$NODE_BIN" || { echo "REFUSE: node missing" >&2; exit 2; }
test "$(git -C "$REPO" branch --show-current)" = "main" || { echo "REFUSE: not on main" >&2; exit 3; }
test -z "$(git -C "$REPO" status --porcelain=v1)" || { echo "REFUSE: repo dirty" >&2; exit 3; }
test "$(git -C "$REPO" rev-parse HEAD)" = "$EXPECTED_MAIN" || { echo "REFUSE: local main mismatch" >&2; exit 3; }

git -C "$REPO" fetch origin main --quiet
test "$(git -C "$REPO" rev-parse origin/main)" = "$EXPECTED_MAIN" || {
  echo "REFUSE: origin/main moved" >&2
  exit 3
}

git -C "$REPO" show-ref --verify --quiet "refs/heads/$BRANCH" && {
  echo "REFUSE: local publish branch exists" >&2
  exit 3
}
git -C "$REPO" ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1 && {
  echo "REFUSE: remote publish branch exists" >&2
  exit 3
}
git -C "$REPO" cat-file -e "$EXPECTED_MAIN:$DEST" 2>/dev/null && {
  echo "REFUSE: destination already exists on main" >&2
  exit 3
}

test -f "$POINTER" && test ! -L "$POINTER" || { echo "REFUSE: signed pointer invalid" >&2; exit 3; }
SIGNED="$(tr -d '\r\n' < "$POINTER")"
case "$SIGNED" in
  "$HOME"/.local/state/void/tor-bootstrap-manifest-v1/signed-tor-bootstrap-*.json) ;;
  *) echo "REFUSE: signed envelope path escaped expected state root" >&2; exit 3 ;;
esac
test -f "$SIGNED" && test ! -L "$SIGNED" || { echo "REFUSE: signed envelope invalid" >&2; exit 3; }
test "$(sha256sum "$SIGNED" | awk '{print $1}')" = "$EXPECTED_SIGNED_SHA256" || {
  echo "REFUSE: signed envelope SHA mismatch" >&2
  exit 3
}
echo "signed_envelope=$SIGNED"
echo "signed_envelope_sha256=$EXPECTED_SIGNED_SHA256"

SIGNED="$SIGNED" REPO="$REPO" \
EXPECTED_ROOT_ID="$EXPECTED_ROOT_ID" EXPECTED_KEY_ID="$EXPECTED_KEY_ID" \
EXPECTED_MANIFEST_ID="$EXPECTED_MANIFEST_ID" EXPECTED_QUALIFICATION_ID="$EXPECTED_QUALIFICATION_ID" \
EXPECTED_ONION="$EXPECTED_ONION" \
"$NODE_BIN" --input-type=module <<'NODE'
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const lib=await import(pathToFileURL(path.join(process.env.REPO,"scripts/lib/void_tor_bootstrap_release_root_v1.mjs")).href);
const root=JSON.parse(fs.readFileSync(path.join(process.env.REPO,"config/void-tor-bootstrap-release-root-v1.json"),"utf8"));
const vr=lib.validateTorBootstrapReleaseRoot(root,{allowHold:false});
if(vr.root.root_id!==process.env.EXPECTED_ROOT_ID) throw new Error("root mismatch");
if(vr.root.keys.length!==1 || vr.root.keys[0].key_id!==process.env.EXPECTED_KEY_ID) throw new Error("key mismatch");
const env=JSON.parse(fs.readFileSync(process.env.SIGNED,"utf8"));
const ve=lib.validateTorBootstrapSignedManifest(env,vr,{nowMs:Date.now()});
if(ve.manifestId!==process.env.EXPECTED_MANIFEST_ID || ve.validSignatureCount!==1) throw new Error("signed envelope mismatch");
const ep=env.manifest.onion_endpoints?.[0];
if(env.manifest.onion_endpoints?.length!==1 ||
   ep?.qualification_id!==process.env.EXPECTED_QUALIFICATION_ID ||
   ep?.base!==`http://${process.env.EXPECTED_ONION}`) throw new Error("endpoint binding mismatch");
const remaining=Date.parse(env.manifest.expires_at)-Date.now();
if(!Number.isFinite(remaining) || remaining<10*60*1000) throw new Error(`insufficient manifest lifetime: ${Math.floor(remaining/1000)}s`);
console.log(`manifest_id=${ve.manifestId}`);
console.log(`valid_signature_count=${ve.validSignatureCount}`);
console.log(`manifest_expires_at=${env.manifest.expires_at}`);
console.log(`manifest_remaining_seconds=${Math.floor(remaining/1000)}`);
console.log("signed_envelope_contract_valid=true");
NODE

git -C "$REPO" switch -c "$BRANCH" >/dev/null
cleanup() {
  rc=$?
  if test "$rc" -ne 0; then
    git -C "$REPO" reset --hard "$EXPECTED_MAIN" >/dev/null 2>&1 || true
    git -C "$REPO" switch main >/dev/null 2>&1 || true
    git -C "$REPO" branch -D "$BRANCH" >/dev/null 2>&1 || true
  fi
  exit "$rc"
}
trap cleanup ERR

install -m 0644 "$SIGNED" "$REPO/$DEST"
test "$(sha256sum "$REPO/$DEST" | awk '{print $1}')" = "$EXPECTED_SIGNED_SHA256" || {
  echo "REFUSE: copied bytes changed" >&2
  exit 4
}

"$NODE_BIN" "$REPO/scripts/resolve_void_tor_public_bootstrap_release_root_v1.mjs" \
  --verify-only --signed-manifest-file "$REPO/$DEST"

git -C "$REPO" add -- "$DEST"
test "$(git -C "$REPO" diff --cached --name-only)" = "$DEST" || {
  echo "REFUSE: unexpected staged paths" >&2
  git -C "$REPO" diff --cached --name-only >&2
  exit 4
}
git -C "$REPO" diff --cached --check
git -C "$REPO" commit -m "feat(tor): publish signed bootstrap manifest v1" >/dev/null
echo "commit=$(git -C "$REPO" rev-parse HEAD)"
git -C "$REPO" push --set-upstream origin "$BRANCH"
trap - ERR

echo "push=true"
echo "${MARKER}_GREEN"
echo "main_mutated=false"
echo "private_key_access=false"
echo "signed_public_envelope_published_to_branch=true"
echo "next_gate=open_review_pr_and_run_multipath_acceptance"
