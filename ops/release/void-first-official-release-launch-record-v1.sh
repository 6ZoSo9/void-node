#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_RECORD_V1"
TOOL="tools/void-first-official-release-launch-gate-v1.mjs"
WORKFLOW=".github/workflows/public-release-publication-promotion-v1.yml"

fail(){ echo "ERROR: $*" >&2; exit 1; }
usage(){
  cat <<'USAGE'
Usage:
  void-first-official-release-launch-record-v1.sh install --state-dir DIR [--branch NAME]
  void-first-official-release-launch-record-v1.sh finalize --state-dir DIR --launch-record-commit 40_HEX

install verifies the rendered launch record, creates a local branch, copies the
record to release/launch-gate/records/LAUNCH_ID, and stages it. It does not
commit, push, open a PR, merge, publish, tag, deploy, or execute the rendered
publication command.

finalize requires a clean main checkout at the exact merged launch-record
commit, reverifies the committed record and local deterministic builds, and
writes a finalized inert publication command. It does not execute that command.
USAGE
}

COMMAND="${1:-}"; [ -n "$COMMAND" ] || { usage; exit 2; }; shift || true
STATE_DIR=""; BRANCH=""; RECORD_COMMIT=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --state-dir) STATE_DIR="${2:-}"; shift 2;;
    --branch) BRANCH="${2:-}"; shift 2;;
    --launch-record-commit) RECORD_COMMIT="${2:-}"; shift 2;;
    -h|--help) usage; exit 0;;
    *) fail "unknown argument: $1";;
  esac
done

for t in git node python3; do command -v "$t" >/dev/null 2>&1 || fail "missing required tool: $t"; done
REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"; [ -n "$REPO" ] || fail "run inside the VOID repository"
cd "$REPO"
[ -f "$TOOL" ] || fail "missing $TOOL"
[ -f "$WORKFLOW" ] || fail "missing $WORKFLOW"
[ -n "$STATE_DIR" ] || fail "--state-dir is required"
STATE_DIR="$(python3 -c 'import os,sys;print(os.path.abspath(os.path.expanduser(sys.argv[1])))' "$STATE_DIR")"
BUILD_A="$STATE_DIR/build-a"; BUILD_B="$STATE_DIR/build-b"; RENDERED="$STATE_DIR/rendered"
PACKET="$STATE_DIR/launch-packet-v1.json"
[ -f "$PACKET" ] || fail "launch packet is missing: $PACKET"
LAUNCH_ID="$(python3 - "$PACKET" <<'PY'
import json,re,sys
v=json.load(open(sys.argv[1])).get('launch_id','')
if not re.fullmatch(r'launch-release-v[0-9A-Za-z.+-]+-[0-9a-f]{16}',v): raise SystemExit('invalid launch id')
print(v)
PY
)"
SOURCE_COMMIT="$(python3 - "$PACKET" <<'PY'
import json,re,sys
v=json.load(open(sys.argv[1])).get('source_commit','')
if not re.fullmatch(r'[0-9a-f]{40}',v): raise SystemExit('invalid source commit')
print(v)
PY
)"
RENDERED_RECORD="$RENDERED/launch-record/$LAUNCH_ID"
CANONICAL_RECORD="release/launch-gate/records/$LAUNCH_ID"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

verify_record(){
  local dir="$1"
  node "$TOOL" verify-record \
    --record-dir "$dir" \
    --release-dir-a "$BUILD_A" \
    --release-dir-b "$BUILD_B" \
    --workflow-file "$WORKFLOW" \
    --now "$NOW"
}

case "$COMMAND" in
  install)
    [ -d "$RENDERED_RECORD" ] || fail "rendered launch record is missing: $RENDERED_RECORD"
    [ "$(git branch --show-current)" = main ] || fail "install requires branch main"
    [ -z "$(git status --porcelain --untracked-files=all)" ] || fail "install requires a clean checkout"
    git fetch origin main --tags
    [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || fail "HEAD must equal origin/main"
    [ "$(git rev-parse HEAD)" = "$SOURCE_COMMIT" ] || fail "main changed after launch packet preparation; prepare a new gate"
    verify_record "$RENDERED_RECORD"
    [ ! -e "$CANONICAL_RECORD" ] || fail "launch record already exists: $CANONICAL_RECORD"
    [ -n "$BRANCH" ] || BRANCH="release/launch-record-${LAUNCH_ID}"
    git check-ref-format --branch "$BRANCH" >/dev/null
    git checkout -b "$BRANCH"
    mkdir -p "$(dirname "$CANONICAL_RECORD")"
    cp -a "$RENDERED_RECORD" "$CANONICAL_RECORD"
    verify_record "$CANONICAL_RECORD"
    git add "$CANONICAL_RECORD"
    git diff --cached --check
    echo "branch=$BRANCH"
    echo "launch_id=$LAUNCH_ID"
    echo "launch_record_path=$CANONICAL_RECORD"
    echo "commit=false"
    echo "push=false"
    echo "pull_request=false"
    echo "publication_command_executed=false"
    echo "${MARKER}_INSTALL_GREEN"
    ;;
  finalize)
    [[ "$RECORD_COMMIT" =~ ^[0-9a-f]{40}$ ]] || fail "--launch-record-commit must be exact 40-character lowercase hex"
    [ "$(git branch --show-current)" = main ] || fail "finalize requires branch main"
    [ -z "$(git status --porcelain --untracked-files=all)" ] || fail "finalize requires a clean checkout"
    git fetch origin main --tags
    [ "$(git rev-parse HEAD)" = "$RECORD_COMMIT" ] || fail "HEAD does not equal launch-record commit"
    [ "$(git rev-parse origin/main)" = "$RECORD_COMMIT" ] || fail "launch-record commit is not current origin/main"
    git merge-base --is-ancestor "$SOURCE_COMMIT" "$RECORD_COMMIT" || fail "release source is not an ancestor of launch-record commit"
    git cat-file -e "${RECORD_COMMIT}:${CANONICAL_RECORD}/launch-record-manifest-v1.json"
    [ -d "$CANONICAL_RECORD" ] || fail "committed launch record is missing locally: $CANONICAL_RECORD"
    verify_record "$CANONICAL_RECORD"
    OUT="$RENDERED/publication-command-final-v1.json"
    node "$TOOL" finalize-command \
      --record-dir "$CANONICAL_RECORD" \
      --release-dir-a "$BUILD_A" \
      --release-dir-b "$BUILD_B" \
      --workflow-file "$WORKFLOW" \
      --now "$NOW" \
      --launch-record-commit "$RECORD_COMMIT" \
      --out "$OUT"
    echo "launch_id=$LAUNCH_ID"
    echo "launch_record_commit=$RECORD_COMMIT"
    echo "finalized_publication_command=$OUT"
    echo "publication_command_executed=false"
    echo "${MARKER}_FINALIZE_GREEN"
    ;;
  *) usage; exit 2;;
esac
