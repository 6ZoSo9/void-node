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

Before it can issue a dry-run plan, v1 now proves that the selected working tree already identifies the canonical `6ZoSo9/void-node` repository through exactly one existing `origin` fetch URL. It accepts the reviewed GitHub HTTPS and SSH spellings for that exact owner/repository only.

Foreign owners or repositories, alternate hosts, mixed fetch URLs, and duplicate fetch URLs fail closed before any dedicated-remote configuration can change. Existing `origin` push configuration remains operator-specific: the tool binds and preserves it but does not use it as repository identity and never rewrites it.

Public receipts report the canonical repository identity and hashes of the existing origin configuration rather than printing the operator's current origin URL.

## Dry run

Dry run is the default and performs no Git or repository mutation. When `--output` is supplied, it may create one local mode-0600 evidence file.

The repository must be an ordinary working tree on exact branch `main`, with no merge/rebase/cherry-pick/revert/sequencer/index-lock operation in progress and with the canonical repository prerequisite above satisfied. A dirty worktree is allowed because the tool does not touch tracked or untracked files; exact status/index/ref evidence is bound into the plan instead.

The result is `READY_TO_APPLY` when the dedicated remote is absent or misconfigured, or `ALREADY_ALIGNED` when its fetch/push URLs are already exact.

## Separately confirmed apply

Apply requires the exact dry-run plan ID and operation marker `VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1`. Immediately before mutation, the tool rebuilds the plan from current repository evidence and rejects stale confirmation.

Apply is bounded to the dedicated remote's local fetch and push configuration. Afterward it requires exact preservation of branch, HEAD, tree, worktree-status digest, dirty count, index digest, complete ref digest, canonical origin identity, and existing origin fetch/push configuration digests. The dedicated remote must then be exact aligned.

## Authority boundary

This tool does not fetch, pull, checkout, reset, merge, build, install packages, start/stop/restart/reload a service, call a runtime endpoint, alter firewall/router/DNS/interface state, access credentials, use wallets/signers, mutate Work Credits or validators, construct/broadcast transactions, take treasury/liquidity action, or move funds.

The apply mode is a local Git-config mutation and therefore remains a separate operator authorization gate on real machines. A source merge of this tool does not configure any live node. Runtime rollout and service restart remain separate operations under the existing fleet controllers.

If either bounded Git-config write fails, the tool does not retry automatically. The operator must inspect fresh state before another decision because a partial dedicated-remote configuration may exist. Existing `origin` is never an apply target.

## Proof

Run the deterministic proof with:

```bash
node scripts/prove_void_node_fleet_public_fetch_transport_v1.mjs
```

The proof uses temporary Git repositories only. It covers canonical HTTPS and SSH origins, foreign/alternate-host/mixed/duplicate-origin rejection before dedicated-remote creation, missing and misconfigured dedicated remotes, exact confirmation, dirty-worktree preservation, origin/ref/index/HEAD/tree preservation, idempotent rerun, wrong-plan and wrong-confirmation rejection, detached-HEAD rejection, public origin-URL redaction, and negative service/runtime/fetch authority.
