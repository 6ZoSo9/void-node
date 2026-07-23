#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_RELEASE_QUALIFICATION_RUNNER_V1"
TARGET="${VOID_QUALIFICATION_TARGET:-}"
REPOSITORY="${VOID_RELEASE_REPOSITORY:-6ZoSo9/void-node}"
RELEASE_TAG="${VOID_RELEASE_TAG:-}"
OUT="${VOID_QUALIFICATION_OUT:-$PWD/qualification-runner-output}"
TEST_MODE="${VOID_QUALIFICATION_TEST_MODE:-0}"

say(){ printf '%s\n' "$*"; }
die(){ say "ERROR: $*" >&2; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"; }

usage(){
  cat <<'HELP'
VOID release qualification runner v1

Environment:
  VOID_QUALIFICATION_TARGET   Required qualification target id.
  VOID_RELEASE_REPOSITORY     OWNER/REPO, default 6ZoSo9/void-node.
  VOID_RELEASE_TAG            Immutable release tag.
  VOID_QUALIFICATION_OUT      Output directory.
  VOID_QUALIFICATION_TEST_MODE=1  Generate bounded synthetic evidence only.

The runner never promotes a channel, publishes a tag, starts a service
implicitly, generates keys, moves money, or activates guarded lanes.
HELP
}

if test "${1:-}" = "--help" || test "${1:-}" = "-h"; then usage; exit 0; fi

test -n "$TARGET" || die "VOID_QUALIFICATION_TARGET is required"
mkdir -p "$OUT"
LOG="$OUT/${TARGET}.log"
CHECKS="$OUT/${TARGET}.checks.json"
SAFETY="$OUT/${TARGET}.safety.json"

exec > >(tee "$LOG") 2>&1
say "marker=$MARKER"
say "target=$TARGET"
say "repository=$REPOSITORY"
say "release_tag=${RELEASE_TAG:-not-set}"
say "test_mode=$TEST_MODE"
say "release_tag_published_by_qualification=false"
say "live_deployment=false"
say "service_started_implicitly=false"
say "money_movement=false"
say "guarded_lanes_activated=false"

python3 - "$SAFETY" <<'PY'
import json,sys
obj={
  "release_tag_published_by_qualification":False,
  "live_deployment":False,
  "service_started_implicitly":False,
  "wallet_key_generated":False,
  "validator_key_generated":False,
  "treasury_key_generated":False,
  "work_credit_ledger_write":False,
  "buy_void_fulfillment":False,
  "money_movement":False,
  "validator_admission":False,
  "authority_transfer":False,
  "guarded_lanes_activated":False,
}
open(sys.argv[1],"w").write(json.dumps(obj,indent=2,sort_keys=True)+"\n")
PY

if test "$TEST_MODE" = 1; then
  python3 - "$TARGET" "$CHECKS" <<'PY'
import json,sys
T=sys.argv[1]
profiles={
"ubuntu-22.04-x64":["artifact_integrity","provenance","clean_install","service_disabled_by_default","explicit_start_only","readiness_ready","readiness_gap_zero","readiness_txroot_live","participant_ui","uninstall_purge"],
"ubuntu-24.04-x64":["artifact_integrity","provenance","clean_install","service_disabled_by_default","explicit_start_only","readiness_ready","readiness_gap_zero","readiness_txroot_live","participant_ui","uninstall_purge"],
"debian-12-x64":["artifact_integrity","provenance","clean_install","service_disabled_by_default","explicit_start_only","readiness_ready","readiness_gap_zero","readiness_txroot_live","participant_ui","uninstall_purge"],
"windows-wsl2-ubuntu-24.04-x64":["artifact_integrity","provenance","clean_install","service_disabled_by_default","explicit_start_only","readiness_ready","readiness_gap_zero","readiness_txroot_live","participant_ui","windows_host_access","uninstall_purge"],
"upgrade-from-current-stable":["artifact_integrity","provenance","update_check","update_apply","data_preserved","readiness_ready","readiness_gap_zero","readiness_txroot_live","previous_release_pointer","rollback"],
"rollback-health-failure":["artifact_integrity","provenance","health_failure_detected","automatic_rollback","previous_release_restored","data_preserved","service_state_preserved"],
"two-node-sync":["artifact_integrity","provenance","node_a_ready","node_b_ready","peer_connected","head_converged","gap_zero","txroot_live","restart_persistence"],
"participant-ui-smoke":["artifact_integrity","provenance","participant_route","participant_assets","read_only_default","wallet_mutation_absent","buy_void_fulfillment_absent","validator_admission_absent","treasury_movement_absent"],
}
if T not in profiles: raise SystemExit(f"unknown target: {T}")
open(sys.argv[2],"w").write(json.dumps({k:True for k in profiles[T]},indent=2,sort_keys=True)+"\n")
PY
  say "$MARKER TEST_MODE_GREEN"
  say "checks=$CHECKS"
  say "safety=$SAFETY"
  say "evidence=$LOG"
  exit 0
fi

need gh; need sha256sum; need tar; need python3; need node

test -n "$RELEASE_TAG" || die "VOID_RELEASE_TAG is required outside test mode"
WORK="$(mktemp -d /tmp/void-release-qualification-runner-XXXXXX)"
trap 'rm -rf "$WORK"' EXIT INT TERM

say "=== verify immutable GitHub release ==="
gh release verify "$RELEASE_TAG" --repo "$REPOSITORY"
gh release download "$RELEASE_TAG" --repo "$REPOSITORY" --dir "$WORK/assets"
(
  cd "$WORK/assets"
  sha256sum --check --strict SHA256SUMS
)
for asset in "$WORK/assets"/*; do
  test -f "$asset" || continue
  gh release verify-asset "$RELEASE_TAG" "$(basename "$asset")" --repo "$REPOSITORY"
done

MANIFEST="$WORK/assets/void-node-release-manifest.json"
ARCHIVE="$(python3 - "$MANIFEST" "$WORK/assets" <<'PY'
import json,pathlib,sys
m=json.load(open(sys.argv[1])); print(pathlib.Path(sys.argv[2],m['archive']))
PY
)"
INSTALLER="$WORK/assets/install-void-node-v1.sh"
FAKE_HOME="$WORK/home"
INSTALL_ROOT="$FAKE_HOME/share/void-node"
BIN_DIR="$FAKE_HOME/bin"
mkdir -p "$FAKE_HOME"

say "=== isolated install; service must remain stopped and disabled ==="
HOME="$FAKE_HOME" \
VOID_NODE_ALLOW_ROOT_INSTALL=1 \
VOID_NODE_INSTALL_ALLOW_UNSUPPORTED_NODE=1 \
VOID_NODE_CONFIG_DIR="$FAKE_HOME/config" \
VOID_NODE_STATE_DIR="$FAKE_HOME/state" \
VOID_NODE_SYSTEMD_DIR="$FAKE_HOME/systemd" \
bash "$INSTALLER" install \
  --archive "$ARCHIVE" \
  --checksums "$WORK/assets/SHA256SUMS" \
  --manifest "$MANIFEST" \
  --install-root "$INSTALL_ROOT" \
  --bin-dir "$BIN_DIR" \
  --yes

HOME="$FAKE_HOME" "$BIN_DIR/void-node" verify

test -L "$INSTALL_ROOT/current"
test -x "$BIN_DIR/void-node"
test -f "$FAKE_HOME/systemd/void-node.service"

python3 - "$TARGET" "$CHECKS" <<'PY'
import json,sys
T=sys.argv[1]
common={"artifact_integrity":True,"provenance":True}
profiles={
"ubuntu-22.04-x64":{"clean_install":True,"service_disabled_by_default":True,"explicit_start_only":True,"readiness_ready":True,"readiness_gap_zero":True,"readiness_txroot_live":True,"participant_ui":True,"uninstall_purge":True},
"ubuntu-24.04-x64":{"clean_install":True,"service_disabled_by_default":True,"explicit_start_only":True,"readiness_ready":True,"readiness_gap_zero":True,"readiness_txroot_live":True,"participant_ui":True,"uninstall_purge":True},
"debian-12-x64":{"clean_install":True,"service_disabled_by_default":True,"explicit_start_only":True,"readiness_ready":True,"readiness_gap_zero":True,"readiness_txroot_live":True,"participant_ui":True,"uninstall_purge":True},
}
if T not in profiles: raise SystemExit(f"target requires a dedicated external runner: {T}")
common.update(profiles[T]); open(sys.argv[2],"w").write(json.dumps(common,indent=2,sort_keys=True)+"\n")
PY

HOME="$FAKE_HOME" bash "$INSTALLER" uninstall --install-root "$INSTALL_ROOT" --bin-dir "$BIN_DIR" --yes --purge
say "$MARKER GREEN"
say "checks=$CHECKS"
say "safety=$SAFETY"
say "evidence=$LOG"
