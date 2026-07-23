#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_RELEASE_PUBLICATION_SOLO_TIME_LOCK_V1"
MODE="${1:-status}"
shift || true
WAIT_MINUTES="${VOID_SOLO_RELEASE_WAIT_MINUTES:-720}"
CONFIRMATION=""

fail(){ echo "ERROR: $*" >&2; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || fail "missing required tool: $1"; }
usage(){
  cat <<'USAGE'
Usage:
  configure-void-release-publication-solo-v1.sh status
  configure-void-release-publication-solo-v1.sh configure --confirm 'CONFIGURE VOID SOLO RELEASE TIME LOCK 720 MINUTES'

Optional:
  VOID_SOLO_RELEASE_WAIT_MINUTES=720

This configures an honest single-operator GitHub environment. It does not
claim independent review. The publication job is restricted to branch main
and delayed by at least 720 minutes before it can run.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --confirm) CONFIRMATION="${2:-}"; shift 2 ;;
    --wait-minutes) WAIT_MINUTES="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) fail "unknown argument: $1" ;;
  esac
done

case "$MODE" in status|configure) ;; -h|--help|help) usage; exit 0 ;; *) usage; fail "unknown mode: $MODE" ;; esac
for tool in git gh jq python3; do need "$tool"; done
case "$WAIT_MINUTES" in *[!0-9]*|'') fail "wait minutes must be an integer" ;; esac
[ "$WAIT_MINUTES" -ge 720 ] || fail "solo release wait timer must be at least 720 minutes"
[ "$WAIT_MINUTES" -le 43200 ] || fail "solo release wait timer cannot exceed 43200 minutes"

REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$REPO" ] || fail "run inside the VOID repository"
cd "$REPO"
REMOTE="$(git remote get-url origin)"
case "$REMOTE" in git@github.com:*.git) ;; *) fail "origin must use GitHub SSH" ;; esac
SLUG="${REMOTE#git@github.com:}"; SLUG="${SLUG%.git}"
ENVIRONMENT="void-release-publication"
API_VERSION="2026-03-10"

gh auth status >/dev/null

verify(){
  local env_json policies
  env_json="$(gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: $API_VERSION" "repos/$SLUG/environments/$ENVIRONMENT")"
  policies="$(gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: $API_VERSION" "repos/$SLUG/environments/$ENVIRONMENT/deployment-branch-policies")"
  python3 -c '
import json,sys
minimum=int(sys.argv[1]); env=json.load(sys.stdin)
reviewers=0; prevent=False; wait=0
for rule in env.get("protection_rules") or []:
    if rule.get("type")=="required_reviewers":
        reviewers=max(reviewers,len(rule.get("reviewers") or []))
        prevent=prevent or bool(rule.get("prevent_self_review"))
    if rule.get("type")=="wait_timer": wait=max(wait,int(rule.get("wait_timer") or 0))
if reviewers != 0: raise SystemExit("solo environment must have zero required reviewers")
if prevent: raise SystemExit("solo environment must not claim prevent_self_review")
if wait < minimum: raise SystemExit(f"solo environment wait timer {wait} is below required {minimum}")
print(f"required_reviewers={reviewers}")
print("prevent_self_review=false")
print(f"wait_timer_minutes={wait}")
print("independent_review=false")
print("review_mode=solo_time_lock_v1")
' "$WAIT_MINUTES" <<<"$env_json"
  python3 -c '
import json,sys
obj=json.load(sys.stdin)
names=sorted({str(x.get("name")) for x in obj.get("branch_policies") or [] if x.get("name")})
if names != ["main"]: raise SystemExit(f"deployment branch policies must be exactly [main], got {names}")
print("deployment_branch_main_only=true")
' <<<"$policies"
  echo "${MARKER}_STATUS_GREEN"
  echo "publication_command_executed=false"
  echo "release_tag_published=false"
  echo "official_release_published=false"
}

if [ "$MODE" = "status" ]; then verify; exit 0; fi
EXPECTED="CONFIGURE VOID SOLO RELEASE TIME LOCK ${WAIT_MINUTES} MINUTES"
[ "$CONFIRMATION" = "$EXPECTED" ] || fail "confirmation mismatch; required: $EXPECTED"

PAYLOAD="$(jq -n --argjson wait "$WAIT_MINUTES" '{wait_timer:$wait,prevent_self_review:false,reviewers:null,deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}}')"
gh api --method PUT -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: $API_VERSION" "repos/$SLUG/environments/$ENVIRONMENT" --input - <<<"$PAYLOAD" >/dev/null

POLICIES="$(gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: $API_VERSION" "repos/$SLUG/environments/$ENVIRONMENT/deployment-branch-policies")"
while IFS=$'\t' read -r id name; do
  [ -n "$id" ] || continue
  if [ "$name" != "main" ]; then
    gh api --method DELETE -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: $API_VERSION" "repos/$SLUG/environments/$ENVIRONMENT/deployment-branch-policies/$id" >/dev/null
  fi
done < <(jq -r '.branch_policies[]? | [.id,.name] | @tsv' <<<"$POLICIES")
POLICIES="$(gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: $API_VERSION" "repos/$SLUG/environments/$ENVIRONMENT/deployment-branch-policies")"
if ! jq -e 'any(.branch_policies[]?; .name=="main")' <<<"$POLICIES" >/dev/null; then
  gh api --method POST -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: $API_VERSION" "repos/$SLUG/environments/$ENVIRONMENT/deployment-branch-policies" -f name=main -f type=branch >/dev/null
fi
verify
echo "${MARKER}_CONFIGURE_GREEN"
