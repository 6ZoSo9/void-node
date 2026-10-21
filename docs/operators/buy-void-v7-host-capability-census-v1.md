# Buy VOID V7 host capability census V1

Marker: \`VOID_BUY_VOID_V7_HOST_CAPABILITY_CENSUS_V1\`.

Status: **source/read-only host census only**. This stacked Draft depends on the exact
trusted-launcher source generation at
\`cb07d6fb752593cc10399eb1f7cd15c4524b8189\`. It does not merge #3647, install
the launcher, enable fs-verity, create a Python runtime, or mutate Precision.

## Purpose

The trusted launcher requires two host facts that source CI cannot prove:

1. the filesystem that will contain the protected \`/opt\` files must actually
   support fs-verity with the required superblock/kernel configuration; and
2. one exact static x86-64 Python executable plus one exact stdlib zip must exist
   before a protected host-install plan can be derived.

This census observes those facts without changing them.

## Exact source bindings

Stack parent / launcher head:

\`cb07d6fb752593cc10399eb1f7cd15c4524b8189\`

Reviewed launcher source Git blob:

\`6ecd7fef155967d35d4500b07da841c4e578c6de\`

Reviewed static launcher ELF SHA-256 from the focused #3647 proof:

\`7ec634fd290c0dd50fd367cf79d4edccdd3d38931ee117c0baa5af24f4c70e57\`

Census source Git blob:

\`bf908749a5a038863f190d31a8cf9da24f584e58\`

Focused proof Git blob:

\`7344cf4373e7411a2becf71805fd6fb075231468\`

## fs-verity capability observation

The default target parent is \`/opt\`.

The default read-only probe is:

\`/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb/package.json\`

The census requires the probe file and \`/opt\` to have the same \`st_dev\`, then
opens the probe read-only/no-follow and calls only
\`FS_IOC_MEASURE_VERITY\`.

The Linux fs-verity UAPI defines the relevant outcomes:

- \`ENODATA\`: this filesystem supports the measurement interface and the probe
  file simply is not a verity file. The census records
  \`supported_not_enabled_on_probe\` and treats filesystem capability as present.
- success: the probe is already a verity file; the returned algorithm/digest are
  reported.
- \`ENOTTY\`: the filesystem type does not implement fs-verity.
- \`EOPNOTSUPP\`: kernel fs-verity support or the filesystem/superblock verity
  feature is unavailable.
- any other error: HOLD as an unexpected measurement result.

Reference:
https://www.kernel.org/doc/html/latest/filesystems/fsverity.html

The census never calls \`FS_IOC_ENABLE_VERITY\`.

## Static Python candidate observation

When \`--python-candidate <absolute-or-relative-path>\` is supplied, the census:

- opens only the exact file with \`O_RDONLY|O_NOFOLLOW|O_NONBLOCK\`;
- hashes the retained descriptor with SHA-256;
- requires stable descriptor/path metadata across the read;
- parses ELF64 headers directly;
- requires little-endian x86-64 \`ET_EXEC\`;
- requires at least one \`PT_LOAD\`;
- rejects \`PT_INTERP\`;
- rejects \`PT_DYNAMIC\`;
- does **not execute the candidate**.

The resulting hash/size are observations only. They are not yet a host policy or
accepted runtime generation.

## stdlib zip candidate observation

When `--stdlib-candidate <path>` is supplied, the census:

- opens and hashes the exact retained file;
- uses bounded descriptor-based EOCD and central-directory preflight
  **before** allowing Python `zipfile` to materialize any `ZipInfo` objects;
  requires exact classic single-disk central-directory structure/count,
  rejects ZIP64/multidisk and noncanonical directory framing, and caps central
  directory bytes at 16 MiB (no candidate payload is decompressed);
- parses the ZIP central directory without extracting files;
- checks `ZipInfo.orig_filename` before trusting Python's sanitized
  `ZipInfo.filename`, and rejects any truncation/sanitization mismatch;
- rejects duplicate canonical names, symlinks, path traversal and
  `lib-dynload`;
- requires the raw ZIP member path to equal its canonical POSIX spelling
  (so `./argparse.py`, repeated separators and dot components cannot masquerade
  as an importable Python module);
- counts required `*.py` paths only when backed by regular file entries,
  never a directory placeholder such as `argparse.py/`; explicit nonregular
  file types are rejected, including a trailing-slash directory entry whose
  encoded mode instead claims a FIFO, device, socket, or regular file;
- normalizes malformed UTF-8 ZIP central-directory member names into
  `stdlib_zip_invalid` (CensusError), preserving the machine-readable HOLD
  path without traceback when a UTF-8-flagged ZIP filename is undecodable;
  a synthetic memfd regression proves this error conversion; unsupported
  ZIP extraction versions are also normalized to `stdlib_zip_invalid`
  instead of uncaught `NotImplementedError`;
- inventories the visible direct pure-Python modules needed by the V4 installer:
  `argparse`, `ctypes`, `hashlib`, `json`, `pathlib`, `shutil`,
  `stat`, `subprocess`, `tempfile`, and `typing`;
- does not import or execute the candidate.

That direct-module inventory is **shape evidence only**. It does not establish
the transitive pure-Python import closure (for example `gettext`, `re`, or
`warnings`) and cannot establish built-in/native modules such as `_ctypes`
or `_posixsubprocess`. The census therefore never treats ZIP inventory as
runtime importability.

## Result contract

The census is intentionally **not an acceptance gate** and does not emit GREEN.

Without candidate paths, the expected useful first result is HOLD with filesystem
facts still reported:

`python_candidate_required`

`stdlib_candidate_required`

If all three observable capability/shape checks succeed:

- target fs-verity capability is present;
- static Python candidate passes the exact ELF/hash observation;
- stdlib ZIP candidate passes the exact ZIP/hash/direct-module observation;

the census still emits:

`status=HOLD`

with the sole remaining reason:

`static_python_runtime_generation_proof_required`

and advances only to:

`DERIVE_V7_STATIC_PYTHON_RUNTIME_GENERATION_PROOF`

That later source/proof lane must establish the complete Python runtime
generation, including the transitive pure-Python import closure and required
built-in/native modules, before a reviewed host-install plan can exist.

Any missing/invalid capability or candidate remains HOLD and advances only to:

`SATISFY_V7_HOST_CAPABILITY_HOLDS`

No census outcome is install authority.

## Precision invocation

After this stacked source generation is available on Precision:

\`\`\`bash
python3 -I -B \
  ops/precision/void_buy_void_v7_host_capability_census_v1.py
\`\`\`

That read-only invocation can establish the filesystem capability before a
Python candidate exists.

Once reviewed candidates exist:

\`\`\`bash
python3 -I -B \
  ops/precision/void_buy_void_v7_host_capability_census_v1.py \
  --python-candidate /absolute/path/to/python3.12-static \
  --stdlib-candidate /absolute/path/to/python312.zip
\`\`\`

A different read-only regular file on the same target filesystem may be supplied
with \`--fsverity-probe\`.

## Authority boundary

The operational census and focused proof keep all of these false:

\`\`\`text
filesystem_write=false
protected_filesystem_mutation=false
fsverity_enablement=false
candidate_execution=false
service_mutation=false
credential_access=false
signing=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
\`\`\`

No \`/opt\` installation, source snapshot publication, static Python build,
fs-verity enablement, V4 plan/apply, service action, credential access, payment
activation, treasury action, or funds movement is authorized by this lane.

PROTECT THE CORE.
