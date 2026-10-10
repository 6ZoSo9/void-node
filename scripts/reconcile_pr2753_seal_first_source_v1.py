#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import subprocess

EXPECTED_BRANCH_HEAD = "5c8ce0f1a2dc7f45e522bcbd513ae3f4872117bc"
OLD_BRANCH_INDEX_BLOB = "240414e313f44f80d57f4e349be2f1ab3d72fe66"
OLD_MAIN_INDEX_BLOB = "0e3361ef8d4e6f3d7a9e428d14db64281afc21fe"
BOOTSTRAP_ONLY_INDEX_BLOB = "510c5194a8cacf1c3e0ff22824aded0c28651dc1"
HARD_SIZE_CEILING = 3_852_487


def git_blob(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one occurrence, found {count}")
    return text.replace(old, new)


predecessor_bytes = subprocess.check_output(
    ["git", "show", f"{EXPECTED_BRANCH_HEAD}:src/index.ts"]
)
if git_blob(predecessor_bytes) != OLD_BRANCH_INDEX_BLOB:
    raise SystemExit("predecessor src/index.ts Git blob mismatch")
predecessor = predecessor_bytes.decode("utf-8")
current_path = Path("src/index.ts")
current_bytes = current_path.read_bytes()
current = current_bytes.decode("utf-8")

old_helper = (
    "/* Optional legacy helper (safe to keep for scripts/tests) */\n"
    "const __apiSegStore =\n"
    "new SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 } as any);"
)
new_helper = (
    "/* Bind legacy helper after Node's inherited-seal admission. */\n"
    "let __apiSegStore: SegStore | null = null;"
)
expected = replace_once(predecessor, old_helper, new_helper, "eager SegStore")

schedule = '  if (process.env.VOID_SKIP_AUTOREPAIR === "1") {'
schedule_pos = expected.find(schedule)
boot_marker = "  /* ---------- boot node ---------- */"
schedule_end = expected.find(boot_marker, schedule_pos)
if schedule_pos < 0 or schedule_end <= schedule_pos:
    raise SystemExit("could not isolate predecessor repair branch")
repair_branch = expected[schedule_pos:schedule_end]
if repair_branch.count("autoRepairDataDir(DATA_DIR") != 1:
    raise SystemExit("unexpected predecessor repair branch identity")
expected = expected[:schedule_pos] + expected[schedule_end:]

ctor_tail = (
    "    udpSwarmAllowNonPublicEndpoint:\n"
    "      udpSwarmRuntimeConfig.allow_nonpublic_endpoints,\n"
    "  });"
)
ctor_pos = expected.find("  const node = new Node(P2P_PORT, kp, {")
ctor_end = expected.find(ctor_tail, ctor_pos)
if ctor_pos < 0 or ctor_end < ctor_pos:
    raise SystemExit("could not isolate predecessor Node constructor")
ctor_end += len(ctor_tail)
expected = (
    expected[:ctor_end]
    + "\n  __apiSegStore = node.store;\n"
    + repair_branch
    + expected[ctor_end:]
)

if current != expected:
    raise SystemExit(
        "merged src/index.ts is not the exact presale predecessor plus the "
        "two qualified seal-first startup hunks"
    )
if len(current_bytes) > HARD_SIZE_CEILING:
    raise SystemExit("combined src/index.ts exceeds preserved hard size ceiling")
combined_blob = git_blob(current_bytes)
if combined_blob in {OLD_BRANCH_INDEX_BLOB, BOOTSTRAP_ONLY_INDEX_BLOB}:
    raise SystemExit("combined source did not receive both reviewed generations")

for raw in (
    "runtime/canonical-producer-self-http-guard-v1.cjs",
    "scripts/prove_canonical_producer_legacy_self_http_observers_v1.mjs",
):
    path = Path(raw)
    text = path.read_text(encoding="utf-8")
    path.write_text(
        replace_once(text, OLD_BRANCH_INDEX_BLOB, combined_blob, raw),
        encoding="utf-8",
    )

proof_path = Path("scripts/prove_void_public_checkpoint_seal_first_startup_v1.mjs")
proof = proof_path.read_text(encoding="utf-8")
proof = replace_once(
    proof,
    'const OLD_HEAD="ba853a4bfb237701504225ddba615f7b46eeb991";',
    f'const OLD_HEAD="{EXPECTED_BRANCH_HEAD}";',
    "seal-first OLD_HEAD",
)
proof = replace_once(
    proof,
    f'const OLD_BLOB="{OLD_MAIN_INDEX_BLOB}";',
    f'const OLD_BLOB="{OLD_BRANCH_INDEX_BLOB}";',
    "seal-first OLD_BLOB",
)
proof = replace_once(
    proof,
    f'const NEW_BLOB="{BOOTSTRAP_ONLY_INDEX_BLOB}";',
    f'const NEW_BLOB="{combined_blob}";',
    "seal-first NEW_BLOB",
)
proof_path.write_text(proof, encoding="utf-8")

doc_path = Path("docs/architecture/void-public-checkpoint-seal-first-startup-v1.md")
doc = doc_path.read_text(encoding="utf-8")
doc = replace_once(
    doc,
    """## Exact source fix on the existing public-bootstrap diagnostic Draft

This is an additive correction on the already-open
[#2748](https://github.com/6ZoSo9/void-node/pull/2748); it does not open
another public proof PR and does not overwrite the existing fast-fatal log
diagnostic. On that exact parent, `src/index.ts` was still frozen as Git
blob `0e3361ef8d4e6f3d7a9e428d14db64281afc21fe`.
""",
    f"""## Exact source fix retained through presale integration

The startup correction merged through
[#2748](https://github.com/6ZoSo9/void-node/pull/2748). The cumulative
presale integration predecessor is exact commit `{EXPECTED_BRANCH_HEAD}` with
`src/index.ts` Git blob `{OLD_BRANCH_INDEX_BLOB}`. The combined source is
required to be that complete predecessor plus only the same two seal-first
startup hunks; the economic and operator changes are not rewritten.
""",
    "architecture predecessor section",
)
doc = replace_once(
    doc,
    """The original `src/index.ts` **3,852,487-byte hard ceiling is unchanged**;
the proposed new Git blob is `510c5194a8cacf1c3e0ff22824aded0c28651dc1`,
**3,852,455 bytes**. The review proof compares the complete new bytes
against an independent reconstruction from frozen original `main`,
rejecting any extra source change.
""",
    f"""The original `src/index.ts` **3,852,487-byte hard ceiling is unchanged**;
the cumulative combined Git blob is `{combined_blob}`, **{len(current_bytes)} bytes**.
The review proof compares the complete combined bytes against an independent
reconstruction from the exact presale predecessor, rejecting any change
beyond the two reviewed startup hunks.
""",
    "architecture source identity section",
)
doc = replace_once(
    doc,
    """This source Draft is **not merged/deployed** and has not demonstrated actual
checkpoint restoration acceptance in a running node. It does not grant
wallet/key/signer, customer allocation, payment, runtime service/host, validator,
Chain-2050/WC, presale/market, liquidity or funds action. Merging and any
external dispatch require a separate reviewed owner decision; **do not**
alter the public seal, replay historical checkpoints over untrusted bytes,
or treat successful synthetic tests as external acceptance.
""",
    """The startup correction is merged in source, but this cumulative presale
integration is **not deployed** and has not demonstrated a fresh external
checkpoint restoration acceptance on its final merged generation. It does
not grant wallet/key/signer, customer allocation, payment, runtime
service/host, validator, Chain-2050/WC, presale/market, liquidity or funds
action. **Do not** alter the public seal, replay historical checkpoints over
untrusted bytes, or treat successful synthetic tests as external acceptance.
""",
    "architecture HOLD section",
)
doc_path.write_text(doc, encoding="utf-8")

print("VOID_PR2753_SEAL_FIRST_SOURCE_RECONCILE_V1_GREEN")
print(f"combined_index_blob={combined_blob}")
print(f"combined_index_bytes={len(current_bytes)}")
print("economic_source_rewritten=false")
print("seal_waiver=false")
print("funds_or_host_authority=false")
