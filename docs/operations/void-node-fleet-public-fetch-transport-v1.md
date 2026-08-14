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

V1 therefore derives a non-secret `repository_identity_sha256` from the canonical real paths of the selected worktree top level, its absolute Git directory, and its Git common directory. The raw paths remain private to the local inspection result; the public plan carries only the digest. That digest is part of the content-addressed plan and the post-apply preservation invariant.

Two otherwise byte/state-identical clones at different filesystem locations must therefore produce different plan IDs. Applying clone A's confirmed plan ID to clone B fails before any dedicated-remote mutation.

## Effective dedicated fetch boundary

The dedicated remote must be locally owned by this tool. A `remote.void-public-fetch.url` or `pushurl` inherited from non-local Git configuration is rejected rather than silently combined with the local configuration this tool manages.

Before planning or apply, the tool resolves the canonical public HTTPS URL through Git without contacting the network and requires the effective destination to remain exactly `https://github.com/6ZoSo9/void-node.git`. This prevents ambient `url.<base>.insteadOf` rules from redirecting the reviewed public fetch URL to another host. If the dedicated remote already exists, its own effective fetch URL must also resolve to that exact canonical URL before the state can be classified `ALIGNED`.

The stored and effective URL identities are content-addressed into the dry-run plan. A relevant Git configuration change between dry run and apply changes the plan and invalidates the confirmation.

## Evidence-output boundary

An optional `--output` receipt is evidence, not part of the repository mutation. Its destination is therefore validated **before any apply mutation** and must resolve outside all three selected-repository boundaries:

- the worktree top level;
- the absolute Git directory; and
- the Git common directory.

The tool canonicalizes the output parent directory before use, so an outside symlink that resolves back into the worktree or Git administrative state does not bypass this rule. The parent must already exist. The receipt itself remains create-only (`wx`) and mode `0600`.

When an output path is requested, the tool reserves that create-only receipt before any Git-config apply mutation. An existing or uncreatable receipt path therefore fails before the dedicated remote can change. Reservation is a path-availability and no-overwrite boundary; it does **not** claim that a later device, quota, or filesystem failure cannot occur while final evidence bytes are written after a successful Git-config mutation.

If final evidence writing fails after the dedicated remote has already reached `TRANSPORT_CONFIGURED`, the CLI returns `HOLD`, truthfully preserves `mutation_attempted=true` and `mutation_succeeded=true`, and requires fresh repository inspection before any retry. The tool rewrites the reserved descriptor from offset zero and fsyncs completed receipts; if the failure permits a second write, the reserved receipt itself becomes the truthful HOLD record. If the filesystem cannot accept even that HOLD record, stdout remains the terminal truth.

This boundary applies to both dry-run and apply. A dry-run receipt cannot make the status-bound plan stale by creating an untracked file inside the selected worktree, and an apply receipt cannot mutate `.git` after post-state verification has already declared repository invariants preserved. Unsafe output destinations return `HOLD` without creating the receipt or configuring the dedicated remote.

## Dry run

Dry run is the default and performs no Git or repository mutation. When `--output` is supplied, it may create one mode-0600 evidence file only at a validated outside-repository path.

The repository must be an ordinary working tree on exact branch `main`, with no merge/rebase/cherry-pick/revert/sequencer/index-lock operation in progress and with the canonical repository prerequisite above satisfied. A dirty worktree is allowed because the tool does not touch tracked or untracked files; exact selected-worktree identity, status/index/ref evidence, and repository content identity are bound into the plan instead.

The result is `READY_TO_APPLY` when the dedicated remote is absent or misconfigured, or `ALREADY_ALIGNED` when its stored and effective fetch URL plus push URL are all exact.

## Separately confirmed apply

Apply requires the exact dry-run plan ID and operation marker `VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1`. Immediately before mutation, the tool rebuilds the plan from current repository, selected-worktree, and effective-URL evidence and rejects stale confirmation.

Apply is bounded to the dedicated remote's local fetch and push configuration. Afterward it requires exact preservation of selected-worktree identity, branch, HEAD, tree, worktree-status digest, dirty count, index digest, complete ref digest, canonical origin identity, existing origin stored/effective fetch identity, existing origin push configuration, and the prospective canonical public-fetch resolution. The dedicated remote must then be exact aligned in both stored and effective fetch identity.

## Paste-safe operator journey

The intended operator journey is dry-run evidence first, then one exact confirmation if mutation is required, then a read-only post-state check. Run this from a shell that can execute the checked-in repository tool:

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

The evidence path is intentionally outside the selected repository and unique per run. `--output` is create-only and mode `0600`; it refuses to overwrite an existing receipt and rejects any destination that resolves into the worktree or Git administrative directories. The dry-run receipt contains the exact confirmation plan ID but does not print the selected filesystem path or the operator-specific `origin` URL. If the dry run returns `HOLD`, exits nonzero, or repository/configuration evidence changes before apply, stop and collect fresh evidence instead of retrying automatically.

If the confirmed apply exits nonzero after reporting `mutation_attempted=true`, treat that as an **inspection-required terminal state**, not as permission to rerun the old plan. In particular, `mutation_succeeded=true` means the dedicated remote reached the reviewed aligned state even though final evidence publication failed; collect fresh `git remote get-url` and repository evidence before making another decision.

This journey does not fetch from the new remote. It only proves and, after exact confirmation, configures the local fetch-only transport. Source convergence remains a later separately authorized controller operation.

## Authority boundary

This tool does not fetch, pull, checkout, reset, merge, build, install packages, start/stop/restart/reload a service, call a runtime endpoint, alter firewall/router/DNS/interface state, access credentials, use wallets/signers, mutate Work Credits or validators, construct/broadcast transactions, take treasury/liquidity action, or move funds.

The apply mode is a local Git-config mutation and therefore remains a separate operator authorization gate on real machines. A source merge of this tool does not configure any live node. Runtime rollout and service restart remain separate operations under the existing fleet controllers.

If either bounded Git-config write fails, or if post-apply evidence publication fails, the tool does not retry automatically. The operator must inspect fresh state before another decision because a partial or fully aligned dedicated-remote configuration may exist. Existing `origin` is never an apply target.

## Proof

Run the deterministic proof with:

```bash
node scripts/prove_void_node_fleet_public_fetch_transport_v1.mjs
```

The proof uses temporary Git repositories and an isolated temporary Git global-config file only. It covers canonical HTTPS and SSH origins; foreign/alternate-host/mixed/duplicate-origin rejection; origin and prospective-public-fetch `insteadOf` rewrite rejection; inherited non-local dedicated-remote rejection; selected-worktree identity binding across byte/state-identical clones at different paths; cross-clone plan-reuse rejection; missing and misconfigured dedicated remotes; exact confirmation; dirty-worktree preservation; origin/ref/index/HEAD/tree preservation; rejection of dry-run output inside the worktree; rejection of apply output inside Git administrative state before remote mutation; rejection of a pre-existing apply receipt before remote mutation; create-only mode-0600 outside-repository dry-run/apply receipts; receipt no-overwrite behavior; a fault-injected final receipt write after successful apply that must report `mutation_attempted=true` and `mutation_succeeded=true`; the actual CLI dry-run -> confirmed apply -> aligned rerun journey; idempotent rerun; wrong-plan and wrong-confirmation rejection; detached-HEAD rejection; public origin/path redaction; and negative service/runtime/fetch authority.
