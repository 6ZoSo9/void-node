# VOID Repository Directory

Marker: `VOID_REPO_CARTOGRAPHY_V1`

This directory keeps reviewers, operators, and workers from rediscovering the whole
repository on every task. It is **navigation infrastructure**, not a copy of the
source tree and not an authority grant.

Stable identities are domain IDs such as `core.runtime`, `network.p2p`,
`economic.buy-void`, `economic.work-credits`, `agents.mcp`,
`operations.mainnet`, `governance`, `release`, and `security`.

The registry stores durable architectural meaning. Generated evidence binds
current path matches, Git object identities, counts, registry bytes, source
revision, and the exact reviewed Git executable used to read that revision.

## Reviewed Git executable boundary

Commit-labeled cartography is not allowed to resolve the program named `git`
through ambient `PATH`. Before the first repository/object read, provide one
reviewed absolute Git executable plus its exact SHA-256:

```bash
export VOID_REPO_CARTOGRAPHY_GIT_EXECUTABLE=/usr/bin/git
export VOID_REPO_CARTOGRAPHY_GIT_EXECUTABLE_SHA256="$(
  sha256sum "$VOID_REPO_CARTOGRAPHY_GIT_EXECUTABLE" | awk '{print $1}'
)"
```

The generator:

- requires the executable path to be absolute;
- resolves and binds its canonical path;
- requires a regular executable file;
- verifies the supplied SHA-256 before every Git read;
- binds a filesystem-object identity for the executable;
- executes that absolute binary rather than the program selected by `PATH`;
- strips repository/object/config/program-selection Git environment overrides;
- constrains child program lookup to the reviewed executable directory; and
- rechecks the executable identity after each Git read and after the complete
  source snapshot is collected.

The emitted map records `git_executable_path`, `git_executable_sha256`,
`git_executable_filesystem_identity_sha256`, and
`git_executable_identity_bound=true`.

A missing, relative, unreadable, non-executable, digest-mismatched, or
mid-collection changed Git executable fails closed before commit-bound evidence
is accepted. A caller-controlled `PATH` cannot substitute a fake top-level
`git` while the packet still claims `source_snapshot_bound=true`.

This boundary is about evidence provenance. It does not install Git, mutate Git
configuration, fetch, checkout, clean, reset, stash, or modify repository state.

## Normal review flow

After binding the reviewed Git executable, start with the smallest relevant
domain:

```bash
node scripts/review_void_repo_section_v1.mjs --domain economic.buy-void
node scripts/review_void_repo_section_v1.mjs --domain network.p2p
node scripts/review_void_repo_section_v1.mjs --domain agents.mcp
node scripts/review_void_repo_section_v1.mjs --domain operations.mainnet
```

The default viewer emits at most 25 paths from each dynamic category. Increase
the bounded limit only when needed, up to 100:

```bash
node scripts/review_void_repo_section_v1.mjs \
  --domain economic.work-credits \
  --limit 60
```

Machine-readable viewer output uses `--format json`.

For a broad current directory table:

```bash
node scripts/generate_void_repo_cartography_v1.mjs --format markdown
```

or:

```bash
node scripts/generate_void_repo_cartography_v1.mjs --format json
```

## What one domain tells you

A domain entry records:

- the subsystem purpose;
- canonical exact paths or stable path prefixes;
- useful aliases;
- related domains;
- existing `src/index.ts` landmarks where applicable;
- authority/sensitivity surfaces that deserve extra care; and
- likely proof, workflow, and documentation filename families.

The viewer resolves those fields from the same pinned commit snapshot used for
`source_commit_sha`, `source_tree_sha`, registry identity, and reviewed Git
executable identity.

## Relationship to `src/index.ts` cartography

`docs/index-map-v1.json` remains the specialized navigation map for the
historical `src/index.ts` monolith.

`docs/repo-map-v1.json` is the architectural directory above it. A repository
domain may reference stable index landmarks. The repository map validates every
referenced landmark; a stale or invented landmark fails closed.

## Generated evidence, curated meaning

**Curated and stable:**

- domain ID and purpose;
- aliases;
- canonical selectors;
- related domains;
- authority/sensitivity labels; and
- `src/index.ts` landmark relationships.

**Generated and disposable:**

- reviewed Git executable identity;
- pinned source commit/tree SHA;
- tracked-file count from that commit tree;
- selector match counts;
- matched Git object identities;
- proof/workflow/doc counts; and
- bounded current path lists for that exact commit.

This avoids committed churn when files are added inside an already mapped
subsystem while keeping evidence provenance explicit.

## Snapshot contract

The generator pins `HEAD^{commit}` once before collecting commit-labeled
evidence. This is the pinned HEAD commit tree boundary for all generated
cartography evidence. It reads both registries from that exact commit object and
enumerates tracked paths and object identities with `git ls-tree` against the
same pinned commit. The tree SHA is derived from that commit, not a later live
`HEAD`.

All cartography Git reads use `--no-replace-objects`, ignore ambient repository
and alternate-object selection, ignore inline Git config injection, and execute
only the reviewed absolute Git executable described above.

Therefore:

- staged additions/replacements do not appear under unchanged `HEAD`;
- unstaged registry edits do not alter the reported registry digest/content;
- a concurrent checkout movement after the pin cannot change the snapshot;
- replacement refs cannot substitute commit/tree/blob evidence;
- ambient `GIT_DIR`, worktree/index/object/namespace/config variables cannot
  redirect repository A to repository B;
- ambient `PATH` cannot substitute a different top-level Git executable; and
- explicit in-memory registry overrides are marked
  `source_snapshot_bound=false`.

The tooling is read-only.

## Selector contract

V1 supports two simple selector shapes:

- `exact` — one exact repository path;
- `prefix` — every tracked path beginning with a stable prefix.

Required selectors must resolve at least one tracked file. Missing required
selectors fail closed. Content identity comes from the pinned commit tree rather
than the mutable index or filesystem timestamps.

## Coordination precedence

The `operations.coordination` domain is special because checked-in coordination
artifacts cannot represent live GitHub state by themselves.

`AGENTS.md` is the required canonical starting point. It defines how a worker
discovers the **current live GitHub coordination issue** (currently #1301 while
it remains designated current) and follows an explicit successor when that issue
is closed, superseded, or replaced. Only after resolving the live control plane
should a worker use checked-in `ops/coordination/` material as history,
roster/dispatch implementation context, or supporting evidence.

Accordingly, `ops/coordination/` is **not** the live coordination source of
truth. The directory cannot grant ownership, priority, collision clearance,
lifecycle authority, deployment authority, or runtime acceptance.

## Authority labels

`authority_surfaces` are navigation warnings only. They identify subsystems that
intersect runtime, networking, economic state, Work Credits, validators,
wallet/signing, transactions, treasury, deployment, governance, or CI. They do
not grant permission or prove activation.

## Fail-closed rules

The tooling rejects:

- missing or invalid reviewed Git executable identity;
- executable identity movement during a read/snapshot;
- malformed registries;
- duplicate/malformed domain IDs;
- unsupported selectors;
- missing required selectors;
- unknown related-domain references;
- unknown `src/index.ts` landmarks;
- unavailable/malformed pinned commit/tree identity;
- unreadable required registry bytes in the pinned commit;
- malformed Git tree entries;
- unknown viewer domains;
- viewer limits outside 1–100; and
- arbitrary registry/repository path overrides.

The focused proof also covers dirty staged/unstaged state, checkout movement
after the source pin, Git replacement objects, ambient repository/object/config
selection, and fake top-level `git` substitution through hostile `PATH`.

## Maintenance contract

This is a living directory. The dedicated cartography workflow runs for every
pull request and every push to `main`, with stale runs canceled and a bounded job
timeout. Required selectors are fail-closed, so a mapped architectural entrypoint
cannot be deleted or renamed without the directory proof noticing.

Ordinary growth beneath an existing stable prefix does not require map churn. A
change that creates, relocates, or retires a durable subsystem entrypoint must
update the relevant domain selector in the same development lane. New domains
remain reserved for durable architectural boundaries; the directory is not a
file-by-file inventory.

## Growth rule

Do not make this an encyclopedia. Add a domain only when it saves meaningful
rediscovery work or represents a durable architectural boundary. Ordinary file
growth belongs inside existing selectors.

The normal operating pattern is:

1. read `AGENTS.md` and resolve the current live coordination control plane;
2. bind the reviewed Git executable identity;
3. consult the repository directory;
4. inspect one bounded domain section;
5. follow the relevant proof/workflow/doc family or `src/index.ts` landmark; and
6. use broad repository search only when the directory does not answer the
   question.
