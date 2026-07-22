#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_GATE_V1"
TOOL="tools/void-first-official-release-launch-gate-v1.mjs"
WORKFLOW=".github/workflows/public-release-publication-promotion-v1.yml"

fail(){ echo "ERROR: $*" >&2; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || fail "missing required tool: $1"; }
usage(){
  cat <<'USAGE'
Usage:
  void-first-official-release-launch-gate-v1.sh prepare-live [--version X.Y.Z] [--preparer-id ID] [--state-dir DIR] [--expires-hours N]
  void-first-official-release-launch-gate-v1.sh approve --state-dir DIR --reviewer-id ID --confirmation 'EXACT PHRASE'
  void-first-official-release-launch-gate-v1.sh seal --state-dir DIR --authorizer-id ID --confirmation 'EXACT PHRASE'
  void-first-official-release-launch-gate-v1.sh verify-live --state-dir DIR
  void-first-official-release-launch-gate-v1.sh render-live --state-dir DIR
  void-first-official-release-launch-gate-v1.sh abort --state-dir DIR --actor-id ID --reason TEXT --confirmation 'EXACT PHRASE'

After render-live, use void-first-official-release-launch-record-v1.sh to stage
the sealed record in a separate PR and, after that exact record commit reaches
main, finalize the inert command. Neither helper invokes the publication workflow.

This gate never publishes a tag or GitHub Release and never invokes the publication workflow.
USAGE
}

COMMAND="${1:-}"
[ -n "$COMMAND" ] || { usage; exit 2; }
shift || true

VERSION=""
PREPARER_ID=""
REVIEWER_ID=""
AUTHORIZER_ID=""
ACTOR_ID=""
STATE_DIR=""
CONFIRMATION=""
REASON=""
EXPIRES_HOURS="4"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --version) VERSION="${2:-}"; shift 2;;
    --preparer-id) PREPARER_ID="${2:-}"; shift 2;;
    --reviewer-id) REVIEWER_ID="${2:-}"; shift 2;;
    --authorizer-id) AUTHORIZER_ID="${2:-}"; shift 2;;
    --actor-id) ACTOR_ID="${2:-}"; shift 2;;
    --state-dir) STATE_DIR="${2:-}"; shift 2;;
    --confirmation) CONFIRMATION="${2:-}"; shift 2;;
    --reason) REASON="${2:-}"; shift 2;;
    --expires-hours) EXPIRES_HOURS="${2:-}"; shift 2;;
    -h|--help) usage; exit 0;;
    *) fail "unknown argument: $1";;
  esac
done

for t in git node npm python3 gh sha256sum; do need "$t"; done
REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$REPO" ] || fail "run from inside the VOID repository"
cd "$REPO"
[ -f "$TOOL" ] || fail "launch-gate tool is missing: $TOOL"
[ -f "$WORKFLOW" ] || fail "publication workflow is missing: $WORKFLOW"

repo_slug(){
  local remote
  remote="$(git remote get-url origin)"
  case "$remote" in
    git@github.com:*.git) printf '%s\n' "${remote#git@github.com:}" | sed 's/\.git$//' ;;
    *) fail "origin must use GitHub SSH, got: $remote";;
  esac
}

state_paths(){
  [ -n "$STATE_DIR" ] || fail "--state-dir is required"
  STATE_DIR="$(python3 -c 'import os,sys;print(os.path.abspath(os.path.expanduser(sys.argv[1])))' "$STATE_DIR")"
  BUILD_A="$STATE_DIR/build-a"
  BUILD_B="$STATE_DIR/build-b"
  REHEARSAL="$STATE_DIR/rehearsal"
  PREFLIGHT="$STATE_DIR/launch-preflight-v1.json"
  PACKET="$STATE_DIR/launch-packet-v1.json"
  APPROVAL="$STATE_DIR/launch-approval-v1.json"
  AUTHORIZATION="$STATE_DIR/launch-authorization-v1.json"
  ABORT="$STATE_DIR/launch-abort-v1.json"
  RENDERED="$STATE_DIR/rendered"
}

write_live_preflight(){
  local output="$1" version="$2" commit="$3" observed="$4" slug="$5"
  local tag="release-v${version}"
  local immutable env_json env_file reviewers prevent_self
  immutable="$(gh api "repos/${slug}/immutable-releases" --jq '.enabled')"
  [ "$immutable" = "true" ] || fail "GitHub immutable releases are not enabled"
  env_file="$(mktemp)"
  trap 'rm -f "${env_file:-}"' RETURN
  gh api "repos/${slug}/environments/void-release-publication" > "$env_file"
  read -r reviewers prevent_self < <(python3 - "$env_file" <<'PY'
import json,sys
j=json.load(open(sys.argv[1]))
rules=j.get('protection_rules') or []
reviewers=0
prevent=False
for rule in rules:
    if rule.get('type') == 'required_reviewers':
        reviewers=max(reviewers,len(rule.get('reviewers') or []))
        prevent=prevent or bool(rule.get('prevent_self_review'))
print(reviewers, str(prevent).lower())
PY
)
  [ "$reviewers" -ge 1 ] || fail "void-release-publication requires at least one reviewer"
  [ "$prevent_self" = "true" ] || fail "void-release-publication must prevent self review"
  if git ls-remote --exit-code --tags origin "refs/tags/${tag}" >/dev/null 2>&1; then fail "release tag already exists: ${tag}"; fi
  if gh release view "$tag" --repo "$slug" >/dev/null 2>&1; then fail "GitHub Release already exists: ${tag}"; fi
  python3 - "$output" "$slug" "$version" "$tag" "$commit" "$observed" "$(sha256sum "$WORKFLOW" | awk '{print $1}')" "$reviewers" "$prevent_self" <<'PY'
import json,sys
out,repo,version,tag,commit,observed,workflow_sha,reviewers,prevent=sys.argv[1:]
obj={
  'marker':'VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_PREFLIGHT_V1',
  'schema_version':1,
  'repository':repo,
  'version':version,
  'release_tag':tag,
  'source_commit':commit,
  'origin_main_commit':commit,
  'package_version':version,
  'branch':'main',
  'working_tree_clean':True,
  'remote_transport':'ssh',
  'github_auth_ok':True,
  'remote_tag_absent':True,
  'github_release_absent':True,
  'immutable_releases_enabled':True,
  'publication_environment':{
    'name':'void-release-publication','exists':True,'protected':True,
    'required_reviewers':int(reviewers),'prevent_self_review':prevent=='true'
  },
  'publication_workflow':{
    'path':'.github/workflows/public-release-publication-promotion-v1.yml',
    'sha256':workflow_sha,
    'publish_action':'publish',
    'confirmation':f'PUBLISH VOID RELEASE {tag} AT {commit}'
  },
  'foundation_proofs':{
    'distribution':True,'update_channel':True,'publication_promotion':True,
    'qualification':True,'rehearsal':True,'python_bytecode_hygiene':True
  },
  'observed_at_utc':observed,
  'live_github_observation':True,
}
open(out,'w').write(json.dumps(obj,indent=2,sort_keys=True)+'\n')
PY
}

live_repo_gate(){
  gh auth status >/dev/null
  [ "$(git branch --show-current)" = "main" ] || fail "launch preparation requires branch main"
  [ -z "$(git status --porcelain --untracked-files=all)" ] || fail "launch preparation requires a clean checkout"
  git fetch origin main --tags
  local head origin_main
  head="$(git rev-parse HEAD)"
  origin_main="$(git rev-parse origin/main)"
  [ "$head" = "$origin_main" ] || fail "HEAD does not equal origin/main"
  printf '%s\n' "$head"
}

case "$COMMAND" in
  prepare-live)
    [ -n "$PREPARER_ID" ] || PREPARER_ID="${USER:-release-preparer}"
    [ -n "$VERSION" ] || VERSION="$(node -p 'require("./package.json").version')"
    case "$VERSION" in *-*) fail "first official release launch gate refuses prerelease versions";; esac
    COMMIT="$(live_repo_gate)"
    SLUG="$(repo_slug)"
    NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    EXPIRES="$(python3 - "$NOW" "$EXPIRES_HOURS" <<'PY'
import datetime as d,sys
now=d.datetime.fromisoformat(sys.argv[1].replace('Z','+00:00'))
h=float(sys.argv[2])
if not (0 < h <= 24): raise SystemExit('expires-hours must be >0 and <=24')
print((now+d.timedelta(hours=h)).isoformat().replace('+00:00','Z').replace('.000000Z','Z'))
PY
)"
    [ -n "$STATE_DIR" ] || STATE_DIR="$HOME/void-release-launch-gate/${VERSION}-${COMMIT:0:12}-$(date -u +%Y%m%dT%H%M%SZ)"
    state_paths
    [ ! -e "$STATE_DIR" ] || fail "state directory already exists: $STATE_DIR"
    mkdir -p "$STATE_DIR"
    echo "=== full foundation proofs ==="
    make public-python-bytecode-hygiene-v1-proof
    make public-release-distribution-v1-proof
    make public-release-update-channel-v1-proof
    make public-release-publication-promotion-v1-proof
    make public-release-qualification-v1-proof
    make public-first-official-release-rehearsal-v1-proof
    echo "=== deterministic release build A ==="
    node tools/build-public-release-v1.mjs --out "$BUILD_A" --version "$VERSION"
    (cd "$BUILD_A" && sha256sum --check --strict SHA256SUMS)
    echo "=== deterministic release build B ==="
    node tools/build-public-release-v1.mjs --out "$BUILD_B" --version "$VERSION"
    (cd "$BUILD_B" && sha256sum --check --strict SHA256SUMS)
    cmp "$BUILD_A/SHA256SUMS" "$BUILD_B/SHA256SUMS"
    echo "=== complete no-publish rehearsal bound to exact assets ==="
    node tools/void-first-official-release-rehearsal-v1.mjs run-all \
      --repository "$SLUG" --version "$VERSION" --source-commit "$COMMIT" \
      --release-dir "$BUILD_A" --state-dir "$REHEARSAL" --now "$NOW"
    node tools/void-first-official-release-rehearsal-v1.mjs verify --release-dir "$BUILD_A" --state-dir "$REHEARSAL"
    echo "=== live GitHub launch preflight ==="
    write_live_preflight "$PREFLIGHT" "$VERSION" "$COMMIT" "$NOW" "$SLUG"
    node "$TOOL" prepare \
      --repository "$SLUG" --version "$VERSION" --source-commit "$COMMIT" \
      --release-dir-a "$BUILD_A" --release-dir-b "$BUILD_B" \
      --rehearsal-state-dir "$REHEARSAL" --preflight "$PREFLIGHT" \
      --workflow-file "$WORKFLOW" --preparer-id "$PREPARER_ID" \
      --now "$NOW" --expires-at "$EXPIRES" --state-dir "$STATE_DIR"
    echo "state_dir=$STATE_DIR"
    echo "publication_executed=false"
    echo "${MARKER}_PREPARE_LIVE_GREEN"
    ;;
  approve)
    state_paths
    [ -n "$REVIEWER_ID" ] || fail "--reviewer-id is required"
    [ -n "$CONFIRMATION" ] || fail "--confirmation is required"
    node "$TOOL" approve --packet "$PACKET" --reviewer-id "$REVIEWER_ID" --confirmation "$CONFIRMATION" --now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --out "$APPROVAL"
    ;;
  seal)
    state_paths
    [ -n "$AUTHORIZER_ID" ] || fail "--authorizer-id is required"
    [ -n "$CONFIRMATION" ] || fail "--confirmation is required"
    node "$TOOL" seal --packet "$PACKET" --approval "$APPROVAL" --authorizer-id "$AUTHORIZER_ID" --confirmation "$CONFIRMATION" --now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --out "$AUTHORIZATION"
    ;;
  verify-live|render-live)
    state_paths
    [ -f "$PACKET" ] && [ -f "$APPROVAL" ] && [ -f "$AUTHORIZATION" ] || fail "packet, approval, and authorization are required"
    COMMIT="$(live_repo_gate)"
    SLUG="$(repo_slug)"
    VERSION="$(node -p 'require("./package.json").version')"
    CURRENT="$STATE_DIR/current-live-preflight-v1.json"
    write_live_preflight "$CURRENT" "$VERSION" "$COMMIT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SLUG"
    python3 - "$PREFLIGHT" "$CURRENT" <<'PY'
import json,sys
old,new=map(lambda p:json.load(open(p)),sys.argv[1:])
keys=['repository','version','release_tag','source_commit','origin_main_commit','package_version','branch','working_tree_clean','remote_transport','github_auth_ok','remote_tag_absent','github_release_absent','immutable_releases_enabled','publication_environment','publication_workflow','foundation_proofs']
for k in keys:
    if old.get(k)!=new.get(k): raise SystemExit(f'live preflight changed: {k}')
print('live_preflight_critical_state_unchanged=true')
PY
    COMMON=(--packet "$PACKET" --approval "$APPROVAL" --authorization "$AUTHORIZATION" --preflight "$PREFLIGHT" --release-dir-a "$BUILD_A" --release-dir-b "$BUILD_B" --rehearsal-state-dir "$REHEARSAL" --workflow-file "$WORKFLOW" --now "$(date -u +%Y-%m-%dT%H:%M:%SZ)")
    [ ! -f "$ABORT" ] || COMMON+=(--abort "$ABORT")
    if [ "$COMMAND" = "verify-live" ]; then
      node "$TOOL" verify "${COMMON[@]}"
      echo "${MARKER}_VERIFY_LIVE_GREEN"
    else
      node "$TOOL" render "${COMMON[@]}" --out-dir "$RENDERED"
      LAUNCH_ID="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["launch_id"])' "$PACKET")"
      echo "rendered_dir=$RENDERED"
      echo "launch_record_dir=$RENDERED/launch-record/$LAUNCH_ID"
      echo "next_step=bash ops/release/void-first-official-release-launch-record-v1.sh install --state-dir $STATE_DIR"
      echo "publication_command_text=$RENDERED/publication-command-v1.txt"
      echo "publication_command_finalized=false"
      echo "publication_executed=false"
      echo "${MARKER}_RENDER_LIVE_GREEN"
    fi
    ;;
  abort)
    state_paths
    [ -n "$ACTOR_ID" ] || fail "--actor-id is required"
    [ -n "$REASON" ] || fail "--reason is required"
    [ -n "$CONFIRMATION" ] || fail "--confirmation is required"
    node "$TOOL" abort --packet "$PACKET" --approval "$APPROVAL" --authorization "$AUTHORIZATION" --actor-id "$ACTOR_ID" --reason "$REASON" --confirmation "$CONFIRMATION" --now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --out "$ABORT"
    ;;
  *) usage; exit 2;;
esac
