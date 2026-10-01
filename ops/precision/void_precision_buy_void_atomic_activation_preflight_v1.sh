#!/usr/bin/env bash
set -Eeuo pipefail
set +H

MARKER="VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_WRAPPER_V1"
REVIEWED_MAIN_ANCHOR="74b5242dde224282de5b1b881d7d4cb942f00d48"
repo="${VOID_LIVE_REPO_ROOT:-$HOME/dev/void-node}"
unit="void-node-live.service"
tool="${1:-}"
git_bin="/usr/bin/git"
canonical_remote_url="https://github.com/6ZoSo9/void-node.git"
wrapper_rel="ops/precision/void_precision_buy_void_atomic_activation_preflight_v1.sh"
tool_rel="tools/void-buy-void-precision-atomic-activation-preflight-v1.mjs"

say(){ printf '%s\n' "$*"; }
hold(){ say "${MARKER}_HOLD reason=$*" >&2; exit 2; }

safe_git(){
  env \
    -u GIT_DIR \
    -u GIT_WORK_TREE \
    -u GIT_COMMON_DIR \
    -u GIT_INDEX_FILE \
    -u GIT_OBJECT_DIRECTORY \
    -u GIT_ALTERNATE_OBJECT_DIRECTORIES \
    -u GIT_NAMESPACE \
    -u GIT_REPLACE_REF_BASE \
    -u GIT_CONFIG_PARAMETERS \
    -u GIT_CONFIG_COUNT \
    -u GIT_EXEC_PATH \
    -u GIT_SSH \
    -u GIT_SSH_COMMAND \
    -u GIT_ASKPASS \
    -u SSH_ASKPASS \
    -u GIT_EXTERNAL_DIFF \
    -u GIT_PAGER \
    -u GIT_EDITOR \
    -u GIT_SEQUENCE_EDITOR \
    PATH=/usr/bin:/bin GIT_OPTIONAL_LOCKS=0 LANG=C LC_ALL=C \
    "$git_bin" --no-replace-objects -C "$repo" "$@"
}

safe_git_timeout(){
  env \
    -u GIT_DIR \
    -u GIT_WORK_TREE \
    -u GIT_COMMON_DIR \
    -u GIT_INDEX_FILE \
    -u GIT_OBJECT_DIRECTORY \
    -u GIT_ALTERNATE_OBJECT_DIRECTORIES \
    -u GIT_NAMESPACE \
    -u GIT_REPLACE_REF_BASE \
    -u GIT_CONFIG_PARAMETERS \
    -u GIT_CONFIG_COUNT \
    -u GIT_EXEC_PATH \
    -u GIT_SSH \
    -u GIT_SSH_COMMAND \
    -u GIT_ASKPASS \
    -u SSH_ASKPASS \
    -u GIT_EXTERNAL_DIFF \
    -u GIT_PAGER \
    -u GIT_EDITOR \
    -u GIT_SEQUENCE_EDITOR \
    PATH=/usr/bin:/bin GIT_OPTIONAL_LOCKS=0 LANG=C LC_ALL=C \
    timeout 15 "$git_bin" --no-replace-objects -C "$repo" "$@"
}

say "$MARKER"
say "read_only=true"
say "source_mutation=false"
say "dropin_mutation=false"
say "daemon_reload=false"
say "service_mutation=false"
say "runtime_gate_mutation=false"
say "credential_read_before_gate_inventory=false"
say "database_connection_before_gate_inventory=false"
say "transaction_broadcast=false"
say "funds_movement=false"

for cmd in systemctl python3 node curl sha256sum mktemp timeout awk readlink sort wc; do
  command -v "$cmd" >/dev/null 2>&1 ||
    hold "required_command_missing:$cmd"
done
test -x "$git_bin" || hold "reviewed_git_executable_missing"

test -n "$tool" && test -f "$tool" || hold "preflight_tool_missing"
test "$repo" = "/home/zoso/dev/void-node" || hold "live_repo_root_mismatch"
test -d "$repo/.git" || hold "live_repo_missing"
cd "$repo"

test "$(hostname)" = "zoso-Precision-Tower-7810" ||
  hold "designated_host_mismatch"
test "$(safe_git branch --show-current)" = "main" ||
  hold "live_repo_not_main"
test -z "$(safe_git status --porcelain=v1 --untracked-files=all)" ||
  hold "live_repo_dirty"
head="$(safe_git rev-parse HEAD)"
tree="$(safe_git rev-parse 'HEAD^{tree}')"
[[ "$head" =~ ^[0-9a-f]{40}$ ]] || hold "live_repo_head_invalid"
[[ "$tree" =~ ^[0-9a-f]{40}$ ]] || hold "live_repo_tree_invalid"

origin_url="$(safe_git remote get-url origin)"
test "$origin_url" = "$canonical_remote_url" ||
  hold "canonical_remote_url_mismatch"

remote_main="$(
  safe_git_timeout ls-remote --heads "$canonical_remote_url" refs/heads/main |
    awk 'NR==1 {print $1}'
)"
[[ "$remote_main" =~ ^[0-9a-f]{40}$ ]] ||
  hold "remote_main_identity_unavailable"
test "$head" = "$remote_main" ||
  hold "live_repo_head_not_remote_main:local=$head:remote=$remote_main"

safe_git merge-base --is-ancestor "$REVIEWED_MAIN_ANCHOR" "$head" ||
  hold "reviewed_main_anchor_not_ancestor"

wrapper_path="$(readlink -f "${BASH_SOURCE[0]}")"
test "$wrapper_path" = "$repo/$wrapper_rel" ||
  hold "preflight_wrapper_path_not_canonical"
wrapper_head_blob="$(safe_git rev-parse "HEAD:$wrapper_rel")"
wrapper_actual_blob="$(safe_git hash-object "$wrapper_path")"
test "$wrapper_actual_blob" = "$wrapper_head_blob" ||
  hold "preflight_wrapper_not_current_head_bytes"

tool_head_blob="$(safe_git rev-parse "HEAD:$tool_rel")"
tool_actual_blob="$(safe_git hash-object "$tool")"
test "$tool_actual_blob" = "$tool_head_blob" ||
  hold "preflight_tool_not_current_head_bytes"
say "preflight_wrapper_blob_green=true"
say "preflight_tool_blob_green=true"

declare -A reviewed_source_blob=(
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts"]="4e5d9a633b05d9254424c2132fc6620b94ff3692"
  ["ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json"]="ed853b88329cd3a708b22a025cec0fe48540168a"
  ["tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs"]="db6a56b56eea4fe150ad1ebc98519bc263b70ee2"
  ["ops/precision/void_precision_buy_void_postgres_host_qualification_v1.sh"]="e92c8c73823323d4d77e5edb2bd2f41bd6a2dd16"
  ["tools/void-precision-buy-void-postgres-host-qualification-v1.mjs"]="18d16f3528155bc118a9f1d4dcca4dc6663db40d"
  ["ops/systemd/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf.example"]="a3500a7f1813972b90e5c00dbf8a03ed4b4ddd6b"
  ["ops/systemd/void-node-live.service.d/92-buy-void-dispatcher-postgres-credentials-v1.conf.example"]="dfe25fac6dfd98bc884ade38fe5196e6c048f60b"
  ["ops/systemd/void-node-live.service.d/94-buy-void-claimed-postgres-precision-reconcile-v1.conf.example"]="67981a141ebfc8a05902fdefc21a8db58946329c"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.ts"]="7133a3a7ebb9349d195cc090787a134f07616a3e"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.ts"]="066b5d3fde11ec79a8c6bb45f2ec5d6fec511e1f"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.ts"]="88c72330c5a5b92780f2c6add7dda7dd5e92af10"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.ts"]="aae34461ac47b3c5cbdecf75e6f6aa5935df677e"
  ["src/economic/buy_void_runtime_integration_v1.ts"]="00dad9a345dcbdc9d96bc0f61543f8d0db63e0ac"
  ["src/economic/buy_void_payment_keyed_full_runtime_v1.ts"]="1c238ae8dff7e088421eabff93a98d97357d99e7"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.ts"]="2db30a0d7f343c5c1264d89ec5c752ade609d843"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.ts"]="f74cafa7665be4ac0ea4fd518ec02440d337fa27"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_v1.ts"]="27045345cf48cacd2a5f2bc9330812579d0761a4"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_contract_v1.ts"]="1495c6dd21cfda1608ea29885d98617784a04bb0"
  ["package.json"]="f28c3e9446c7623ef203da36a9642d046e5f34ee"
  ["package-lock.json"]="b2671f0149f522b2489247016df0a5ec4bb72b8b"
)

source_slice_material="$(
  {
    printf '%s=%s\n' "$wrapper_rel" "$wrapper_head_blob"
    printf '%s=%s\n' "$tool_rel" "$tool_head_blob"
    for rel in "${!reviewed_source_blob[@]}"; do
      actual="$(safe_git rev-parse "HEAD:$rel")"
      test "$actual" = "${reviewed_source_blob[$rel]}" ||
        hold "reviewed_source_slice_blob_mismatch:$rel"
      printf '%s=%s\n' "$rel" "$actual"
    done
  } | LC_ALL=C sort
)"
source_slice_count="$(printf '%s\n' "$source_slice_material" | sed '/^$/d' | wc -l | tr -d ' ')"
test "$source_slice_count" = "22" ||
  hold "reviewed_source_slice_count_mismatch"
source_slice_manifest_sha256="$(
  printf '%s\n' "$source_slice_material" | sha256sum | awk '{print $1}'
)"
[[ "$source_slice_manifest_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "reviewed_source_slice_manifest_invalid"

say "canonical_remote_url=$canonical_remote_url"
say "live_repo_head=$head"
say "live_repo_tree=$tree"
say "remote_main_sha=$remote_main"
say "reviewed_main_anchor_sha=$REVIEWED_MAIN_ANCHOR"
say "reviewed_main_anchor_is_ancestor=true"
say "reviewed_source_slice_count=$source_slice_count"
say "reviewed_source_slice_manifest_sha256=$source_slice_manifest_sha256"
say "reviewed_source_slice_green=true"
say "live_repo_source_alignment_green=true"

test "$(systemctl --user is-active "$unit")" = "active" ||
  hold "void_node_service_not_active"
pid="$(systemctl --user show "$unit" -p MainPID --value)"
[[ "$pid" =~ ^[1-9][0-9]*$ ]] || hold "void_node_main_pid_invalid"
process_cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
test "$process_cwd" = "$repo" ||
  hold "void_node_process_cwd_mismatch"
say "void_node_main_pid=$pid"
say "void_node_process_cwd=$process_cwd"

tsx="$repo/node_modules/.bin/tsx"
test -x "$tsx" || hold "tsx_runtime_missing"

tmp="$(mktemp -d "${TMPDIR:-/tmp}/void-buy-void-atomic-preflight.XXXXXX")"
cleanup(){ rm -rf "$tmp"; }
trap cleanup EXIT INT TERM

gate_sources_json="$tmp/gate-sources.json"
configured_raw="$tmp/configured-environment.txt"
configured_json="$tmp/configured-gates.json"
process_json="$tmp/process-gates.json"
runtime_status_raw="$tmp/runtime-status-raw.json"
runtime_status_json="$tmp/runtime-status.json"
pg_log="$tmp/postgres-qualification.log"
pg_json="$tmp/postgres-qualification.json"
snapshot="$tmp/preflight-snapshot.json"

fragment_path="$(systemctl --user show "$unit" -p FragmentPath --value)"
test -n "$fragment_path" && test -f "$fragment_path" ||
  hold "unit_fragment_path_invalid"

mapfile -t dropins < <(
  systemctl --user show "$unit" -p DropInPaths --value |
    tr ' ' '\n' |
    sed '/^$/d'
)
test "${#dropins[@]}" -gt 0 || hold "dropin_paths_empty"

gate_source_paths=("$fragment_path" "${dropins[@]}")
python3 - "$gate_sources_json" "${gate_source_paths[@]}" <<'PY'
import hashlib,json,os,re,sys

out=sys.argv[1]
paths=sys.argv[2:]
gates={
  "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
}
rx=re.compile(r'^Environment="?([A-Z0-9_]+)=([01])"?$')
rows=[]
for p in paths:
    if not os.path.isfile(p):
        raise SystemExit("dropin_not_regular:"+p)
    data=open(p,'rb').read()
    assignments={}
    text=data.decode('utf-8','strict')
    for raw in text.splitlines():
        line=raw.strip()
        if not line or line.startswith('#'):
            continue
        if not any(name in line for name in gates):
            continue
        m=rx.fullmatch(line)
        if not m or m.group(1) not in gates:
            raise SystemExit("unsupported_gate_directive:"+p+":"+line)
        name,value=m.groups()
        if name in assignments:
            raise SystemExit("duplicate_gate_assignment_in_dropin:"+p+":"+name)
        assignments[name]=value
    if assignments:
        rows.append({
            "path":os.path.realpath(p),
            "sha256":hashlib.sha256(data).hexdigest(),
            "assignments":assignments,
        })
with open(out,'w',encoding='utf-8') as fh:
    json.dump(rows,fh,indent=2,sort_keys=True)
    fh.write("\n")
PY

say "=== GATE SOURCE INVENTORY ==="
set +e
"$tsx" "$tool" --gate-sources "$gate_sources_json"
inventory_rc=$?
set -e
if [ "$inventory_rc" -ne 0 ]; then
  say "credential_read_performed=false"
  say "database_connection_performed=false"
  hold "gate_source_inventory_hold"
fi
say "gate_source_inventory_green=true"

systemctl --user show "$unit" -p Environment --value >"$configured_raw"

python3 - "$configured_raw" "$configured_json" "/proc/$pid/environ" "$process_json" <<'PY'
import json,shlex,sys

configured_path, configured_out, proc_path, proc_out=sys.argv[1:]
names={
 "parent_runtime":"VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
 "claimed_runtime":"VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
 "full_runtime":"VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
 "admitted_guarded_runtime":"VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
 "full_runtime_apply":"VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
}
raw=open(configured_path,'r',encoding='utf-8').read().strip()
configured={}
for token in shlex.split(raw):
    if '=' not in token: continue
    k,v=token.split('=',1)
    if k in names.values():
        if k in configured: raise SystemExit("duplicate_configured_gate:"+k)
        configured[k]=v
proc={}
for item in open(proc_path,'rb').read().split(b'\0'):
    if not item or b'=' not in item: continue
    k,v=item.split(b'=',1)
    try:
        ks=k.decode('ascii')
        vs=v.decode('utf-8','strict')
    except Exception:
        continue
    if ks in names.values():
        if ks in proc: raise SystemExit("duplicate_process_gate:"+ks)
        proc[ks]=vs
def shape(source,label):
    out={}
    for logical,name in names.items():
        if name not in source: raise SystemExit(label+"_gate_missing:"+name)
        v=source[name]
        if v not in ("0","1"): raise SystemExit(label+"_gate_invalid:"+name)
        out[logical]=v
    return out
for path,value in [(configured_out,shape(configured,"configured")),(proc_out,shape(proc,"process"))]:
    with open(path,'w',encoding='utf-8') as fh:
        json.dump(value,fh,indent=2,sort_keys=True); fh.write("\n")
PY

if ! cmp -s "$configured_json" "$process_json"; then
  hold "configured_process_gate_state_mismatch"
fi
python3 - "$configured_json" <<'PY'
import json,sys
x=json.load(open(sys.argv[1]))
expected={
 "parent_runtime":"1",
 "claimed_runtime":"0",
 "full_runtime":"0",
 "admitted_guarded_runtime":"0",
 "full_runtime_apply":"0",
}
if x != expected:
    raise SystemExit("current_gate_state_not_dormant:"+json.dumps(x,sort_keys=True))
PY
say "configured_and_process_dormant_green=true"

curl -fsS --max-time 10   "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/status"   -o "$runtime_status_raw"

python3 - "$runtime_status_raw" "$runtime_status_json" <<'PY'
import json,sys
x=json.load(open(sys.argv[1]))
full=x.get("payment_keyed_full_runtime") or {}
claimed=x.get("payment_keyed_dispatcher_claimed_runtime") or {}
out={
 "parent_enabled":x.get("enabled"),
 "root_dir":x.get("root_dir"),
 "full_runtime_enabled":full.get("enabled"),
 "full_runtime_apply_enabled":full.get("apply_enabled"),
 "policy_configured":full.get("policy_configured"),
 "signing_dependency_env_configured":full.get("signing_dependency_env_configured"),
 "full_runtime_policy_fingerprint_sha256":full.get("full_runtime_policy_fingerprint_sha256"),
 "runtime_policy_fingerprint_sha256":full.get("runtime_policy_fingerprint_sha256"),
 "preparation_policy_fingerprint_sha256":full.get("preparation_policy_fingerprint_sha256"),
 "receipt_policy_fingerprint_sha256":full.get("receipt_policy_fingerprint_sha256"),
 "history_carrier_authority_id":full.get("history_carrier_authority_id"),
 "history_carrier_generation":full.get("history_carrier_generation"),
 "history_carrier_activation_ready":full.get("history_carrier_activation_ready"),
 "history_carrier_activation_hold_reason":full.get("history_carrier_activation_hold_reason"),
 "claimed_runtime_enabled":claimed.get("claimed_runtime_enabled"),
 "admitted_runtime_enabled":claimed.get("admitted_runtime_enabled"),
 "claimed_full_runtime_enabled":claimed.get("full_runtime_enabled"),
 "claimed_full_runtime_apply_enabled":claimed.get("full_runtime_apply_enabled"),
}
with open(sys.argv[2],'w',encoding='utf-8') as fh:
    json.dump(out,fh,indent=2,sort_keys=True); fh.write("\n")
PY
say "loopback_runtime_status_captured=true"

qualifier_wrapper="$repo/ops/precision/void_precision_buy_void_postgres_host_qualification_v1.sh"
qualifier_tool="$repo/tools/void-precision-buy-void-postgres-host-qualification-v1.mjs"
test -x "$qualifier_wrapper" || hold "postgres_qualifier_wrapper_missing_or_not_executable"
test -f "$qualifier_tool" || hold "postgres_qualifier_tool_missing"

say "postgres_requalification_credential_read_inside_reviewed_factory=true"
VOID_LIVE_REPO_ROOT="$repo"   bash "$qualifier_wrapper" "$qualifier_tool" |
  tee "$pg_log"

python3 - "$pg_log" "$pg_json" <<'PY'
import json,sys

values={}
for raw in open(sys.argv[1],encoding='utf-8'):
    line=raw.strip()
    if '=' not in line: continue
    k,v=line.split('=',1)
    values[k]=v
def b(name):
    v=values.get(name)
    if v not in ("true","false"):
        raise SystemExit("postgres_qualification_boolean_missing:"+name)
    return v=="true"
required=["status","configuration_fingerprint_sha256","schema_fingerprint_sha256"]
for k in required:
    if not values.get(k): raise SystemExit("postgres_qualification_field_missing:"+k)
out={
 "status":values["status"],
 "configuration_fingerprint_sha256":values["configuration_fingerprint_sha256"],
 "schema_fingerprint_sha256":values["schema_fingerprint_sha256"],
 "credential_read_performed":b("credential_read_performed"),
 "credential_content_output":b("credential_content_output"),
 "loopback_postgres_tls_connect_performed":b("loopback_postgres_tls_connect_performed"),
 "schema_query_performed":b("schema_query_performed"),
 "database_mutation_performed":b("database_mutation_performed"),
 "full_runtime_enabled":b("full_runtime_enabled"),
 "full_runtime_apply_enabled":b("full_runtime_apply_enabled"),
 "claimed_runtime_enabled":b("claimed_runtime_enabled"),
 "admitted_guarded_runtime_enabled":b("admitted_guarded_runtime_enabled"),
 "worker_invoked":b("worker_invoked"),
 "transaction_broadcast_performed":b("transaction_broadcast_performed"),
 "funds_movement_performed":b("funds_movement_performed"),
}
with open(sys.argv[2],'w',encoding='utf-8') as fh:
    json.dump(out,fh,indent=2,sort_keys=True); fh.write("\n")
PY
say "postgres_requalification_green=true"

python3 -   "$snapshot"   "$gate_sources_json"   "$configured_json"   "$process_json"   "$runtime_status_json"   "$pg_json"   "$repo" "$head" "$tree" "$remote_main" "$canonical_remote_url" "$source_slice_manifest_sha256" "$source_slice_count" "$wrapper_head_blob" "$tool_head_blob" "$unit" "$pid" "$process_cwd" <<'PY'
import json,sys

(out_path,gate_path,configured_path,process_path,status_path,pg_path,
 repo,head,tree,remote_main,canonical_remote_url,source_slice_manifest_sha256,
 source_slice_count,wrapper_blob,tool_blob,unit,pid,process_cwd)=sys.argv[1:]
snapshot={
 "marker":"VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1",
 "version":1,
 "host":{
   "hostname":"zoso-Precision-Tower-7810",
   "repo_root":repo,
   "branch":"main",
   "head_sha":head,
   "repository_tree_sha":tree,
   "remote_main_sha":remote_main,
   "canonical_remote_url":canonical_remote_url,
   "reviewed_anchor_is_ancestor":True,
   "reviewed_source_slice_green":True,
   "source_slice_manifest_sha256":source_slice_manifest_sha256,
   "source_slice_count":int(source_slice_count),
   "preflight_wrapper_git_blob_sha1":wrapper_blob,
   "preflight_tool_git_blob_sha1":tool_blob,
   "worktree_clean":True,
   "service_unit":unit,
   "active_state":"active",
   "sub_state":"running",
   "main_pid":int(pid),
   "process_cwd":process_cwd,
 },
 "gate_sources":json.load(open(gate_path)),
 "configured_gates":json.load(open(configured_path)),
 "process_gates":json.load(open(process_path)),
 "runtime_status":json.load(open(status_path)),
 "postgres_qualification":json.load(open(pg_path)),
}
with open(out_path,'w',encoding='utf-8') as fh:
    json.dump(snapshot,fh,indent=2,sort_keys=True); fh.write("\n")
PY

say "=== FULL ATOMIC ACTIVATION PREFLIGHT ==="
"$tsx" "$tool" --snapshot "$snapshot"

say "credential_content_output=false"
say "dropin_mutation=false"
say "daemon_reload=false"
say "service_mutation=false"
say "runtime_gate_mutation=false"
say "transaction_broadcast=false"
say "funds_movement=false"
say "${MARKER}_DONE"
