#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-}"
ROLE="${2:-}"

MIN_MAIN="61ab00019574a798d15f31949a7aa9bfa511157b"
EXPECTED_PLUGIN_SHA="6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518"

REPO="$HOME/dev/void-node"
BUILD_JAR_REL="besu-plugins/epoch2-raw-transaction-domain-v1/target/void-epoch2-raw-transaction-domain-plugin-v1.jar"
BUILD_JAR="$REPO/$BUILD_JAR_REL"
CANONICAL_JAR="$HOME/Downloads/void-epoch2-raw-transaction-domain-plugin-v1.jar"
RUNNER="scripts/run_void_economic_epoch2_production_validator_runtime_evidence_v1.sh"
TARGET_DIR="$REPO/besu-plugins/epoch2-raw-transaction-domain-v1/target"

case "$MODE" in
  prepare-jar)
    ROLE="${ROLE:-precision}"
    ;;
  preflight|capture)
    ;;
  *)
    echo "usage: $0 <prepare-jar|preflight|capture> <precision|nimo|xiphos>" >&2
    exit 64
    ;;
esac

case "$ROLE" in
  precision|nimo|xiphos) ;;
  *)
    echo "usage: $0 <prepare-jar|preflight|capture> <precision|nimo|xiphos>" >&2
    exit 64
    ;;
esac

cd "$REPO"

echo "VOID_EPOCH2_VALIDATOR_FRESHNESS_REQUALIFICATION_V7"
echo "mode=$MODE"
echo "role=$ROLE"
echo "host=$(hostname)"

clean_generated_target_only() {
  local status bad
  status="$(git status --porcelain=v1 --untracked-files=all)"
  if [ -n "$status" ]; then
    bad="$(
      printf '%s\n' "$status" |
        grep -vE '^\?\? besu-plugins/epoch2-raw-transaction-domain-v1/target/' || true
    )"
    if [ -n "$bad" ]; then
      echo "unexpected_worktree_changes:" >&2
      printf '%s\n' "$bad" >&2
      exit 1
    fi
    test -d "$TARGET_DIR"
    test -z "$(git ls-files "$TARGET_DIR")"
    rm -rf -- "$TARGET_DIR"
  fi
  test -z "$(git status --porcelain=v1 --untracked-files=all)"
}

clean_generated_target_only

if [ "$(git branch --show-current)" != "main" ]; then
  git switch main
fi

git fetch origin main
git merge --ff-only origin/main

head="$(git rev-parse HEAD)"
echo "main_head=$head"

# Allow unrelated later main commits, but require the known-good checkpoint.
git merge-base --is-ancestor "$MIN_MAIN" HEAD

check_blob() {
  local path="$1"
  local expected="$2"
  local actual
  actual="$(git rev-parse "HEAD:$path")"
  echo "blob[$path]=$actual"
  test "$actual" = "$expected"
}

check_blob \
  "scripts/run_void_economic_epoch2_production_validator_runtime_evidence_v1.sh" \
  "686381d7482eb709f21e12f5b283f4a2a8d20975"

check_blob \
  "tools/void-economic-epoch2-production-validator-runtime-evidence-candidate-v1.mjs" \
  "a016aa7e619774801463127f8bd8d08952b5ee58"

check_blob \
  "tools/void-economic-epoch2-production-validator-domain-enforcement-v1.mjs" \
  "e1d97e4b73fd82e368b893a1176758a2bd81038d"

check_blob \
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json" \
  "c6b7f5a1f30b36a71f845a8153f74301457e2b80"

check_blob \
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json" \
  "66811e91cdde4c1e3c87ff5a2fa1bc5242b45f2c"

check_blob \
  "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json" \
  "3a994fa5df537e7ea9fa956771cd3068912a2b11"

check_blob \
  "besu-plugins/epoch2-raw-transaction-domain-v1/pom.xml" \
  "5dbddd23e9d1a4b9b54c349dbf814622ee6b2815"

case "$ROLE" in
  precision)
    IDENTITY_BLOB="5e3f3873d78f99682ee66f5b67df302699a3145c"
    ;;
  nimo)
    IDENTITY_BLOB="449e693bb8e3cca2335b966a1c432b729cd76ac3"
    ;;
  xiphos)
    IDENTITY_BLOB="413bb16bd6805d95055f49da510c45d67ce1a769"
    ;;
esac

identity="ops/mainnet0/economic-epoch2-qbft-node-identity-${ROLE}-v1.json"
check_blob "$identity" "$IDENTITY_BLOB"

expected_hostname="$(
  node --input-type=module - "$identity" <<'NODE'
import fs from "node:fs";
const x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
process.stdout.write(String(x.hostname));
NODE
)"
echo "expected_hostname=$expected_hostname"
test "$(hostname)" = "$expected_hostname"

if [ "$MODE" = "prepare-jar" ]; then
  test "$ROLE" = "precision"
  for cmd in git node mvn sha256sum; do
    command -v "$cmd" >/dev/null
  done

  echo "=== BUILD CANONICAL PLUGIN ON PRECISION ==="
  mvn -B -ntp \
    -f besu-plugins/epoch2-raw-transaction-domain-v1/pom.xml \
    clean test package

  test -f "$BUILD_JAR"
  test ! -L "$BUILD_JAR"
  printf '%s  %s\n' "$EXPECTED_PLUGIN_SHA" "$BUILD_JAR" | sha256sum -c -

  mkdir -p "$HOME/Downloads"
  tmp="$CANONICAL_JAR.pending.$$"
  rm -f -- "$tmp"
  install -m 0444 "$BUILD_JAR" "$tmp"
  printf '%s  %s\n' "$EXPECTED_PLUGIN_SHA" "$tmp" | sha256sum -c -
  mv -f -- "$tmp" "$CANONICAL_JAR"

  clean_generated_target_only

  printf '%s  %s\n' "$EXPECTED_PLUGIN_SHA" "$CANONICAL_JAR" | sha256sum -c -
  test -z "$(git status --porcelain=v1 --untracked-files=all)"

  echo "canonical_jar=$CANONICAL_JAR"
  echo "plugin_sha256=$EXPECTED_PLUGIN_SHA"
  echo "repository_clean_after_build=true"
  echo "VOID_EPOCH2_CANONICAL_PLUGIN_JAR_V1_GREEN"
  exit 0
fi

# Runtime preflight/capture does not rebuild the JAR. It consumes the exact
# canonical content-addressed artifact prepared once on Precision.
for cmd in git node docker sha256sum python3 curl timeout; do
  command -v "$cmd" >/dev/null
done

docker info >/dev/null

key="$HOME/.local/share/void/epoch2-qbft-validator-identity-v1/$ROLE/nodekey"
test -f "$key"
test ! -L "$key"
key_mode="$(stat -c '%a' "$key")"
case "$key_mode" in 400|600) ;; *) echo "invalid nodekey mode: $key_mode" >&2; exit 2 ;; esac
echo "nodekey_mode=$key_mode"

test -f "$CANONICAL_JAR"
test ! -L "$CANONICAL_JAR"
printf '%s  %s\n' "$EXPECTED_PLUGIN_SHA" "$CANONICAL_JAR" | sha256sum -c -

test -f "$RUNNER"
test ! -L "$RUNNER"
test -z "$(git status --porcelain=v1 --untracked-files=all)"

echo "canonical_jar=$CANONICAL_JAR"
echo "plugin_sha256=$EXPECTED_PLUGIN_SHA"
echo "validator_evidence_sources_pinned=true"
echo "repository_clean=true"
echo "docker_ready=true"

if [ "$MODE" = "preflight" ]; then
  echo "VOID_EPOCH2_VALIDATOR_FRESHNESS_PREFLIGHT_V7_GREEN"
  exit 0
fi

work="$(mktemp -d "${TMPDIR:-/tmp}/void-e2-requal-capture.XXXXXX")"
cleanup_work() {
  rm -rf -- "$work"
}
trap cleanup_work EXIT INT TERM

verified_jar="$work/void-epoch2-raw-transaction-domain-plugin-v1.jar"
install -m 0444 "$CANONICAL_JAR" "$verified_jar"
printf '%s  %s\n' "$EXPECTED_PLUGIN_SHA" "$verified_jar" | sha256sum -c -

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$HOME/Downloads/void_epoch2_validator_runtime_evidence_${ROLE}_${stamp}.json"
test ! -e "$out"

echo "=== CAPTURE FRESH RUNTIME EVIDENCE ==="
bash "$RUNNER" "$ROLE" "$verified_jar" "$out"

test -s "$out"
evidence_sha="$(sha256sum "$out" | awk '{print $1}')"

python3 - "$out" "$evidence_sha" <<'PY'
import json, sys
path, sha = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    x = json.load(f)
print("evidence_file=" + path)
print("evidence_file_sha256=" + sha)
print("evidence_id=" + str(x["evidence_id"]))
print("machine_role=" + str(x["machine_role"]))
print("observed_at_utc=" + str(x["observed_at_utc"]))
print("valid_until_utc=" + str(x["valid_until_utc"]))
if x.get("status") != "RUNTIME_ENFORCEMENT_EVIDENCE_CANDIDATE":
    raise SystemExit("unexpected_evidence_status")
for key in (
    "market_activation_authorized",
    "migration_authorized",
    "public_activation_authorized",
    "funds_movement_authorized",
):
    if x.get(key) is not False:
        raise SystemExit("unexpected_authority_flag:" + key)
print("single_validator_runtime_evidence_candidate=true")
print("aggregate_validator_gate_evaluated=false")
print("migration_authorized=false")
print("public_activation_authorized=false")
print("funds_movement_authorized=false")
PY

printf '%s  %s\n' "$EXPECTED_PLUGIN_SHA" "$CANONICAL_JAR" | sha256sum -c -
test -z "$(git status --porcelain=v1 --untracked-files=all)"
echo "VOID_EPOCH2_VALIDATOR_FRESHNESS_CAPTURE_V7_GREEN"