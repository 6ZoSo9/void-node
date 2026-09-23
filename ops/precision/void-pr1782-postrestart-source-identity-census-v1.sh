#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

echo "VOID_PR1782_POSTRESTART_SOURCE_IDENTITY_CENSUS_V1"
echo "service_action=false"
echo "service_restart=false"
echo "filesystem_mutation=false"
echo "git_fetch=true"
echo "git_worktree_mutation=false"
echo "credential_content_read=false"
echo "database_login=false"
echo "wallet_or_signer_access=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "funds_movement=false"

repo="$HOME/dev/void-node"
unit="void-node-live.service"
expected_main="0055b737603a720802040882b1e05e5738c3da4d"
old_pid="3750354"

fail() {
  echo "HOLD: $*" >&2
  exit 1
}

for cmd in git systemctl readlink python3 ps ss awk grep sed stat; do
  command -v "$cmd" >/dev/null 2>&1 || fail "missing command: $cmd"
done

[ -d "$repo/.git" ] || fail "repo missing: $repo"

echo
echo "=== REPOSITORY ==="
git -C "$repo" fetch origin --quiet --prune
printf 'branch=%s\n' "$(git -C "$repo" branch --show-current)"
printf 'local_head=%s\n' "$(git -C "$repo" rev-parse HEAD)"
printf 'local_tree=%s\n' "$(git -C "$repo" rev-parse 'HEAD^{tree}')"
printf 'origin_main=%s\n' "$(git -C "$repo" rev-parse origin/main)"
printf 'expected_main=%s\n' "$expected_main"
printf 'worktree_status_begin\n'
git -C "$repo" status --porcelain=v1 --untracked-files=all || true
printf 'worktree_status_end\n'
printf 'head_reflog=%s\n' "$(git -C "$repo" reflog -1 --format='%H %gs' HEAD 2>/dev/null || true)"
printf 'main_ref_reflog=%s\n' "$(git -C "$repo" reflog -1 --format='%H %gs' refs/heads/main 2>/dev/null || true)"

echo
echo "=== SYSTEMD UNIT ==="
systemctl --user show "$unit" \
  -p ActiveState \
  -p SubState \
  -p MainPID \
  -p ExecMainPID \
  -p InvocationID \
  -p ExecMainStartTimestamp \
  -p ExecMainStartTimestampMonotonic \
  -p FragmentPath \
  -p DropInPaths \
  -p WorkingDirectory \
  -p ExecStart \
  -p ExecStartPre \
  --no-pager

main_pid="$(systemctl --user show "$unit" -p MainPID --value)"
[[ "$main_pid" =~ ^[1-9][0-9]*$ ]] || fail "invalid MainPID: $main_pid"
[ -d "/proc/$main_pid" ] || fail "MainPID not present in /proc"

echo "old_pid=$old_pid"
echo "main_pid_now=$main_pid"
if [ "$main_pid" = "$old_pid" ]; then
  echo "main_pid_changed=false"
else
  echo "main_pid_changed=true"
fi

echo
echo "=== MAIN PROCESS ==="
printf 'proc_cwd=%s\n' "$(readlink -f "/proc/$main_pid/cwd" || true)"
printf 'proc_exe=%s\n' "$(readlink -f "/proc/$main_pid/exe" || true)"
printf 'proc_cmdline='
tr '\0' ' ' < "/proc/$main_pid/cmdline"
printf '\n'
ps -o pid=,ppid=,lstart=,etime=,stat=,cmd= -p "$main_pid" || true

python3 - "$main_pid" <<'PY'
import pathlib, sys
pid=sys.argv[1]
keys=[
 "PWD",
 "VOID_PROCESS_SOURCE_IDENTITY_MARKER",
 "VOID_PROCESS_SOURCE_COMMIT",
 "VOID_PROCESS_SOURCE_TREE",
 "VOID_PROCESS_SOURCE_BRANCH",
 "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
 "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
 "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
 "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
 "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
 "VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST",
 "VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT",
 "VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX",
 "VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS",
 "VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS",
 "CREDENTIALS_DIRECTORY",
]
env={}
for item in pathlib.Path(f"/proc/{pid}/environ").read_bytes().split(b"\0"):
    if b"=" not in item:
        continue
    k,v=item.split(b"=",1)
    try:
        key=k.decode("utf-8","strict")
    except UnicodeDecodeError:
        continue
    if key in keys:
        env[key]=v.decode("utf-8","replace")
for key in keys:
    print(f"{key}={env.get(key,'<unset>')}")
PY

echo
echo "=== SOURCE-ID COMPARISON ==="
process_commit="$(
  python3 - "$main_pid" <<'PY'
import pathlib, sys
for item in pathlib.Path(f"/proc/{sys.argv[1]}/environ").read_bytes().split(b"\0"):
    if item.startswith(b"VOID_PROCESS_SOURCE_COMMIT="):
        print(item.split(b"=",1)[1].decode("ascii","replace"))
        break
PY
)"
process_tree="$(
  python3 - "$main_pid" <<'PY'
import pathlib, sys
for item in pathlib.Path(f"/proc/{sys.argv[1]}/environ").read_bytes().split(b"\0"):
    if item.startswith(b"VOID_PROCESS_SOURCE_TREE="):
        print(item.split(b"=",1)[1].decode("ascii","replace"))
        break
PY
)"
echo "process_commit=$process_commit"
echo "process_tree=$process_tree"

if [[ "$process_commit" =~ ^[0-9a-f]{40}$ ]] && git -C "$repo" cat-file -e "$process_commit^{commit}" 2>/dev/null; then
  printf 'process_commit_tree=%s\n' "$(git -C "$repo" rev-parse "$process_commit^{tree}")"
  if git -C "$repo" merge-base --is-ancestor "$process_commit" "$expected_main" 2>/dev/null; then
    echo "process_commit_is_ancestor_of_expected_main=true"
  else
    echo "process_commit_is_ancestor_of_expected_main=false"
  fi
else
  echo "process_commit_resolves=false"
fi

echo
echo "=== LIVE NODE PROCESS CENSUS ==="
mapfile -t candidates < <(
  for p in /proc/[0-9]*; do
    pid="${p##*/}"
    [ -r "$p/cmdline" ] || continue
    cmd="$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null || true)"
    case "$cmd" in
      *"$repo/src/index.ts"*) printf '%s\n' "$pid" ;;
    esac
  done | sort -n
)

echo "candidate_count=${#candidates[@]}"
for pid in "${candidates[@]}"; do
  echo "-- candidate_pid=$pid"
  printf 'cwd=%s\n' "$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  python3 - "$pid" <<'PY'
import pathlib, sys
wanted={"VOID_PROCESS_SOURCE_COMMIT","VOID_PROCESS_SOURCE_TREE","VOID_PROCESS_SOURCE_BRANCH","CREDENTIALS_DIRECTORY"}
vals={}
try:
    raw=pathlib.Path(f"/proc/{sys.argv[1]}/environ").read_bytes()
except Exception as e:
    print("environ_read=false")
    raise SystemExit
for item in raw.split(b"\0"):
    if b"=" not in item: continue
    k,v=item.split(b"=",1)
    try: key=k.decode()
    except: continue
    if key in wanted: vals[key]=v.decode("utf-8","replace")
for key in sorted(wanted):
    print(f"{key}={vals.get(key,'<unset>')}")
PY
done

echo
echo "=== LISTENERS ==="
ss -ltnp '( sport = :4100 or sport = :4700 )' || true

echo
echo "=== UNIT SOURCE ==="
systemctl --user cat "$unit"

echo
echo "expected_main=$expected_main"
echo "service_action=false"
echo "service_restart=false"
echo "credential_content_read=false"
echo "database_login=false"
echo "result=GREEN_OBSERVATION"
