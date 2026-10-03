# WC/VOID launch-controller control offline signing v1

Marker: `VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_V1`

Status: reviewed offline operator helper for the fresh launch-controller
proof-of-control ceremony.

This helper is deliberately narrower than a wallet or transaction signer. It
may sign only the public EIP-712 control challenge defined by
`VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1`.

## Fixed reviewer identity

The helper is hard-bound to:

```text
0x2f1e0005e865b772b268bd8c797bf3eaa901d97e
```

The private key path is also fixed:

```text
~/.local/share/void/offline-keys/wc-void-launch-controller-v1/private-key.hex
```

There is no `--key-file` override.

A challenge naming any other candidate address fails before signing. A private
key deriving any other address also fails before signing.

## Reviewed package runtime

The signing helper does not trust ambient `ethers` package bytes.

Before the private key is opened, it:

1. reads the reviewed package-runtime profile
   `ops/security/reviewed-node-package-runtime-ethers-v1.json`;
2. rederives and verifies profile ID
   `voidrnpr1_bb76a6a16b4fb779edffb4f541f7a91d0ddb00bfe404031b4387840e74001e77`;
3. requires package aggregate
   `5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73`;
4. verifies the installed package closure byte-for-byte;
5. materializes a private reviewed package tree outside the repository;
6. reverifies that private tree;
7. materializes the exact challenge-bound control-verifier Git blob beside that
   private package tree; and
8. executes all production `ethers` operations only in a separate Node child
   launched with the permission model and
   `--allow-fs-read=<private-runtime-root>`.

For Node 22.0 through 22.12 the signer uses the documented
`--experimental-permission` spelling. Node 22.13+ and the supported Node
24/26 lines use `--permission`. This preserves the repository's declared
`^22.0.0 || ^24.0.0 || ^26.0.0` runtime range rather than silently requiring
a newer Node 22 patch release.

The permission-fenced child reuses the exact interpreter already running the
reviewed signer. Production still requires that parent interpreter to resolve to
`/usr/bin/node` before private-key access. This makes the child and selected
permission flag describe the same Node binary, while allowing focused CI to
exercise the actual 22.12, 22.13, current 22, 24 and 26 setup-node runtimes
instead of an unrelated runner-system `/usr/bin/node`.

The key-owning parent process never imports `ethers`. The child receives only
the already-validated public challenge plus the fixed private key over stdin.
The key is never placed in argv, environment variables, or a temporary key
file.

Normal Node package resolution can walk ancestor directories. The permission
fence prevents an optional/unreviewed package in an ancestor
`node_modules` from being read or executed. Focused proof places an
unreviewed `bufferutil` package in exactly that ancestor position and requires
the child to fail closed before it executes.

Same-version ambient package-byte drift therefore holds before private-key
access, and ancestor-package fallback is denied during the actual
authority-bearing cryptographic execution.

Node 22's permission model does not provide the required network-isolation
claim for this lane. Nimo must therefore remain offline for the signing
ceremony; the source contract explicitly reports
`execution_network_isolation_provided=false`.

## Challenge validation

The Nimo helper requires:

- an absolute, mode-`0600`, nofollow public challenge file;
- its exact SHA-256 from Precision;
- marker/version and exact challenge keys;
- execution epoch 2;
- the fixed launch-controller role ID;
- the fixed selected reviewer address;
- current coupled launch bytes32;
- current compiled vault identity;
- canonical Epoch-2 VOID token;
- exact EIP-712 domain and type schema;
- exact typed-value/challenge field binding;
- typed-data digest equality;
- content-addressed challenge-ID equality;
- exact non-authorizing challenge authority;
- challenge TTL from 60 through 1800 seconds; and
- current Nimo clock inside the challenge window.

The helper signs only after all checks pass. Production signing samples the
clock only after reviewed-package verification/materialization completes,
rechecks expiry immediately before opening the private key, rechecks again
immediately before the signature operation, and refuses to emit the signature
envelope if the challenge expires during signing.

## Key-file boundary

The fixed key file must be:

- a direct regular file;
- no symlink at the file or through any parent-directory alias;
- begin trust from a retained nofollow directory-descriptor chain opened from
  filesystem root, not from an unpinned `realpath` observation;
- capture the final file identity through that pinned parent before opening it;
- require the opened file descriptor to match that pre-open device/inode;
- only after parent/file descriptors are pinned, require the original absolute
  pathname to canonicalize to itself and resolve to that same opened inode;
- read only through the pinned file descriptor; and
- require both the pinned pathname and the original absolute pathname to still
  reference that same opened identity after the read;
- be owned by the current user;
- be exactly mode `0600`;
- contain one 32-byte hexadecimal private key, with optional `0x` prefix;
- contain at most one trailing newline; and
- contain no leading/trailing spaces, tabs, blank lines, or other normalization.

The transferred public challenge file is subject to the same descriptor-first,
pre-open identity and post-read rebind rules. There is no trusted
canonical-path checkpoint before descriptor acquisition. Atomic replacement of
an ancestor before, during, or after traversal either changes the path↔inode
binding and fails closed or cannot redirect the already pinned final lookup.

The raw key is never printed, returned, copied into the repository, placed in
process arguments, or written into the public signature envelope.

After the parent completes source/runtime/expiry checks, it opens the fixed key,
passes the exact key text only through the permission-fenced child's stdin, and
clears its direct string reference when the child returns. The child validates
the key-derived address, signs only the canonical control EIP-712 value, verifies
signature recovery, and returns only the public signature envelope. The key is
never written into the private reviewed runtime tree.

The actual key remains process memory only for the lifetime of the short-lived
offline signing parent/child processes.

## Output

The output is create-only mode `0600` outside the repository:

```json
{
  "marker": "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1",
  "version": 1,
  "challenge_id": "voidwclcc1_...",
  "signature": "0x..."
}
```

The signature is public cryptographic evidence. The helper prints only IDs and
hashes, not the raw signature or private key.

## Ceremony

### Precision — prepare the public challenge

Use the canonical control-requalification tool from an exact clean main
generation:

```bash
node tools/void-wc-void-launch-controller-control-requalification-v1.mjs \
  prepare \
  --candidate-address 0x2f1e0005e865b772b268bd8c797bf3eaa901d97e \
  --ttl-seconds 1800 \
  --output /absolute/private-work/challenge.json
```

Record the printed `challenge_sha256`, challenge ID, typed-data digest and
expiry.

Separately record the exact operator-reviewed canonical main commit that contains
the reviewed launcher and signer. This reviewed commit is an independent trust
input; it must not be recovered from the challenge itself.

Transfer to Nimo:
- the public challenge JSON;
- its SHA-256; and
- the separately reviewed 40-hex canonical commit.

### Nimo — offline sign

Disconnect Nimo from network access before opening the key.

Before signing, Nimo must be on the **exact independently reviewed commit**.
A clean descendant is not accepted. The reviewed launcher requires the reviewed
commit as a separate positional argument and verifies:

- exact challenge SHA-256;
- the supplied reviewed commit is a canonical 40-hex Git SHA;
- current checkout HEAD equals that independently supplied reviewed commit;
- challenge `source_binding.source_head_sha` independently equals that same
  reviewed commit;
- clean tracked/untracked repository state;
- worktree Git blob equality for the launcher, signer, reviewed package-runtime
  helper/profile, control verifier, `package.json`, and `package-lock.json`;
- no private-key access during preflight.

For sign mode, the verified worktree paths are not reopened as execution
authority. After those checks, the launcher:

1. creates a private temporary reviewed-runtime tree;
2. immediately opens and retains that tree as directory descriptor 19;
3. materializes the exact signer and reviewed-runtime-helper Git blobs from the
   independently reviewed commit through `/proc/self/fd/19/...`;
4. re-hashes those materialized bytes against the reviewed Git blob IDs;
5. freezes the private tree; and
6. invokes Node on
   `/proc/self/fd/19/ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs`.

The retained directory descriptor is acquired before materialization, so a
rename/replacement of the temporary pathname cannot redirect either the bytes
being materialized or the signer path later opened by Node. The signer’s
relative import of the reviewed runtime helper resolves inside that same pinned
tree. Cleanup is also descriptor-bound and removes the original private tree,
not a path replacement.

Do not execute the mutable worktree launcher as the bootstrap authority.
The operator bootstrap reads the launcher directly from the independently
reviewed Git commit, verifies the complete Git-blob hash **in memory**, and
passes those already-verified bytes directly to Bash stdin. No staged launcher
pathname or mutable launcher inode exists between verification and execution:

```bash
/usr/bin/env -i \
  HOME=/home/zoso \
  PATH=/usr/bin:/bin \
  LANG=C \
  LC_ALL=C \
  /usr/bin/python3 - \
  /home/zoso/dev/void-node \
  <operator-reviewed-commit-40hex> \
  /absolute/private-work/challenge.json \
  <challenge-sha256-64hex> \
  /absolute/private-work/signature.json <<'PY'
import hashlib
import os
import re
import subprocess
import sys

repo, reviewed_head, challenge, challenge_sha, output = sys.argv[1:]
launcher_rel = (
    "ops/nimo/"
    "void-nimo-wc-void-launch-controller-control-signing-launch-v1.sh"
)

if re.fullmatch(r"[0-9a-f]{40}", reviewed_head) is None:
    raise SystemExit("HOLD: operator_reviewed_head_invalid")

git_env = {
    "HOME": "/nonexistent",
    "PATH": "/usr/bin:/bin",
    "LANG": "C",
    "LC_ALL": "C",
    "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_OPTIONAL_LOCKS": "0",
    "GIT_TERMINAL_PROMPT": "0",
}
git_base = [
    "/usr/bin/git",
    "--no-replace-objects",
    "-c", "core.hooksPath=/dev/null",
    "-c", "core.attributesFile=/dev/null",
    "-c", "core.fsmonitor=false",
    "-c", "core.untrackedCache=false",
    "-c", "core.preloadIndex=false",
    "-c", "submodule.recurse=false",
    "-C", repo,
]

expected_blob = subprocess.run(
    git_base + ["rev-parse", f"{reviewed_head}:{launcher_rel}"],
    cwd="/",
    env=git_env,
    check=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
).stdout.strip()

if re.fullmatch(r"[0-9a-f]{40}", expected_blob) is None:
    raise SystemExit("HOLD: reviewed_launcher_blob_invalid")

launcher_bytes = subprocess.run(
    git_base + ["cat-file", "blob", expected_blob],
    cwd="/",
    env=git_env,
    check=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
).stdout

actual_blob = hashlib.sha1(
    b"blob " + str(len(launcher_bytes)).encode("ascii") + b"\0" + launcher_bytes
).hexdigest()
if actual_blob != expected_blob:
    raise SystemExit("HOLD: reviewed_launcher_blob_mismatch")

launch_env = {
    "HOME": "/home/zoso",
    "PATH": "/usr/bin:/bin",
    "LANG": "C",
    "LC_ALL": "C",
    "VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1": repo,
    "VOID_NIMO_OFFLINE_SIGNER_EXECUTED_LAUNCHER_BLOB_V1": expected_blob,
}

result = subprocess.run(
    [
        "/bin/bash",
        "--noprofile",
        "--norc",
        "-s",
        "--",
        "sign",
        challenge,
        challenge_sha,
        reviewed_head,
        output,
    ],
    cwd=repo,
    env=launch_env,
    input=launcher_bytes,
)
raise SystemExit(result.returncode)
PY
```

The bootstrap verifies the full launcher bytes before Bash receives any of them.
The verified immutable Python `bytes` value is then the Bash stdin payload.
Changing, replacing, deleting, or rewriting any launcher pathname after the Git
read cannot affect the bytes Bash executes.

The launcher receives only the already-verified launcher Git-blob ID as
`VOID_NIMO_OFFLINE_SIGNER_EXECUTED_LAUNCHER_BLOB_V1` and requires it to equal
the launcher blob at the independently supplied reviewed commit before
signer/key access. A challenge cannot choose this trust anchor.

Before sign-mode `exec`, the launcher explicitly announces the requested
operation boundary:

```text
private_key_access=true
credential_access=true
wallet_or_signer_access=true
transaction_signing=false
transaction_broadcast=false
funds_movement=false
```

Preflight mode reports those access facts as false and exits without opening the
key.

Sign mode does **not** reopen the mutable worktree signer after verification.
Instead the launcher creates a fresh private runtime directory, materializes the
exact signer and reviewed-package-runtime helper Git blobs directly from the
independently reviewed commit, re-hashes both materialized files, removes write
permission from the materialized tree, and launches that reviewed signer copy
through a second `/usr/bin/env -i` boundary. The original verified repository
root is passed separately as
`VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1` for Git/profile/source-state reads; it
is not used as the signer executable path.

The materialized signer itself rechecks that the current/source-binding heads
both equal the environment-carried reviewed commit before private-key access.
This closes the verify-then-reopen worktree race: a later replacement of the
worktree signer or runtime helper cannot change the bytes that receive
production-key access.

The scrubbed launch also excludes `NODE_OPTIONS`, `NODE_PATH`,
dynamic-loader variables, shell-specific injection variables, and unrelated
ambient configuration before Node starts and before the private key can be
opened.

The signer then performs production cryptography in a second
permission-fenced reviewed child. The parent sends the fixed key only over
stdin; no key appears in the child argv/environment or reviewed-runtime files.
Because Node 22 does not supply the required network sandbox, keep Nimo
disconnected for the entire sign command.

Return only `signature.json` and its printed output SHA-256 to Precision.

Do not advance Nimo to a later main commit between challenge review and signing.
Nimo intentionally signs from the exact independently reviewed challenge commit.
Precision verification may run later from an unrelated descendant only when the
canonical control verifier confirms the challenge commit is an ancestor and all
bound launch/control/package blobs remain byte-identical. Any relevant blob
change invalidates the outstanding challenge and requires a fresh ceremony.

### Precision — verify

Before expiry:

```bash
node tools/void-wc-void-launch-controller-control-requalification-v1.mjs \
  verify \
  --challenge /absolute/private-work/challenge.json \
  --challenge-sha256 <64hex> \
  --signature /absolute/private-work/signature.json \
  --signature-sha256 <64hex> \
  --output /absolute/private-work/control-evidence.json
```

A green result proves current control only.

## Authority

This ceremony **does** access the fixed production private key and constructs an
in-memory signer object. Those facts are reported explicitly as
`private_key_access=true`, `credential_access=true`, and
`wallet_or_signer_access=true`.

Signing this challenge does **not** authorize:

- transaction construction or transaction signing;
- transaction submission/broadcast;
- Chain-2050 writes;
- WC ledger writes;
- any credential/key access beyond the fixed reviewer-key access explicitly
  described above;
- runtime/service mutation;
- deployment;
- inventory funding;
- WC/VOID market activation;
- public presale activation;
- liquidity/treasury movement; or
- funds movement.

The separately merged reviewer-role decision is the only reason this exact
address may later authenticate a related-identity review manifest. The fresh
control evidence must still be reverified at the current evaluation time. No
fallback reviewer identity is authorized.

## Verification

Focused CI uses synthetic test keys only:

```bash
node scripts/prove_void_nimo_wc_void_launch_controller_control_signing_v1.mjs
```

CI never reads the production key path and never performs a production
signature.
