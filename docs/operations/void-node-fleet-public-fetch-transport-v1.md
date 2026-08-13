# VOID node fleet public fetch transport v1

Marker: `VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1`

## Purpose

Standardize the Git fetch transport used by public VOID node source-convergence work without replacing or rewriting each machine's existing `origin` remote.

The tool manages one dedicated local Git remote only:

- remote name: `void-public-fetch`;
- fetch URL: `https://github.com/6ZoSo9/void-node.git`;
- push URL: `/dev/null`.

This removes the recurring operator step of adapting public source fetches to machine-specific GitHub SSH/authentication state. Existing fleet drift/source-convergence controllers remain unchanged; an operator may point their local fleet config at `void-public-fetch` after this remote has been separately configured on the relevant repository.

## Dry run

Dry run is the default and performs no Git or repository mutation. When `--output` is supplied, it may create one local mode-0600 evidence file:

```bash
node tools/void-node-fleet-public-fetch-transport-v1.mjs \
  --repo "$HOME/dev/void-node"
```

A repository must be an ordinary working tree on exact branch `main`, with no merge/rebase/cherry-pick/revert/sequencer/index-lock operation in progress and with an existing `origin` fetch URL. A dirty worktree is allowed because the tool does not touch tracked or untracked files; the exact status/index/ref evidence is bound into the plan instead.

The result is `READY_TO_APPLY` when the dedicated remote is absent or misconfigured, or `ALREADY_ALIGNED` when its fetch/push URLs are already exact. The public receipt hashes existing remote configuration rather than printing potentially sensitive current URLs; the proof rejects leakage of the existing `origin` URL.

## Separately confirmed apply

Apply requires the exact dry-run plan ID and operation marker:

```bash
node tools/void-node-fleet-public-fetch-transport-v1.mjs \
  --repo "$HOME/dev/void-node" \
  --apply \
  --confirm-operation VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1 \
  --confirm-plan-id '<exact plan_id_sha256>'
```

Immediately before mutation, the tool rebuilds the plan from current repository evidence and rejects stale confirmation. Apply changes only these two local Git config keys:

```text
remote.void-public-fetch.url=https://github.com/6ZoSo9/void-node.git
remote.void-public-fetch.pushurl=/dev/null
```

Afterward it requires exact preservation of branch, HEAD, tree, worktree-status digest, dirty count, index digest, complete ref digest, and the existing `origin` fetch/push configuration digests. The dedicated remote must then be exact aligned.

## Authority boundary

This tool does not fetch, pull, checkout, reset, merge, build, install packages, start/stop/restart/reload a service, call a runtime endpoint, alter firewall/router/DNS/interface state, access credentials, use wallets/signers, mutate Work Credits or validators, construct/broadcast transactions, take treasury/liquidity action, or move funds.

The apply mode is a local Git-config mutation and therefore remains a separate operator authorization gate on real machines. A source merge of this tool does not configure any live node. Runtime rollout and service restart remain separate operations under the existing fleet controllers.

If either Git-config write fails, the tool does not retry automatically. The operator must inspect fresh state before another decision because a partial dedicated-remote configuration may exist. Existing `origin` is never an apply target.

## Proof

```bash
node scripts/prove_void_node_fleet_public_fetch_transport_v1.mjs
```

The deterministic proof uses temporary Git repositories only. It covers a missing remote, a misconfigured dedicated remote, exact apply, dirty-worktree preservation, origin preservation, ref/index/HEAD/tree preservation, idempotent rerun, wrong-plan rejection, wrong-confirmation rejection, detached-HEAD rejection, and negative service/runtime/fetch authority.
