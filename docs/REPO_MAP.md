# VOID Repository Directory

Marker: `VOID_REPO_CARTOGRAPHY_V1`

This directory exists to stop reviewers, operators, and workers from rediscovering the
repository from scratch on every task. It is **navigation infrastructure**, not a duplicate
copy of the source tree and not an authority grant.

The stable identity is a domain ID such as:

- `core.runtime`
- `network.p2p`
- `economic.buy-void`
- `economic.work-credits`
- `agents.mcp`
- `operations.mainnet`
- `governance`
- `release`

The registry stores durable architectural meaning. Current file matches, Git identities,
counts, proof/workflow/doc matches, and source revision are generated from one **pinned HEAD
commit tree** captured at invocation. Staged files, unstaged edits, and a checkout that moves
after that pin are not mixed into evidence labeled with the pinned commit/tree.

## Normal review flow

Start with the smallest relevant domain instead of a whole-repository search:

```bash
node scripts/review_void_repo_section_v1.mjs --domain economic.buy-void
```

For another subsystem:

```bash
node scripts/review_void_repo_section_v1.mjs --domain network.p2p
node scripts/review_void_repo_section_v1.mjs --domain agents.mcp
node scripts/review_void_repo_section_v1.mjs --domain operations.mainnet
```

The default viewer emits at most 25 paths from each dynamic category. Increase the bounded
limit when necessary, up to 100:

```bash
node scripts/review_void_repo_section_v1.mjs \
  --domain economic.work-credits \
  --limit 60
```

Machine-readable output is available with `--format json`.

For a broad current directory table:

```bash
node scripts/generate_void_repo_cartography_v1.mjs --format markdown
```

or:

```bash
node scripts/generate_void_repo_cartography_v1.mjs --format json
```

## What one domain tells you

A domain entry answers the questions that usually cause repeated repository search:

- what the subsystem is for;
- which exact paths or path prefixes are canonical starting points;
- useful human aliases;
- which neighboring domains are commonly involved;
- which existing `src/index.ts` landmarks lead into the monolith;
- which authority/sensitivity surfaces deserve extra care; and
- which proof, workflow, and documentation filename families are likely relevant.

The generated viewer resolves all of those fields from the same pinned commit snapshot used
for `source_commit_sha`, `source_tree_sha`, and registry identity. One section cannot combine
domain evidence from one checkout state with source identity from another.

## Relationship to `src/index.ts` cartography

`docs/index-map-v1.json` remains the specialized navigation map for the historical
`src/index.ts` monolith.

`docs/repo-map-v1.json` is the architectural directory above it. A repository domain may
reference one or more stable index landmarks. For example, `economic.buy-void` points to the
existing Buy VOID index landmarks while also identifying the broader source/proof/workflow
families outside `src/index.ts`.

The repository map validates every referenced index landmark. A stale or invented landmark
fails closed.

## Generated evidence, curated meaning

The map deliberately separates two kinds of information.

**Curated and stable:**

- domain ID;
- purpose;
- aliases;
- canonical selectors;
- related domains;
- authority/sensitivity labels; and
- `src/index.ts` landmark relationships.

**Generated and disposable:**

- pinned source commit/tree SHA;
- tracked-file count from that commit tree;
- selector match counts;
- matched Git object identities;
- proof/workflow/doc counts; and
- bounded current path lists for that exact commit.

This avoids committed churn when files are added inside an already-mapped subsystem without
weakening source provenance.

## Snapshot contract

The generator pins `HEAD^{commit}` exactly once before collecting commit-labeled evidence.
It then reads both registries from that exact commit object and enumerates tracked paths and
Git object identities with `git ls-tree` against the same pinned commit. The tree SHA is also
derived from that pinned commit, not from a later live `HEAD` read.

Therefore:

- staged additions or replacements do not appear under the unchanged HEAD identity;
- unstaged registry edits do not alter the registry digest or curated domain content reported
  for the unchanged HEAD identity;
- a concurrent checkout/HEAD movement after the pin cannot change the snapshot being
  resolved; and
- explicit in-memory registry overrides are marked `source_snapshot_bound=false` and are not
  allowed to masquerade as exact commit-bound evidence.

The tooling is read-only. It does not clean, reset, stash, checkout, or otherwise modify the
caller's repository to establish this invariant.

## Selector contract

V1 intentionally supports only two simple selector shapes:

- `exact` — one exact repository path;
- `prefix` — every tracked path beginning with a stable prefix.

Required selectors must resolve to at least one tracked file. A missing required selector
fails closed when cartography is generated or viewed.

Content identity comes from the pinned commit tree rather than the mutable Git index or
filesystem timestamps.

## Coordination precedence

The `operations.coordination` domain has a special navigation rule because checked-in
coordination artifacts cannot represent live GitHub state by themselves.

`AGENTS.md` is the required canonical starting point. It defines how a worker discovers the
**current live GitHub coordination issue** (currently #1301 while it remains designated
current) and how to follow an explicit successor if that issue is closed, superseded, or
replaced. Only after resolving that live control plane should a worker use checked-in
`ops/coordination/` material as repository history, roster/dispatch implementation context,
or supporting operator evidence.

Accordingly, `ops/coordination/` is **not** labeled as the live coordination source of truth.
The repository directory cannot grant ownership, priority, collision clearance, or lifecycle
authority, and it cannot replace the mandatory `AGENTS.md` + current GitHub control-plane
handoff.

## Authority labels

`authority_surfaces` are navigation warnings only. They tell a reviewer that a subsystem can
intersect areas such as runtime, network, economic state, Work Credits, validators,
wallet/signing, transactions, treasury, deployment, governance, or CI.

They **do not grant permission**, prove a feature is active, or replace the repository's
actual authorization and operational boundaries.

## Fail-closed rules

The tooling rejects:

- malformed registries;
- duplicate or malformed domain IDs;
- unsupported selectors;
- missing required selectors;
- unknown related-domain references;
- unknown `src/index.ts` landmark references;
- unavailable/malformed pinned commit or tree identity;
- unreadable required registry bytes in the pinned commit;
- malformed Git tree entries;
- unknown viewer domains;
- viewer limits outside 1–100; and
- arbitrary registry or repository path overrides.

The proof also adversarially checks dirty staged/unstaged state and a checkout movement after
the source commit is pinned. Both must preserve one coherent source snapshot, and the proof
asserts that the real repository status is unchanged before and after verification.

## Growth rule

Do not make this an encyclopedia.

Add a domain when it saves meaningful rediscovery work or represents a durable architectural
boundary. Do not add one entry per file, helper, proof, or workflow. Existing domains should
absorb ordinary file growth through their path selectors.

When a subsystem becomes too broad to navigate efficiently, split it into stable child
concepts rather than expanding the directory into a static manifest.

The expected operating pattern is:

1. read `AGENTS.md` and resolve the current live coordination control plane before work;
2. consult the repository directory;
3. consult a bounded domain section;
4. follow a proof/workflow/doc family or `src/index.ts` landmark; and
5. use broad repository search only when the directory does not answer the question.

This keeps broad search as the fallback instead of the default while preserving live
coordination precedence.
