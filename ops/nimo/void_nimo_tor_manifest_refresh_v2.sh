#!/usr/bin/env bash
set -euo pipefail
umask 077

MARKER="VOID_NIMO_TOR_MANIFEST_REFRESH_V2"
REPO="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
EXPECTED_OLD_HEAD="104c3b4ead8970267204ddd5e77cea7b4ca02ddc"
EXPECTED_MAIN="b3dd74142ce33ffe3c456a42822e98eee885e4d9"
OLD_UNIT="void-nimo-tor-bootstrap-node-v4.service"
NEW_UNIT="void-nimo-tor-bootstrap-node-v5"
READY_URL="http://127.0.0.1:4100/__void/ready.json"
HOSTNAME_FILE="$HOME/.local/share/void/tor-public-seed-v1/hidden-service/hostname"
QUAL_DIR="$HOME/.local/state/void/tor-public-seed-v1/qualifications"
MANIFEST_DIR="$HOME/.local/state/void/tor-bootstrap-manifest-v1"
POINTER="$MANIFEST_DIR/current-candidate-path"
NODE_BIN="$(command -v node || true)"
EXPECTED_ROOT_ID="voidptr1_14f2cba76fc64e04cf8efd50e300dba21170f59e2c3441b33f6b415d31b1b839"
EXPECTED_KEY_ID="voidtpk1_6111a98528baf5e781f02456b17bd8f5f01ec0a5e81432366564e515be705c94"

echo "$MARKER"
echo "repo=$REPO"
echo "expected_old_head=$EXPECTED_OLD_HEAD"
echo "expected_main=$EXPECTED_MAIN"
echo "expected_root_id=$EXPECTED_ROOT_ID"
echo "expected_key_id=$EXPECTED_KEY_ID"
echo "git_fetch=true"
echo "git_fast_forward_only=true"
echo "node_restart=true"
echo "tor_service_restart=false"
echo "gateway_service_restart=false"
echo "tor_identity_mutation=false"
echo "fresh_tor_qualification=true"
echo "unsigned_manifest_build=true"
echo "manifest_validity_minutes=110"
echo "private_key_access=false"
echo "signature_generated=false"
echo "publication_performed=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "funds_movement=false"

test -n "$NODE_BIN" || { echo "REFUSE: node executable missing" >&2; exit 2; }

for cmd in git systemctl systemd-run curl ss sha256sum stat; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "REFUSE: missing command: $cmd" >&2
    exit 2
  }
done

test -d "$REPO/.git" || { echo "REFUSE: repository missing" >&2; exit 2; }
test "$(git -C "$REPO" branch --show-current)" = "main" || {
  echo "REFUSE: repository branch is not main" >&2
  exit 3
}
test -z "$(git -C "$REPO" status --porcelain=v1)" || {
  echo "REFUSE: repository is dirty" >&2
  exit 3
}
local_head="$(git -C "$REPO" rev-parse HEAD)"
test "$local_head" = "$EXPECTED_OLD_HEAD" || test "$local_head" = "$EXPECTED_MAIN" || {
  echo "REFUSE: Nimo repo head is unexpected: $local_head" >&2
  exit 3
}
echo "local_head=$local_head"

for unit in void-public-seed-tor-gateway-v1.service void-public-seed-tor-v1.service; do
  systemctl --user is-active --quiet "$unit" || {
    echo "REFUSE: required Tor unit is not active: $unit" >&2
    exit 3
  }
done

test -f "$HOSTNAME_FILE" || {
  echo "REFUSE: onion hostname file missing" >&2
  exit 3
}
ONION="$(tr -d '\r\n' < "$HOSTNAME_FILE")"
test "$ONION" = "6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion" || {
  echo "REFUSE: onion identity changed" >&2
  exit 3
}
echo "onion_hostname=$ONION"

echo
echo "=== PREDECESSOR READINESS ==="
ready_before="$(curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$READY_URL")"
printf 'readiness=%s\n' "$ready_before"
READY_JSON="$ready_before" "$NODE_BIN" --input-type=module <<'NODE'
const v=JSON.parse(process.env.READY_JSON);
if(v?.ready!==true || v?.gap!==0 || v?.txroot_live!==1 ||
   !Number.isSafeInteger(v?.head) || v.head<=0) process.exit(1);
console.log(`predecessor_head=${v.head}`);
console.log("predecessor_exact_green=true");
NODE

git -C "$REPO" fetch origin main --quiet
ORIGIN_MAIN="$(git -C "$REPO" rev-parse origin/main)"
test "$ORIGIN_MAIN" = "$EXPECTED_MAIN" || {
  echo "REFUSE: origin/main moved; expected $EXPECTED_MAIN got $ORIGIN_MAIN" >&2
  exit 3
}
echo "origin_main=$ORIGIN_MAIN"

if test "$local_head" = "$EXPECTED_OLD_HEAD"; then
  old_gateway_blob="$(git -C "$REPO" rev-parse "$EXPECTED_OLD_HEAD:tools/void-public-seed-gateway-v1.mjs")"
  new_gateway_blob="$(git -C "$REPO" rev-parse "$EXPECTED_MAIN:tools/void-public-seed-gateway-v1.mjs")"
  test "$old_gateway_blob" = "$new_gateway_blob" || {
    echo "REFUSE: Tor gateway source changed across source transition" >&2
    exit 3
  }
  echo "tor_gateway_blob_unchanged=$new_gateway_blob"
fi

if systemctl --user is-active --quiet "$OLD_UNIT" 2>/dev/null; then
  systemctl --user stop "$OLD_UNIT"
elif systemctl --user is-active --quiet "$NEW_UNIT.service" 2>/dev/null; then
  systemctl --user stop "$NEW_UNIT.service"
else
  echo "REFUSE: neither expected predecessor node unit is active" >&2
  exit 4
fi

for _ in $(seq 1 30); do
  if ! ss -H -ltn 2>/dev/null | awk '{print $4}' | grep -Eq '(^|:)4100$'; then
    break
  fi
  sleep 1
done
if ss -H -ltn 2>/dev/null | awk '{print $4}' | grep -Eq '(^|:)4100$'; then
  echo "REFUSE: TCP/4100 remained occupied after predecessor stop" >&2
  exit 4
fi
echo "predecessor_node_stopped=true"

if test "$(git -C "$REPO" rev-parse HEAD)" != "$EXPECTED_MAIN"; then
  git -C "$REPO" merge --ff-only origin/main >/dev/null
fi
test "$(git -C "$REPO" rev-parse HEAD)" = "$EXPECTED_MAIN" || {
  echo "REFUSE: fast-forward did not land on expected main" >&2
  exit 4
}
echo "repo_head=$EXPECTED_MAIN"

systemd-run --user \
  --unit="$NEW_UNIT" \
  --collect \
  --working-directory="$REPO" \
  --property=Restart=no \
  /usr/bin/env \
    -u BOOTSTRAP_ADDRS \
    -u BOOTSTRAP \
    -u VOID_FOLLOWER_AUTOSTART_PEERS \
    -u VOID_FOLLOWER_AUTOSTART_PEER \
    -u VOID_FOLLOWER_LEGACY_V2FS_ORIGINS \
    -u VOID_MAIN_BASE \
    -u VOID_DRIFT_PEER \
    -u VOID_PUBLIC_SEED_CLIENT_PEERS \
    -u VOID_TOR_PUBLIC_SEED_CLIENT_PEERS \
    -u VOID_SITE_BUNDLE_PEERS \
    -u VOID_DATANET_SITE_BUNDLE_PEERS \
    -u VOID_DATANET_PEERS \
    -u VOID_PUBLIC_BOOTSTRAP_DISABLE \
    -u VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL \
    -u VOID_PUBLIC_BOOTSTRAP_MANIFEST_URLS \
    -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY \
    -u http_proxy -u https_proxy -u all_proxy \
    VOID_PUBLIC_BOOTSTRAP_REQUIRE=1 \
    /usr/bin/bash "$REPO/run-void-node.sh" >/dev/null

echo "new_unit=$NEW_UNIT.service"

green=0
last=""
for i in $(seq 1 600); do
  if ! systemctl --user is-active --quiet "$NEW_UNIT.service" 2>/dev/null; then
    echo "REFUSE: canonical-main node exited before readiness" >&2
    journalctl --user-unit "$NEW_UNIT.service" -n 180 --no-pager >&2 || true
    exit 4
  fi
  if body="$(curl -fsS --noproxy '*' --connect-timeout 1 --max-time 3 "$READY_URL" 2>/dev/null)"; then
    last="$body"
    if READY_JSON="$body" "$NODE_BIN" --input-type=module <<'NODE' >/dev/null 2>&1
const v=JSON.parse(process.env.READY_JSON);
if(v?.ready!==true || v?.gap!==0 || v?.txroot_live!==1 ||
   !Number.isSafeInteger(v?.head) || v.head<=0) process.exit(1);
NODE
    then
      green=1
      break
    fi
  fi
  if (( i % 15 == 0 )); then echo "waiting_seconds=$i"; fi
  sleep 1
done

test "$green" -eq 1 || {
  echo "REFUSE: current-main node did not reach exact-green readiness" >&2
  test -n "$last" && echo "last_readiness=$last" >&2 || true
  exit 4
}

echo
echo "=== CURRENT MAIN READINESS ==="
printf 'readiness=%s\n' "$last"
READY_JSON="$last" "$NODE_BIN" --input-type=module <<'NODE'
const v=JSON.parse(process.env.READY_JSON);
console.log(`canonical_main_head=${v.head}`);
console.log("canonical_main_exact_green=true");
NODE

ROOT_FILE="$REPO/config/void-tor-bootstrap-release-root-v1.json"
ROOT_FILE="$ROOT_FILE" REPO="$REPO" EXPECTED_ROOT_ID="$EXPECTED_ROOT_ID" EXPECTED_KEY_ID="$EXPECTED_KEY_ID" \
"$NODE_BIN" --input-type=module <<'NODE'
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const lib = await import(pathToFileURL(`${process.env.REPO}/scripts/lib/void_tor_bootstrap_release_root_v1.mjs`).href);
const raw=JSON.parse(fs.readFileSync(process.env.ROOT_FILE,"utf8"));
const v=lib.validateTorBootstrapReleaseRoot(raw,{allowHold:false});
if(v.root.root_id!==process.env.EXPECTED_ROOT_ID) throw new Error("production Tor root ID mismatch");
if(v.root.status!=="active" || v.root.threshold!==1 || v.root.keys.length!==1) {
  throw new Error("production Tor root shape mismatch");
}
if(v.root.keys[0].key_id!==process.env.EXPECTED_KEY_ID) throw new Error("production Tor key ID mismatch");
console.log(`production_root_id=${v.root.root_id}`);
console.log(`production_key_id=${v.root.keys[0].key_id}`);
console.log("production_root_active=true");
NODE

mkdir -p "$QUAL_DIR" "$MANIFEST_DIR"
chmod 700 "$QUAL_DIR" "$MANIFEST_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
QUAL="$QUAL_DIR/qualification-${EXPECTED_MAIN}-${STAMP}-refresh-v2.json"

echo
echo "=== FRESH TOR QUALIFICATION ==="
echo "qualification_output=$QUAL"
"$NODE_BIN" "$REPO/scripts/qualify_void_public_seed_tor_v1.mjs" \
  --onion-hostname "$ONION" \
  --source-sha "$EXPECTED_MAIN" \
  --socks-host 127.0.0.1 \
  --socks-port 19051 \
  --virtual-port 80 \
  --samples 3 \
  --interval-ms 30000 \
  --output "$QUAL"

test -f "$QUAL" || { echo "REFUSE: qualification receipt missing" >&2; exit 5; }
QUAL_SHA="$(sha256sum "$QUAL" | awk '{print $1}')"
echo "qualification_sha256=$QUAL_SHA"

MANIFEST="$MANIFEST_DIR/unsigned-tor-bootstrap-${EXPECTED_MAIN}-${STAMP}-refresh-v2.json"
test ! -e "$MANIFEST" || { echo "REFUSE: manifest output already exists" >&2; exit 5; }

QUAL="$QUAL" MANIFEST="$MANIFEST" REPO="$REPO" EXPECTED_MAIN="$EXPECTED_MAIN" \
EXPECTED_ROOT_ID="$EXPECTED_ROOT_ID" QUAL_SHA="$QUAL_SHA" \
"$NODE_BIN" --input-type=module <<'NODE'
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const native = await import(pathToFileURL(`${process.env.REPO}/scripts/lib/void_tor_native_bootstrap_transport_v1.mjs`).href);
const rootLib = await import(pathToFileURL(`${process.env.REPO}/scripts/lib/void_tor_bootstrap_release_root_v1.mjs`).href);

const receipt=JSON.parse(fs.readFileSync(process.env.QUAL,"utf8"));
if(receipt?.schema!=="void_public_seed_tor_qualification_v1") throw new Error("receipt schema mismatch");
if(receipt?.source_sha!==process.env.EXPECTED_MAIN) throw new Error("receipt source mismatch");
if(!/^voidptq1_[0-9a-f]{64}$/.test(String(receipt?.qualification_id))) throw new Error("receipt qualification ID invalid");
if(receipt?.sample_count!==3) throw new Error("receipt sample count mismatch");
if(!Number.isSafeInteger(receipt?.maximum_head)||receipt.maximum_head<=0) throw new Error("receipt head invalid");
if(receipt?.transport?.socks_remote_dns!==true ||
   receipt?.transport?.dns_required!==false ||
   receipt?.transport?.cloud_account_required!==false ||
   receipt?.transport?.tailnet_required!==false) {
  throw new Error("receipt transport sovereignty mismatch");
}
for(const value of Object.values(receipt?.authority ?? {})) {
  if(value!==false) throw new Error("receipt carries authority");
}

const root=JSON.parse(fs.readFileSync(`${process.env.REPO}/config/void-tor-bootstrap-release-root-v1.json`,"utf8"));
const validatedRoot=rootLib.validateTorBootstrapReleaseRoot(root,{allowHold:false});
if(validatedRoot.root.root_id!==process.env.EXPECTED_ROOT_ID) throw new Error("root ID mismatch");

const generated=new Date();
const expires=new Date(generated.getTime()+110*60*1000);
const body={
  schema:"void_public_bootstrap_v1",
  network:"VOID Network",
  chain_id:2050,
  status:"stable_tor_seed",
  generated_at:generated.toISOString(),
  expires_at:expires.toISOString(),
  sync_endpoints:[],
  onion_endpoints:[{
    transport:"tor_v3_http",
    base:`http://${receipt.transport.onion_hostname}`,
    priority:0,
    enabled:true,
    temporary:false,
    qualification_id:receipt.qualification_id,
    qualified_at:receipt.generated_at,
    qualified_head:receipt.maximum_head,
  }],
  private_tailnet_endpoints_published:false,
  authority:{
    private_routes_exposed:false,
    wallet_authority:false,
    signer_authority:false,
    validator_authority:false,
    treasury_authority:false,
    work_credit_authority:false,
    money_movement_authority:false,
  },
  notes:`Nimo Tor v3 public seed; source ${process.env.EXPECTED_MAIN}; qualification receipt sha256 ${process.env.QUAL_SHA}; external GitHub reachability confirmed after Wi-Fi Tor restart`,
};
const manifest={...body,manifest_id:native.contentId("voidpbm1_",body,"manifest_id")};
const validated=rootLib.validateTorBootstrapManifestContract(manifest,Date.now());
if(validated.manifestId!==manifest.manifest_id) throw new Error("manifest ID mismatch");
fs.writeFileSync(process.env.MANIFEST,`${JSON.stringify(manifest,null,2)}\n`,{flag:"wx",mode:0o600});
console.log(`manifest_id=${manifest.manifest_id}`);
console.log(`manifest_generated_at=${manifest.generated_at}`);
console.log(`manifest_expires_at=${manifest.expires_at}`);
console.log(`qualification_id=${receipt.qualification_id}`);
console.log(`qualified_at=${receipt.generated_at}`);
console.log(`qualified_head=${receipt.maximum_head}`);
console.log(`onion_hostname=${receipt.transport.onion_hostname}`);
console.log("manifest_contract_valid=true");
console.log("manifest_signed=false");
NODE

test -f "$MANIFEST" || { echo "REFUSE: unsigned manifest missing" >&2; exit 5; }
MANIFEST_SHA="$(sha256sum "$MANIFEST" | awk '{print $1}')"
printf '%s\n' "$MANIFEST" >"$POINTER"
chmod 600 "$POINTER"

echo
echo "=== UNSIGNED MANIFEST ==="
echo "manifest_file=$MANIFEST"
echo "manifest_sha256=$MANIFEST_SHA"
echo "candidate_pointer=$POINTER"
echo "private_key_access=false"
echo "signature_generated=false"
echo "publication_performed=false"

final_ready="$(curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$READY_URL")"
READY_JSON="$final_ready" "$NODE_BIN" --input-type=module <<'NODE'
const v=JSON.parse(process.env.READY_JSON);
if(v?.ready!==true || v?.gap!==0 || v?.txroot_live!==1 ||
   !Number.isSafeInteger(v?.head) || v.head<=0) process.exit(1);
console.log(`post_manifest_head=${v.head}`);
console.log("post_manifest_exact_green=true");
NODE

echo "${MARKER}_GREEN"
echo "next_gate=disconnect_network_and_sign_exact_refreshed_manifest"
