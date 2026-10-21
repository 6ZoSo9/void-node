# Buy VOID V7 host capability census V1

Marker: \`VOID_BUY_VOID_V7_HOST_CAPABILITY_CENSUS_V1\`.

Status: **source/read-only host census only**. This stacked Draft depends on the exact
trusted-launcher source generation at
\`08356a62bdea145b716c9f4fe1ddbda8fe6800e4\`. It does not merge #3647, install
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

\`08356a62bdea145b716c9f4fe1ddbda8fe6800e4\`

Reviewed launcher source Git blob:

\`3b6402a1df523842720a24b719c2b3e86c18ed42\`

Reviewed static launcher ELF SHA-256 from the focused #3647 proof:

\`5e9a5d70b54632b3247184cd9d20df15e43f69ec3ebbd82d4444487d1cbb4a00\`

Census source Git blob:

\`074c1906092b9564c81690df982b011af61c9e2f\`

Focused proof Git blob:

\`8616200bce8c20459f1ce31621e575d7dfa56d09\`

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

When \`--stdlib-candidate <path>\` is supplied, the census:

- opens and hashes the exact retained file;
- parses the ZIP central directory without extracting files;
- rejects duplicate canonical names, symlinks, path traversal and
  \`lib-dynload\`;
- requires the visible pure-Python modules needed by the V4 installer:
  \`argparse\`, \`ctypes\`, \`hashlib\`, \`json\`, \`pathlib\`, \`shutil\`,
  \`stat\`, \`subprocess\`, \`tempfile\`, and \`typing\`;
- does not import or execute the candidate.

A later candidate-generation proof must still establish that the static Python
binary contains any required native modules/builtins such as \`_ctypes\` or
\`_posixsubprocess\`. This census intentionally does not infer that from ZIP
contents.

## Result contract

Without candidate paths, the expected useful first result is normally HOLD with
filesystem facts still reported:

\`python_candidate_required\`

\`stdlib_candidate_required\`

A fully GREEN census requires all of:

- target fs-verity capability is present;
- static Python candidate passes the exact ELF/hash observation;
- stdlib zip candidate passes the exact ZIP/hash observation.

GREEN advances only to:

\`DERIVE_REVIEWED_V7_HOST_INSTALL_PLAN\`

HOLD advances only to:

\`SATISFY_V7_HOST_CAPABILITY_HOLDS\`

Neither outcome is install authority.

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
