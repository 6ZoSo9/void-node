#!/usr/bin/env bash
set -Eeuo pipefail
set +H

MARKER="VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_WRAPPER_V1"
EXPECTED_MAIN="74b5242dde224282de5b1b881d7d4cb942f00d48"
repo="${VOID_LIVE_REPO_ROOT:-$HOME/dev/void-node}"
unit="void-node-live.service"
tool="${1:-}"

say(){ printf '%s\n' "$*"; }
hold(){ say "${MARKER}_HOLD reason=$*" >&2; exit 2; }

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

for cmd in git systemctl python3 node curl sha256sum mktemp; do
  command -v "$cmd" >/dev/null 2>&1 ||
    hold "required_command_missing:$cmd"
done

test -n "$tool" && test -f "$tool" || hold "preflight_tool_missing"
expected_tool_blob="fafbace04f8427d526104d77dabadc99d34c6bf1"
actual_tool_blob="$(git hash-object "$tool")"
test "$actual_tool_blob" = "$expected_tool_blob" ||
  hold "preflight_tool_blob_mismatch"
say "preflight_tool_blob_green=true"

test -d "$repo/.git" || hold "live_repo_missing"
cd "$repo"

test "$(hostname)" = "zoso-Precision-Tower-7810" ||
  hold "designated_host_mismatch"
test "$(git branch --show-current)" = "main" ||
  hold "live_repo_not_main"
test -z "$(git status --porcelain=v1 --untracked-files=all)" ||
  hold "live_repo_dirty"
head="$(git rev-parse HEAD)"
test "$head" = "$EXPECTED_MAIN" ||
  hold "live_repo_head_not_reviewed_main:$head"
say "live_repo_head=$head"
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

python3 -   "$snapshot"   "$gate_sources_json"   "$configured_json"   "$process_json"   "$runtime_status_json"   "$pg_json"   "$repo" "$head" "$unit" "$pid" "$process_cwd" <<'PY'
import json,sys

(out_path,gate_path,configured_path,process_path,status_path,pg_path,
 repo,head,unit,pid,process_cwd)=sys.argv[1:]
snapshot={
 "marker":"VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1",
 "version":1,
 "host":{
   "hostname":"zoso-Precision-Tower-7810",
   "repo_root":repo,
   "branch":"main",
   "head_sha":head,
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
