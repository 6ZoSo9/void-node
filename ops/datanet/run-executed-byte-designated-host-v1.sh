#!/usr/bin/env bash
set -euo pipefail

MARKER=VOID_DATANET_EXECUTED_BYTE_DESIGNATED_HOST_RUNNER_V1
REPO=6ZoSo9/void-node
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$ROOT"

fail() {
  printf 'HOLD_%s: %s\n' "$MARKER" "$*" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git missing"
command -v python3 >/dev/null 2>&1 || fail "python3 missing"
command -v gh >/dev/null 2>&1 || fail "gh missing (needed to fetch exact hosted-tier artifact)"
[[ "$(uname -s)" == Linux ]] || fail "Linux required"
[[ "$(uname -m)" == x86_64 ]] || fail "x86_64 required"
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail "tracked worktree is dirty"

HEAD="$(git rev-parse HEAD)"
TREE="$(git rev-parse 'HEAD^{tree}')"
[[ "$HEAD" =~ ^[0-9a-f]{40}$ ]] || fail "invalid HEAD"
[[ "$TREE" =~ ^[0-9a-f]{40}$ ]] || fail "invalid tree"
gh auth status --hostname github.com >/dev/null 2>&1 || fail "gh is not authenticated for github.com"
RUN_ID="$(gh run list --repo "$REPO" --commit "$HEAD" --status success --limit 100 --json databaseId,workflowName,conclusion --jq 'map(select(.workflowName=="VOID DataNet executed-byte hosted campaign v1" and .conclusion=="success")) | .[0].databaseId // empty')"
[[ "$RUN_ID" =~ ^[1-9][0-9]*$ ]] || fail "no successful hosted campaign found for exact head $HEAD"
ARTIFACT_OK="$(gh api "repos/$REPO/actions/runs/$RUN_ID/artifacts" --jq '[.artifacts[] | select(.name=="datanet-executed-byte-hosted-tier" and .expired==false)] | length')"
[[ "$ARTIFACT_OK" == 1 ]] || fail "exact hosted-tier artifact missing or expired for run $RUN_ID"

declare -A NODE_BIN=()
declare -a CANDIDATES=()
add_candidate() {
  local p="${1:-}"
  [[ -n "$p" && -x "$p" ]] || return 0
  CANDIDATES+=("$p")
}
for major in 22 24 26; do
  var="VOID_NODE${major}"
  add_candidate "${!var:-}"
  command -v "node${major}" >/dev/null 2>&1 && add_candidate "$(command -v "node${major}")"
done
command -v node >/dev/null 2>&1 && add_candidate "$(command -v node)"
shopt -s nullglob
for p in   "$HOME"/.nvm/versions/node/v*/bin/node   "$HOME"/.asdf/installs/nodejs/*/bin/node   "$HOME"/.local/share/mise/installs/node/*/bin/node   "$HOME"/.local/node*/bin/node   "$HOME"/Downloads/node-v*/bin/node   /usr/local/bin/node /usr/bin/node /opt/node*/bin/node; do
  add_candidate "$p"
done
while IFS= read -r -d '' p; do add_candidate "$p"; done < <(
  find "$HOME/Downloads" "$HOME/.local" "$HOME/.nvm" "$HOME/.asdf"     -xdev -maxdepth 8 -type f -name node -perm -u+x -print0 2>/dev/null || true
)

for p in "${CANDIDATES[@]}"; do
  version="$("$p" --version 2>/dev/null || true)"
  [[ "$version" =~ ^v(22|24|26)\.[0-9]+\.[0-9]+$ ]] || continue
  major="${BASH_REMATCH[1]}"
  if [[ -z "${NODE_BIN[$major]:-}" ]]; then
    NODE_BIN[$major]="$(readlink -f "$p")"
  fi
done
for major in 22 24 26; do
  [[ -n "${NODE_BIN[$major]:-}" ]] || fail "Node ${major} runtime not found; set VOID_NODE${major}=/absolute/path/to/node"
done

OUT="${VOID_DESIGNATED_OUT:-${TMPDIR:-/tmp}/void-datanet-executed-byte-designated-host-${HEAD}}"
[[ ! -e "$OUT" ]] || fail "output already exists: $OUT"
mkdir -m 700 "$OUT"
MEMBERS="$OUT/members"; mkdir -m 700 "$MEMBERS"

printf '%s\n' "$MARKER"
printf 'head=%s\n' "$HEAD"
printf 'tree=%s\n' "$TREE"
for major in 22 24 26; do
  printf 'node_%s=%s version=%s\n' "$major" "${NODE_BIN[$major]}" "$("${NODE_BIN[$major]}" --version)"
done

for major in 22 24 26; do
  for profile in current protected; do
    dest="$MEMBERS/node-${major}-${profile}"
    VOID_EXECUTED_BYTE_HOST_TIER=designated-host       python3 scripts/prove_datanet_executed_byte_hosted_campaign_v1.py       "${NODE_BIN[$major]}" "$profile" "$dest"
  done
done

DESIGNATED="$OUT/designated"
node scripts/aggregate_void_datanet_executed_byte_hosted_tier_v1.mjs   "$MEMBERS" "$DESIGNATED" designated-host

HOSTED="$OUT/hosted"
mkdir -m 700 "$HOSTED"
gh run download "$RUN_ID" --repo "$REPO"   --name datanet-executed-byte-hosted-tier --dir "$HOSTED"
[[ -f "$HOSTED/hosted-tier.json" ]] || fail "hosted tier artifact missing"

FINAL="$OUT/final"
node scripts/aggregate_void_datanet_executed_byte_two_tier_v1.mjs   "$HOSTED/hosted-tier.json" "$DESIGNATED/designated-host-tier.json" "$FINAL"

printf 'hosted_run_id=%s\n' "$RUN_ID"
printf 'designated_tier_sha256=%s\n' "$(sha256sum "$DESIGNATED/designated-host-tier.json" | awk '{print $1}')"
printf 'hosted_tier_sha256=%s\n' "$(sha256sum "$HOSTED/hosted-tier.json" | awk '{print $1}')"
printf 'two_tier_sha256=%s\n' "$(sha256sum "$FINAL/two-tier.json" | awk '{print $1}')"
printf 'two_tier_path=%s\n' "$FINAL/two-tier.json"
printf 'deployment=false\nwallet_or_funds_action=false\n'
printf '%s_GREEN\n' "$MARKER"
