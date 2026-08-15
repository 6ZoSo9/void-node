# VOID node fleet public fetch transport v1

Marker: `VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1`

## Purpose

Standardize the Git fetch transport used by public VOID node source-convergence work without replacing or rewriting each machine's existing `origin` remote.

The tool manages one dedicated local Git remote only:

- remote name: `void-public-fetch`;
- fetch URL: `https://github.com/6ZoSo9/void-node.git`;
- push URL: `/dev/null`.

This removes the recurring operator step of adapting public source fetches to machine-specific GitHub authentication state while leaving the existing fleet drift/source-convergence controllers unchanged.

## Canonical repository prerequisite

Before it can issue a dry-run plan, v1 proves that the selected working tree identifies the canonical `6ZoSo9/void-node` repository through exactly one local `origin` fetch URL. It accepts the reviewed GitHub HTTPS and SSH spellings for that exact owner/repository only.

The stored local value is not sufficient by itself. Git URL rewrite configuration such as `url.<base>.insteadOf` can change the effective fetch destination without changing `remote.origin.url`. The tool therefore also asks Git for the effective `origin` fetch URL and requires that resolved destination to remain one of the reviewed canonical GitHub VOID URLs. Foreign owners or repositories, alternate hosts, mixed or duplicate URLs, and rewritten effective destinations fail closed before dedicated-remote mutation.

Existing `origin` push configuration remains operator-specific: the tool binds and preserves it but does not use it as repository identity and never rewrites it. Public receipts report the canonical repository identity and hashes of the stored/effective origin configuration rather than printing the operator's current origin URL.

## Selected-worktree confirmation binding

Repository content identity alone is not enough for an operator mutation plan because multiple canonical clones can legitimately have identical branch, HEAD/tree, refs, index, worktree status, and remote configuration. A plan prepared for one clone must not authorize local Git-config mutation in another clone merely because their content state matches.

V1 therefore derives a non-secret `repository_identity_sha256` from both the canonical real paths and filesystem-object identities of the selected worktree top level, its absolute Git directory, and its Git common directory. The object identity uses device, inode, and birth-time metadata supplied by the local filesystem. Raw paths and raw filesystem metadata remain private to the local inspection result; the public plan carries only the digest. That digest is part of the content-addressed plan and the post-apply preservation invariant.

An unchanged selected repository produces a stable identity and plan. Two otherwise byte/state-identical clones at different filesystem locations produce different plan IDs, and replacing a repository with a state-identical copy at the same canonical path also changes the identity. Applying a confirmed plan to either another clone or a same-path replacement therefore fails before any dedicated-remote mutation.

## Git repository and configuration environment boundary

`--repo` must identify the repository that every Git inspection and local config write actually uses, and the controller must observe the operator's ordinary Git configuration sources. Git environment variables can otherwise redirect the repository or replace, suppress, or inject configuration even when commands use `git -C <repo>`.

V1 therefore fails closed before Git inspection or evidence-output reservation when any of these repository-selection or configuration-source variables are present:

- `GIT_DIR`;
- `GIT_WORK_TREE`;
- `GIT_INDEX_FILE`;
- `GIT_COMMON_DIR`;
- `GIT_OBJECT_DIRECTORY`;
- `GIT_ALTERNATE_OBJECT_DIRECTORIES`;
- `GIT_NAMESPACE`;
- `GIT_CONFIG`;
- `GIT_CONFIG_GLOBAL`;
- `GIT_CONFIG_SYSTEM`;
- `GIT_CONFIG_NOSYSTEM`;
- `GIT_CONFIG_PARAMETERS`;
- `GIT_CONFIG_COUNT`; or
- any indexed `GIT_CONFIG_KEY_<n>` / `GIT_CONFIG_VALUE_<n>` entry.

The tool reports only variable names, never their values. It does not silently scrub these variables: a caller that intentionally selected another repository, object namespace, config file, config-suppression mode, or command-scoped config injection must return to an ordinary shell and collect fresh evidence.

This boundary deliberately preserves **default** Git configuration discovery. With none of the override variables above present, ordinary global and system configuration remains visible, so `url.<base>.insteadOf` rewrites and inherited non-local remote configuration are still part of the reviewed effective-URL policy. A caller cannot make a dangerous global/system rewrite disappear by setting `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_SYSTEM=...`, or `GIT_CONFIG_COUNT`/indexed key-value injection and then obtain an apparently canonical plan.

## Effective dedicated fetch boundary

The dedicated remote must be locally owned by this tool. A `remote.void-public-fetch.url` or `pushurl` inherited from non-local Git configuration is rejected rather than silently combined with the local configuration this tool manages.

Before planning or apply, the tool resolves the canonical public HTTPS URL through Git without contacting the network and requires the effective destination to remain exactly `https://github.com/6ZoSo9/void-node.git`. This prevents ambient `url.<base>.insteadOf` rules from redirecting the reviewed public fetch URL to another host. If the dedicated remote already exists, its own effective fetch URL must also resolve to that exact canonical URL before the state can be classified `ALIGNED`.

The stored and effective URL identities are content-addressed into the dry-run plan. A relevant Git configuration change between dry run and apply changes the plan and invalidates the confirmation.

## Evidence-output boundary

An optional `--output` receipt is evidence, not part of the repository mutation. Its destination is validated **before any apply mutation** and must resolve outside the worktree top level, absolute Git directory, and Git common directory.

The tool canonicalizes the output parent directory before use, so an outside symlink that resolves back into repository or Git administrative state does not bypass this rule. The parent must already exist. The receipt is create-only (`wx`) and mode `0600`.

When an output path is requested, the tool reserves that create-only receipt before any Git-config apply mutation. An existing or uncreatable receipt path therefore fails before the dedicated remote can change. Reservation is a path-availability and no-overwrite boundary; it does not claim that later device, quota, or filesystem failure cannot occur while final evidence bytes are written after a successful Git-config mutation.

If final evidence writing fails after the dedicated remote has already reached `TRANSPORT_CONFIGURED`, the CLI returns `HOLD`, truthfully preserves `mutation_attempted=true` and `mutation_succeeded=true`, and requires fresh repository inspection before any retry. The tool rewrites the reserved descriptor from offset zero and fsyncs completed receipts; if the filesystem cannot accept even the HOLD record, stdout remains the terminal truth.

## Dry run

Dry run is the default and performs no Git or repository mutation. When `--output` is supplied, it may create one mode-0600 evidence file only at a validated outside-repository path.

The repository must be an ordinary working tree on exact branch `main`, with no merge/rebase/cherry-pick/revert/sequencer/index-lock operation in progress, no forbidden Git repository/configuration environment, and the canonical repository prerequisite above satisfied. A dirty worktree is allowed because the tool does not touch tracked or untracked files; exact selected-worktree identity, status/index/ref evidence, and repository content identity are bound into the plan instead.

The result is `READY_TO_APPLY` when the dedicated remote is absent or misconfigured, or `ALREADY_ALIGNED` when its stored and effective fetch URL plus push URL are all exact.

## Separately confirmed apply

Apply requires the exact dry-run plan ID and operation marker `VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1`. Immediately before mutation, the tool rebuilds the plan from current repository, selected-worktree, and effective-URL evidence and rejects stale confirmation.

Apply is bounded to the dedicated remote's local fetch and push configuration. Afterward it requires exact preservation of selected-worktree identity, branch, HEAD, tree, worktree-status digest, dirty count, index digest, complete ref digest, canonical origin identity, existing origin stored/effective fetch identity, existing origin push configuration, and the prospective canonical public-fetch resolution. The dedicated remote must then be exact aligned in both stored and effective fetch identity.

## Paste-safe operator journey

Run from a normal shell with repository-selection and Git configuration-source/injection override variables unset. If those variables are present, the tool returns `HOLD` before evidence creation or Git-config mutation.

```bash
set -euo pipefail

REPO="${VOID_NODE_REPO:-$HOME/dev/void-node}"
EVIDENCE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/void/public-fetch-transport-v1"
mkdir -p "$EVIDENCE_DIR"
chmod 700 "$EVIDENCE_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)-$$"
PLAN="$EVIDENCE_DIR/plan-$STAMP.json"
RESULT="$EVIDENCE_DIR/result-$STAMP.json"

node tools/void-node-fleet-public-fetch-transport-v1.mjs \
  --repo "$REPO" \
  --output "$PLAN"

read -r OUTCOME PLAN_ID < <(
  node -e '
    const fs = require("node:fs");
    const receipt = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    process.stdout.write(`${receipt.outcome} ${receipt.plan.plan_id_sha256}\n`);
  ' "$PLAN"
)

case "$OUTCOME" in
  READY_TO_APPLY)
    node tools/void-node-fleet-public-fetch-transport-v1.mjs \
      --repo "$REPO" \
      --output "$RESULT" \
      --apply \
      --confirm-operation VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1 \
      --confirm-plan-id "$PLAN_ID"
    ;;
  ALREADY_ALIGNED)
    printf 'public_fetch_transport=already_aligned\n'
    ;;
  *)
    printf 'HOLD: unexpected dry-run outcome: %s\n' "$OUTCOME" >&2
    exit 2
    ;;
esac

test "$(git -C "$REPO" remote get-url --all void-public-fetch)" = \
  'https://github.com/6ZoSo9/void-node.git'
test "$(git -C "$REPO" remote get-url --push void-public-fetch)" = '/dev/null'
printf 'public_fetch_transport_postcheck=green\n'
```

The evidence path is intentionally outside the selected repository and unique per run. A dry-run `HOLD`, nonzero exit, or repository/configuration change before apply invalidates the old plan. If confirmed apply reports `mutation_attempted=true` and exits nonzero, treat that as an inspection-required terminal state and collect fresh evidence instead of replaying the old plan.

This journey does not fetch from the new remote. Source convergence remains a later separately authorized controller operation.

## Authority boundary

This tool does not fetch, pull, checkout, reset, merge, build, install packages, start/stop/restart/reload a service, call a runtime endpoint, alter firewall/router/DNS/interface state, access credentials, use wallets/signers, mutate Work Credits or validators, construct/broadcast transactions, take treasury/liquidity action, or move funds.

The apply mode is a local Git-config mutation and therefore remains a separate operator authorization gate on real machines. A source merge of this tool does not configure any live node. Runtime rollout and service restart remain separate operations under the existing fleet controllers.

If either bounded Git-config write fails, or if post-apply evidence publication fails, the tool does not retry automatically. The operator must inspect fresh state before another decision because a partial or fully aligned dedicated-remote configuration may exist. Existing `origin` is never an apply target.

## Proof

Run the deterministic proof with:

```bash
node scripts/prove_void_node_fleet_public_fetch_transport_v1.mjs
```

The proof uses temporary Git repositories plus a temporary `HOME`/ordinary global Git config; it does not rely on forbidden Git config-source overrides for normal test isolation. It covers canonical origins; foreign/alternate/mixed/duplicate-origin rejection; effective `insteadOf` rewrite rejection; inherited non-local dedicated-remote rejection; repository-selection environment rejection; configuration-source/config-injection rejection; a raw-Git reproduction showing global/system rewrites can be hidden by `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_NOSYSTEM`; indexed `GIT_CONFIG_COUNT` injection rejection; selected-worktree identity across different clones and same-path replacement; missing/misconfigured/aligned remotes; exact stale-plan confirmation; dirty-worktree and origin/ref/index/HEAD/tree preservation; unsafe/pre-existing evidence output; create-only mode-0600 receipts; post-apply receipt-write failure truth; the complete CLI dry-run -> confirmed apply -> aligned rerun journey; idempotence; detached-HEAD rejection; and negative service/runtime/fetch authority.