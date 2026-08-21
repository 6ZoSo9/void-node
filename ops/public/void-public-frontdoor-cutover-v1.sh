#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_PUBLIC_FRONTDOOR_CUTOVER_V1"
FRONTDOOR_PORT="${VOID_PUBLIC_FRONTDOOR_PORT:-8083}"
MODE="${1:---status}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SELF_PATH="$SCRIPT_DIR/${BASH_SOURCE[0]##*/}"
SOURCE_ROOT="${VOID_FRONTDOOR_SOURCE_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SERVER_SRC="$SOURCE_ROOT/ops/public/void-public-frontdoor-v1.mjs"
HOME_SRC="$SOURCE_ROOT/public/void-public-frontdoor-v1/index.html"
INSTALL_DIR="$HOME/.local/lib/void-public-frontdoor-v1"
STATE_DIR="$HOME/.local/state/void-public-frontdoor-v1"
UNIT_DIR="$HOME/.config/systemd/user"
UNIT_PATH="$UNIT_DIR/void-public-frontdoor-v1.service"
TRANSACTION_PATH="$STATE_DIR/cutover-transaction-v1"
LOCK_PATH="$STATE_DIR/cutover-transaction-v1.lock"

fail() {
  printf 'HOLD %s: %s\n' "$MARKER" "$*" >&2
  exit 2
}

canonical_funnel_root_ports_from_text() {
  local dns="$1"
  local text="$2"
  printf '%s\n' "$text" | awk -v header="https://${dns} (Funnel on)" '
    $0 == header {
      in_target = 1
      next
    }
    in_target && /^https:\/\// {
      exit
    }
    in_target && /^\|-- \/ proxy http:\/\/(127\.0\.0\.1|localhost):[0-9]+\/?$/ {
      line = $0
      sub(/^.*:/, "", line)
      sub(/\/$/, "", line)
      print line
    }
  '
}

parser_self_test() {
  local dns fixture got count
  dns="zoso-alienware-aurora-r7.taila47fd.ts.net"
  fixture="# Funnel on:
#     - https://${dns}
#     - https://${dns}:8443

https://${dns} (Funnel on)
|-- / proxy http://127.0.0.1:8082

https://${dns}:8443 (Funnel on)
|-- / proxy http://127.0.0.1:4188"
  got="$(canonical_funnel_root_ports_from_text "$dns" "$fixture")"
  count="$(printf '%s\n' "$got" | sed '/^$/d' | wc -l | tr -d ' ')"
  [[ "$count" == "1" ]] || fail "parser self-test expected one canonical 443 target; found $count"
  [[ "$got" == "8082" ]] || fail "parser self-test selected wrong target: ${got:-missing}"
  echo "${MARKER}_PARSER_SELF_TEST_GREEN"
  echo "canonical_443_port=8082"
  echo "auxiliary_8443_ignored=true"
}

require_exact_port() {
  local expected="$1"
  local observed="$2"
  local label="$3"
  [[ "$observed" == "$expected" ]] || fail "$label changed: expected canonical 443 port $expected, observed ${observed:-unavailable}"
}

rollback_decision() {
  local phase="$1"
  local previous="$2"
  local installed="$3"
  local observed="$4"
  [[ "$phase" == "preparing" || "$phase" == "prepared" || "$phase" == "installed" || "$phase" == "retired" ]] || return 2
  if [[ "$observed" == "$previous" ]]; then
    printf '%s' "retire_only"
    return 0
  fi
  if [[ "$phase" != "preparing" && "$observed" == "$installed" ]]; then
    printf '%s' "restore"
    return 0
  fi
  return 1
}

transaction_self_test() {
  local tmp lock_fd decision
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  exec {lock_fd}>>"$tmp/lock"
  flock -n "$lock_fd" || fail "transaction self-test could not acquire primary lock"
  if flock -n "$tmp/lock" -c true; then
    fail "transaction self-test allowed overlapping transaction lock"
  fi

  require_exact_port "8082" "8082" "self-test predecessor"
  if ( require_exact_port "8082" "8084" "self-test stale predecessor" ) >/dev/null 2>&1; then
    fail "transaction self-test accepted stale predecessor"
  fi

  decision="$(rollback_decision installed 8082 8083 8083)"
  [[ "$decision" == "restore" ]] || fail "transaction self-test rejected exact installed rollback"
  decision="$(rollback_decision preparing 8082 8083 8082)"
  [[ "$decision" == "retire_only" ]] || fail "transaction self-test rejected preparing/no-switch recovery"
  decision="$(rollback_decision installed 8082 8083 8082)"
  [[ "$decision" == "retire_only" ]] || fail "transaction self-test rejected already-restored retirement"
  if rollback_decision installed 8082 8083 8084 >/dev/null 2>&1; then
    fail "transaction self-test allowed rollback over newer canonical 443 authority"
  fi
  if rollback_decision preparing 8082 8083 8083 >/dev/null 2>&1; then
    fail "transaction self-test treated an unowned preparing-state frontdoor as installed"
  fi

  local tx state
  tx="$tmp/transaction"
  publish_transaction_state preparing 8082 8083 "$tmp" "$tx"
  state="$(read_transaction_state "$tx")"
  [[ "$state" == "preparing 8082 8083" ]] || fail "transaction self-test preparing state mismatch"
  publish_transaction_state prepared 8082 8083 "$tmp" "$tx"
  state="$(read_transaction_state "$tx")"
  [[ "$state" == "prepared 8082 8083" ]] || fail "transaction self-test prepared state mismatch"
  publish_transaction_state installed 8082 8083 "$tmp" "$tx"
  state="$(read_transaction_state "$tx")"
  [[ "$state" == "installed 8082 8083" ]] || fail "transaction self-test installed state mismatch"
  publish_transaction_state retired 8082 8083 "$tmp" "$tx"
  state="$(read_transaction_state "$tx")"
  [[ "$state" == "retired 8082 8083" ]] || fail "transaction self-test retired state mismatch"
  [[ "$(stat -c '%a' "$tx")" == "600" ]] || fail "transaction self-test state mode mismatch"
  exec {lock_fd}>&-

  echo "${MARKER}_TRANSACTION_SELF_TEST_GREEN"
  echo "stale_predecessor_rejected=true"
  echo "overlapping_transaction_lock_rejected=true"
  echo "rollback_requires_exact_installed_state=true"
  echo "prepared_without_switch_recovery=true"
  echo "transaction_state_atomic_durable=true"
  echo "transaction_retirement_is_durable_state=true"
}

if [[ "$MODE" == "--parser-self-test" ]]; then
  for cmd in awk sed wc tr; do command -v "$cmd" >/dev/null 2>&1 || fail "missing command: $cmd"; done
  parser_self_test
  exit 0
fi

tailscale_dns_name() {
  tailscale status --json | node -e '
    let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{
      const v=JSON.parse(s); const n=String(v?.Self?.DNSName||"").replace(/\.$/,"");
      if(!n) process.exit(2); process.stdout.write(n);
    });'
}

current_simple_funnel_port() {
  local text dns ports_text count port
  dns="$(tailscale_dns_name)" || fail "cannot resolve local Tailscale DNS name"
  text="$(tailscale funnel status 2>/dev/null)" || fail "cannot read Funnel status"
  ports_text="$(canonical_funnel_root_ports_from_text "$dns" "$text")"
  count="$(printf '%s\n' "$ports_text" | sed '/^$/d' | wc -l | tr -d ' ')"
  [[ "$count" == "1" ]] || {
    printf '%s\n' "$text" >&2
    fail "expected exactly one canonical 443 root Funnel proxy target for https://${dns}; found $count"
  }
  port="$(printf '%s\n' "$ports_text" | sed -n '1p')"
  [[ "$port" =~ ^[0-9]+$ ]] || fail "could not parse canonical 443 Funnel port"
  printf '%s' "$port"
}

acquire_transaction_lock() {
  mkdir -p "$STATE_DIR"
  exec 9>>"$LOCK_PATH"
  flock -n 9 || fail "another frontdoor cutover transaction is active"
}

publish_transaction_state() {
  local phase="$1"
  local previous="$2"
  local installed="$3"
  [[ "$phase" == "preparing" || "$phase" == "prepared" || "$phase" == "installed" || "$phase" == "retired" ]] || fail "invalid transaction phase"
  [[ "$previous" =~ ^[0-9]+$ ]] || fail "invalid transaction previous port"
  [[ "$installed" =~ ^[0-9]+$ ]] || fail "invalid transaction installed port"

  local state_dir="${4:-$STATE_DIR}"
  local transaction_path="${5:-$TRANSACTION_PATH}"
  node - "$state_dir" "$transaction_path" "$phase" "$previous" "$installed" "$MARKER" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const [dir, target, phase, previous, installed, marker] = process.argv.slice(2);
const content = `marker=${marker}\nphase=${phase}\nprevious_port=${previous}\ninstalled_port=${installed}\n`;
const tmp = path.join(dir, `.cutover-transaction-v1.${process.pid}.${Date.now()}.tmp`);
let fd;
try {
  fd = fs.openSync(tmp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
  fs.writeFileSync(fd, content, { encoding: "utf8" });
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  fd = undefined;
  fs.renameSync(tmp, target);
  const dirFd = fs.openSync(dir, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
  try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
} catch (error) {
  if (fd !== undefined) {
    try { fs.closeSync(fd); } catch (closeError) { void closeError; }
  }
  try { fs.unlinkSync(tmp); } catch (unlinkError) { void unlinkError; }
  throw error;
}
NODE
}

read_transaction_state() {
  local transaction_path="${1:-$TRANSACTION_PATH}"
  node - "$transaction_path" "$MARKER" <<'NODE'
const fs = require("node:fs");
const [target, marker] = process.argv.slice(2);
let fd;
try {
  fd = fs.openSync(target, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  const before = fs.fstatSync(fd);
  if (!before.isFile() || before.nlink !== 1 || before.size < 1 || before.size > 512) throw new Error("transaction state file authority invalid");
  if (typeof process.getuid === "function" && before.uid !== process.getuid()) throw new Error("transaction state owner invalid");
  if ((before.mode & 0o077) !== 0) throw new Error("transaction state mode invalid");
  const bytes = Buffer.alloc(before.size);
  let offset = 0;
  while (offset < bytes.length) {
    const n = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
    if (n <= 0) throw new Error("transaction state short read");
    offset += n;
  }
  const after = fs.fstatSync(fd);
  if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw new Error("transaction state changed during read");
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) throw new Error("transaction state unterminated");
  const lines = text.slice(0, -1).split("\n");
  if (lines.length !== 4) throw new Error("transaction state shape invalid");
  const expected = ["marker=", "phase=", "previous_port=", "installed_port="];
  for (let i = 0; i < expected.length; i += 1) if (!lines[i].startsWith(expected[i])) throw new Error("transaction state field order invalid");
  const values = lines.map((line, i) => line.slice(expected[i].length));
  const [actualMarker, phase, previous, installed] = values;
  if (actualMarker !== marker) throw new Error("transaction marker invalid");
  if (!new Set(["preparing", "prepared", "installed", "retired"]).has(phase)) throw new Error("transaction phase invalid");
  if (!/^[0-9]+$/.test(previous) || !/^[0-9]+$/.test(installed)) throw new Error("transaction port invalid");
  process.stdout.write(`${phase} ${previous} ${installed}\n`);
} finally {
  if (fd !== undefined) fs.closeSync(fd);
}
NODE
}

if [[ "$MODE" == "--transaction-self-test" ]]; then
  for cmd in node flock mktemp rm stat; do command -v "$cmd" >/dev/null 2>&1 || fail "missing command: $cmd"; done
  transaction_self_test
  exit 0
fi

need() { command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"; }
for cmd in node curl tailscale systemctl sed grep install date awk wc tr flock mktemp mv rm mkdir cat sleep hostname; do need "$cmd"; done

[[ -f "$SERVER_SRC" ]] || fail "missing server source: $SERVER_SRC"
[[ -f "$HOME_SRC" ]] || fail "missing home source: $HOME_SRC"
node --check "$SERVER_SRC" >/dev/null

status() {
  echo "=== $MARKER status ==="
  echo "hostname=$(hostname)"
  echo "tailscale_dns=$(tailscale_dns_name)"
  echo "--- funnel ---"
  tailscale funnel status || true
  echo "--- frontdoor service ---"
  systemctl --user --no-pager --full status void-public-frontdoor-v1.service 2>/dev/null | sed -n '1,24p' || true
  echo "--- frontdoor local ---"
  curl -fsS --max-time 3 "http://127.0.0.1:${FRONTDOOR_PORT}/__void/frontdoor/status.json" || true
  echo
}

rollback_locked() {
  local state phase previous installed observed decision
  state="$(read_transaction_state)" || fail "no saved cutover transaction"
  read -r phase previous installed <<<"$state"
  observed="$(current_simple_funnel_port)"
  decision="$(rollback_decision "$phase" "$previous" "$installed" "$observed")" \
    || fail "canonical 443 authority changed; refusing stale rollback (phase=$phase expected_installed=$installed observed=$observed)"

  if [[ "$decision" == "retire_only" ]]; then
    if [[ "$phase" != "retired" ]]; then
      publish_transaction_state retired "$previous" "$installed"
    fi
    systemctl --user disable --now void-public-frontdoor-v1.service >/dev/null 2>&1 || true
    echo "${MARKER}_ROLLBACK_NO_SWITCH_GREEN"
    return 0
  fi

  echo "restoring_funnel=http://127.0.0.1:${previous}"
  tailscale funnel --https=443 --bg --yes "http://127.0.0.1:${previous}"
  sleep 2
  require_exact_port "$previous" "$(current_simple_funnel_port)" "rollback verification"
  publish_transaction_state retired "$previous" "$installed"
  systemctl --user disable --now void-public-frontdoor-v1.service >/dev/null 2>&1 || true
  echo "${MARKER}_ROLLBACK_GREEN"
}

rollback() {
  acquire_transaction_lock
  rollback_locked
}

apply() {
  local previous_port dns timestamp observed
  parser_self_test >/dev/null
  acquire_transaction_lock
  if [[ -e "$TRANSACTION_PATH" ]]; then
    local prior_state prior_phase prior_previous prior_installed
    prior_state="$(read_transaction_state)" || fail "cannot read prior cutover transaction"
    read -r prior_phase prior_previous prior_installed <<<"$prior_state"
    [[ "$prior_phase" == "retired" ]] || fail "unresolved prior cutover transaction; run --rollback after verifying canonical 443 state"
  fi

  previous_port="$(current_simple_funnel_port)"
  [[ "$previous_port" != "$FRONTDOOR_PORT" ]] || fail "Funnel already targets frontdoor port ${FRONTDOOR_PORT}"
  [[ "$previous_port" != "0" ]] || fail "invalid previous Funnel port"

  publish_transaction_state preparing "$previous_port" "$FRONTDOOR_PORT"

  echo "previous_funnel_port=$previous_port"
  echo "frontdoor_port=$FRONTDOOR_PORT"
  echo "canonical_funnel_listener=https://$(tailscale_dns_name)"
  echo "auxiliary_funnel_listeners_preserved=true"
  echo "node_service_restart=false"
  echo "composition_gateway_restart=false"

  curl -fsS --max-time 5 "http://127.0.0.1:${previous_port}/" -o /dev/null \
    || fail "current canonical Funnel backend is not healthy on 127.0.0.1:${previous_port}"

  mkdir -p "$INSTALL_DIR" "$STATE_DIR" "$UNIT_DIR"
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  tailscale funnel status > "$STATE_DIR/funnel-status-before-${timestamp}.txt"
  tailscale funnel status --json > "$STATE_DIR/funnel-status-before-${timestamp}.json"

  install -m 0644 "$HOME_SRC" "$INSTALL_DIR/index.html"
  install -m 0755 "$SERVER_SRC" "$INSTALL_DIR/frontdoor.mjs"

  cat > "$UNIT_PATH" <<EOF
[Unit]
Description=VOID public frontdoor v1
After=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/env node $INSTALL_DIR/frontdoor.mjs
Environment=VOID_PUBLIC_FRONTDOOR_HOME=$INSTALL_DIR/index.html
Environment=VOID_PUBLIC_FRONTDOOR_BIND=127.0.0.1
Environment=VOID_PUBLIC_FRONTDOOR_PORT=$FRONTDOOR_PORT
Environment=VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT=$previous_port
Restart=on-failure
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true
RestrictSUIDSGID=true
LockPersonality=true

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload
  systemctl --user enable --now void-public-frontdoor-v1.service

  for _ in 1 2 3 4 5 6 7 8 9 10; do
    curl -fsS --max-time 2 "http://127.0.0.1:${FRONTDOOR_PORT}/__void/frontdoor/status.json" >/dev/null 2>&1 && break
    sleep 1
  done

  curl -fsS --max-time 3 "http://127.0.0.1:${FRONTDOOR_PORT}/" | grep -Fq 'VOID_PUBLIC_FRONTDOOR_V1' \
    || fail "frontdoor root marker missing before Funnel cutover"
  curl -fsS --max-time 5 "http://127.0.0.1:${FRONTDOOR_PORT}/app/" -o /dev/null \
    || fail "frontdoor passthrough to /app/ failed before Funnel cutover"

  observed="$(current_simple_funnel_port)"
  require_exact_port "$previous_port" "$observed" "pre-cutover predecessor"
  publish_transaction_state prepared "$previous_port" "$FRONTDOOR_PORT"
  observed="$(current_simple_funnel_port)"
  require_exact_port "$previous_port" "$observed" "immediate pre-cutover predecessor"

  echo "switching_canonical_443_funnel=http://127.0.0.1:${FRONTDOOR_PORT}"
  if ! tailscale funnel --https=443 --bg --yes "http://127.0.0.1:${FRONTDOOR_PORT}"; then
    observed="$(current_simple_funnel_port)"
    if [[ "$observed" == "$FRONTDOOR_PORT" ]]; then
      rollback_locked
    elif [[ "$observed" == "$previous_port" ]]; then
      rollback_locked
    else
      fail "Funnel cutover command failed and canonical 443 changed to foreign port $observed; transaction retained"
    fi
    fail "Funnel cutover command failed"
  fi

  observed="$(current_simple_funnel_port)"
  if [[ "$observed" != "$FRONTDOOR_PORT" ]]; then
    fail "Funnel cutover did not install expected canonical 443 port; transaction retained (observed=$observed)"
  fi
  publish_transaction_state installed "$previous_port" "$FRONTDOOR_PORT"

  dns="$(tailscale_dns_name)"
  if ! curl -fsS --max-time 15 "https://${dns}/" | grep -Fq 'VOID_PUBLIC_FRONTDOOR_V1'; then
    rollback_locked
    fail "public root verification failed; guarded rollback completed"
  fi
  if ! curl -fsS --max-time 15 "https://${dns}/app/" -o /dev/null; then
    rollback_locked
    fail "public /app/ passthrough verification failed; guarded rollback completed"
  fi

  echo "${MARKER}_GREEN"
  echo "public_url=https://${dns}/"
  echo "previous_funnel_port=${previous_port}"
  echo "frontdoor_port=${FRONTDOOR_PORT}"
  echo "transaction_state=installed"
  echo "auxiliary_funnel_listeners_preserved=true"
  echo "node_service_restart=false"
  echo "src_index_changed=false"
}

case "$MODE" in
  --status) status ;;
  --check)
    parser_self_test >/dev/null
    current_simple_funnel_port >/dev/null
    curl -fsS --max-time 5 "http://127.0.0.1:$(current_simple_funnel_port)/" -o /dev/null \
      || fail "current canonical Funnel backend unavailable"
    echo "${MARKER}_CHECK_GREEN"
    echo "canonical_443_only=true"
    ;;
  --apply) apply ;;
  --rollback) rollback ;;
  --parser-self-test) parser_self_test ;;
  --transaction-self-test) transaction_self_test ;;
  *) fail "usage: $0 [--status|--check|--apply|--rollback|--parser-self-test|--transaction-self-test]" ;;
esac
