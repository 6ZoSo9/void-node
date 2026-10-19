# Apollyon protected first-entry expected-source binding V1

Marker: \`VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_V1\`.

Status: **source/test/CI only**.

## Purpose

Accepted #3459 closes in-place executable replacement only after the caller has
already supplied an expected executable FD and raw cmdline. It deliberately
keeps \`protected_expected_source_origin_proven=false\`.

This child removes those caller-supplied expected-source inputs.

The new native layer:

1. requires its actual \`/proc/self/exe\` path to equal one fixed compile-time
   first-entry path;
2. requires protected fixed-path ancestry and a single-link executable leaf
   with the configured owner/group and no group/world write or set-id bits;
3. opens that exact leaf with \`O_NOFOLLOW\` and retains its generation;
4. reads the actual raw \`/proc/self/cmdline\` bytes itself;
5. derives PPid, effective UID/GID and supplementary groups from the current
   kernel state;
6. passes only those internally derived values to the accepted #3459
   self-observed/no-clone/no-exec chain;
7. revalidates the retained executable FD, visible fixed leaf and
   \`/proc/self/exe\` after the irreversible locks are installed.

No caller-facing API exists for an expected executable FD or expected cmdline.

## Production defaults

The source defaults to:

\`\`\`text
/opt/void-apollyon-claim-protected-first-entry-v1/bin/apollyon_claim_protected_first_entry_v1
owner uid=0
owner gid=0
\`\`\`

A future installed generation must separately prove exact binary identity and
custody at that path.

Hosted tests override the fixed path and owner/group at **compile time only** to
a disposable user-owned fixture. Those fixture overrides are not production
authority.

## First-instruction boundary remains deliberately false

Fixed-path custody is necessary but not sufficient to prove the first machine
instruction was protected. A dynamically linked binary can execute loader code
before this C function runs.

Therefore this source generation reports:

\`\`\`text
fixed_path_expected_source_bound=true
static_first_instruction_proven=false
protected_expected_source_origin_proven=false
\`\`\`

The next required source lifecycle is:

\`apollyon_claim_protected_first_entry_static_candidate_v1\`

followed by an acceptance lock / protected install / read-only installed
qualification. Only an accepted static candidate with no \`PT_INTERP\` /
dynamic \`NEEDED\` entries may advance full protected first-instruction source
origin.

## Hosted adversarial proof

The focused proof compiles three byte-identical **static** disposable binaries
from the reviewed source chain and requires no \`PT_INTERP\` or dynamic
\`NEEDED\` entries.

It then requires:

- exact fixed-path self-test success;
- copied binary at a different path is rejected;
- a group-writable fixed executable is rejected;
- non-\`--self-test\` harness invocation is rejected;
- accepted #3459 no-clone/no-exec restrictions remain effective;
- all source-only/live-authority fields stay false.

The static fixture proves candidate feasibility. It does **not** accept a
production artifact.

## Exact parent and scope

Parent: #3459 exact head
\`2df0817b5fc3456c68f32063fb28dda5bdc8ec44\`.

Exactly six ADD-only files:

- \`ops/xiphos/apollyon_claim_protected_first_entry_v1.c\`
- \`ops/xiphos/apollyon_claim_protected_first_entry_v1.h\`
- \`scripts/apollyon_claim_protected_first_entry_v1_selftest.c\`
- \`scripts/prove_apollyon_claim_protected_first_entry_v1.py\`
- \`docs/security/apollyon-claim-protected-first-entry-v1.md\`
- \`.github/workflows/apollyon-claim-protected-first-entry-v1.yml\`

No #3459 or ancestor source blob is modified.

## Authority

This gate does not install or execute anything on Xiphos. It does not prove a
trusted parent process, account/service/socket topology, protected claim-store
origin, durable claim publication, trainer release/training, key/signing/wallet,
transaction or funds authority.

Any failure after the inherited irreversible seccomp restrictions may have
begun requires discarding that process rather than retrying it as authority.

**PROTECT THE CORE.**
