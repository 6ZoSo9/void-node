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

The registry stores the durable architectural meaning. Current file matches, Git identities,
counts, proof/workflow/doc matches, and source revision are generated from the checked-out
Git tree when needed.

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

The generated viewer then resolves those pointers against the current checkout and reports
bounded current paths rather than committing a giant static file inventory.

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

- current commit/tree SHA;
- current tracked-file count;
- selector match counts;
- matched file identities;
- proof/workflow/doc counts; and
- bounded current path lists.

This avoids committed churn when files are added inside an already-mapped subsystem.

## Selector contract

V1 intentionally supports only two simple selector shapes:

- `exact` — one exact repository path;
- `prefix` — every tracked path beginning with a stable prefix.

Required selectors must resolve to at least one tracked file. A missing required selector
fails closed when cartography is generated or viewed.

The generator reads the Git index with `git ls-files -s`, so its content identity is based
on tracked path + Git blob identity rather than filesystem timestamps.

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
- an unmerged Git index;
- unknown viewer domains;
- viewer limits outside 1–100; and
- arbitrary registry or repository path overrides.

Both tools are read-only and the proof asserts repository status is unchanged.

## Growth rule

Do not make this an encyclopedia.

Add a domain when it saves meaningful rediscovery work or represents a durable architectural
boundary. Do not add one entry per file, helper, proof, or workflow. Existing domains should
absorb ordinary file growth through their path selectors.

When a subsystem becomes too broad to navigate efficiently, split it into stable child
concepts rather than expanding the directory into a static manifest.

The expected operating pattern is:

1. consult the repository directory;
2. consult a bounded domain section;
3. follow a proof/workflow/doc family or `src/index.ts` landmark;
4. use broad repository search only when the directory does not answer the question.

This keeps broad search as the fallback instead of the default.
