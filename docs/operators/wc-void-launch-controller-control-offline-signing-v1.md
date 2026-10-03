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

## Pinned in-memory ethers runtime

The production signing path does not resolve `ethers` through Node package
resolution after private-key authority begins.

It is hard-bound to the self-contained ESM bundle:

```text
node_modules/ethers/dist/ethers.min.js
ethers version = 6.17.0
sha256 = b016b0c3898c78fd8156466eb1ff1f42c9df951c2f0d64c9bdf799fe745b0a6c
```

Before the private key is opened, the streamed reviewed signer:

1. acquires the bundle through the same descriptor-first, nofollow stable-file
   reader used for the public challenge and private key;
2. requires the exact SHA-256 above and a 2 MiB maximum;
3. copies the already-verified bytes into an in-memory `data:` module URL;
4. imports only those bytes;
5. requires `ethers.version === "6.17.0"` and the exact cryptographic exports
   used by this ceremony; and
6. only then opens the fixed production key.

The authority-bearing signing path does **not** execute a materialized
`node_modules` tree, generated signing bridge, ancestor package resolver, or
runtime-helper payload. Replacing the bundle pathname after its bytes have been
read cannot alter the in-memory module that receives key material.

Focused CI also mutates the installed bundle by one byte and requires the
key-free bundle self-check to fail on the exact SHA-256 before any private-key
access.

The former materialized package-tree signing bridge and its permission-fenced
child runtime have been removed from this signer entirely. Focused proof now
requires those obsolete symbols to be absent. This keeps the key path aligned to
one mechanism: exact standalone bundle bytes admitted before key access.

Node's module-loader environment is still sanitized before the streamed signer
starts: `NODE_OPTIONS`, `NODE_PATH`, dynamic-loader variables, shell
injection variables, and unrelated environment values are absent. The reviewed
stdin invocation requires exactly one Node exec-argv entry,
`--input-type=module`; empty exec-argv or any additional/different loader,
preload, import, require, inspect, policy, conditions, or arbitrary Node option
fails closed. Nimo must remain offline for the entire signing ceremony because
this lane does not claim process-level network sandboxing.

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
clock after the exact in-memory ethers bundle is admitted, rechecks expiry
immediately before opening the private key, rechecks inside the signing helper
before and after the EIP-712 signature operation, and refuses to emit the
signature envelope if the challenge expires during signing.

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

After the streamed reviewed signer completes source/bundle/expiry checks, it
opens the fixed key, constructs an in-memory Wallet only from the SHA-256-pinned
ethers bundle, validates the key-derived address, signs only the canonical
control EIP-712 value, verifies signature recovery, and clears its direct key
string reference. The key is never placed in argv, environment variables,
temporary files, a package-runtime tree, or the public output envelope.

The actual key remains process memory only for the lifetime of the short-lived
offline signing process.

## Output

The output is create-only mode `0600` outside the repository. Output custody
uses the same descriptor-first model rather than trusting a parent pathname:
the parent directory is pinned through a nofollow descriptor chain, its
canonical pathname must bind back to that retained directory inode, and the
output is created only through `/proc/self/fd/<parent-fd>/<basename>` with
`O_CREAT|O_EXCL|O_NOFOLLOW`. The exact file and retained parent directory are
fsynced, and the original parent/output pathnames must still rebind to the pinned
parent and created file after the write. If a parent replacement is detected
after creation, the redirected evidence is removed through the retained parent
descriptor before the operation fails closed.

The output is:

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
- worktree Git blob equality for the launcher, signer, control verifier,
  `package.json`, and `package-lock.json`;
- no private-key access during preflight.

For sign mode, the verified worktree signer path is not reopened as execution
authority. After those checks, the launcher:

1. resolves the signer Git blob ID from the independently reviewed commit;
2. reads that blob with `git cat-file blob` directly into base64 process
   memory;
3. decodes and re-hashes the exact transported bytes with
   `git hash-object --stdin`, requiring the reviewed blob ID again; and
4. pipes the verified signer bytes directly to
   `/usr/bin/node --input-type=module -`.

The streamed signer then verifies and imports the exact standalone ethers bundle
from already-verified in-memory bytes before private-key access. No runtime
helper is carried in environment state and no authority-bearing temporary
package tree is executed.

There is therefore no outer signer executable file, runtime-helper executable,
generated signing bridge, mutable package child, or worktree signer reopen
between signer-byte verification and production-key access.

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
The exact reviewed signer Git blob is streamed into Node on stdin, while the
exact reviewed runtime-helper Git blob is transported in memory and reverified
inside the signer before import. The original verified repository root is passed
separately as `VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1` for
Git/profile/source-state reads; it is never used as an executable signer or
runtime-helper path.

The streamed signer itself rechecks that the current/source-binding heads both
equal the environment-carried reviewed commit before private-key access. This
closes both the worktree verify/reopen race and the later same-UID temporary-file
replacement race: no filesystem code entry is reopened after the reviewed Git
blob bytes have been captured and verified.

The scrubbed launch also excludes `NODE_OPTIONS`, `NODE_PATH`,
dynamic-loader variables, shell-specific injection variables, and unrelated
ambient configuration before Node starts and before the private key can be
opened.

The streamed signer performs production cryptography in the same sanitized
short-lived Node process using only the exact in-memory bundle described above.
Because this lane does not provide a network sandbox, keep Nimo disconnected for
the entire sign command.

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
