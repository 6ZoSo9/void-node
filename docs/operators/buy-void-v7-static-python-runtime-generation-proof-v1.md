# Buy VOID V7 static Python runtime generation proof V1

Marker: \`VOID_BUY_VOID_V7_STATIC_PYTHON_RUNTIME_GENERATION_PROOF_V1\`.

Status: **source/test only; executable-candidate proof is non-root and non-authoritative for host installation**.

## Purpose

This lane closes exactly one readiness question left open by the V7 host-capability census:

> Can one exact static Python candidate plus one exact stdlib ZIP execute the landed V5 installer under the launcher-equivalent closed Python environment without falling back to host Python DSOs or \`lib-dynload\`?

It does **not** solve the persistent-content-seal problem for Precision. The current launcher V2 still requires a separately accepted persistent seal. Operator-supplied Precision evidence on the filesystem backing \`/opt\` returned \`FS_IOC_MEASURE_VERITY -> ENOTSUP\`; therefore even a GREEN runtime-closure receipt leaves host installation HOLD until a separately reviewed alternative seal or fs-verity-capable target is accepted.

## Source bindings

PR source base at creation:

\`main@0d93be0a7ae1395449a386d4fbe14bb680f51c3f\`

Landed V5 installer:

- path: \`ops/precision/void_buy_void_v7_protected_substrate_install_v5.py\`
- Git blob: \`632f3371ad3095e6a8fdf338b24c34431abe7d2c\`
- bytes: \`89416\`
- SHA-256: \`6a2c7de4fd55b2778cd7eb6c625d3b16cea068f9fbf9beb74adf2a04f433c14b\`

Runtime-proof source:

\`ops/precision/void_buy_void_v7_static_python_runtime_generation_proof_v1.py\`

Focused source proof:

\`scripts/prove_buy_void_v7_static_python_runtime_generation_proof_v1.py\`

## Candidate inputs

The \`--run\` path requires all six explicit candidate bindings:

- \`--python <path>\`
- \`--expected-python-bytes <decimal>\`
- \`--expected-python-sha256 <64 lowercase hex>\`
- \`--stdlib-zip <path>\`
- \`--expected-stdlib-bytes <decimal>\`
- \`--expected-stdlib-sha256 <64 lowercase hex>\`

The tool refuses UID/EUID 0 and identity transitions. It opens both candidate files no-follow/nonblocking, requires exact size + SHA-256, and revalidates pathname/descriptor generation around the read.

## Static Python admission

Before execution the candidate must be:

- ELF64 little-endian;
- x86-64 \`ET_EXEC\`;
- at least one \`PT_LOAD\`;
- no \`PT_INTERP\`;
- no \`PT_DYNAMIC\`.

The exact candidate bytes are copied into a private temporary runtime layout:

\`\`\`text
<private-runtime>/
  bin/python3.12-static
  lib/python312.zip
\`\`\`

This is test scratch only and never a protected installation.

## Closed executable-runtime proof

The candidate executes only as the ordinary non-root identity under:

\`\`\`text
-I -B -S
\`\`\`

with a minimal explicit environment.

The runtime probe must prove:

- Python 3.12;
- isolated mode, safe path and no-site are active;
- \`sys.executable\` is the private runtime's exact \`bin/python3.12-static\`;
- every \`sys.path\` member is inside the private runtime;
- no \`site-packages\` or \`lib-dynload\` path is present;
- \`ctypes\` is loaded from the exact \`python312.zip\`;
- \`_ctypes\` is built in and has no filesystem DSO path;
- \`ctypes.CDLL(None).renameat2\` exists and a real invalid-FD call reaches libc and returns an errno;
- no historical V4 \`prctl\` requirement is inferred.

## V5 self-test binding

The exact landed V5 source bytes are copied to a Linux memfd, sealed with:

- \`F_SEAL_WRITE\`
- \`F_SEAL_GROW\`
- \`F_SEAL_SHRINK\`
- \`F_SEAL_SEAL\`

and passed by retained descriptor to the candidate.

The candidate must run the exact V5 \`--self-test\` under \`-I -B -S\` and emit:

\`VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V5_SELF_TEST_GREEN\`.

The memfd is only an ephemeral execution snapshot. It does not replace launcher V2's persistent host-seal requirement.

## Resource and error boundary

Candidate processes receive bounded CPU, address space, output-file size and descriptor limits. stdout/stderr are redirected to bounded temporary regular files. Timeout, exec failure, malformed JSON, unexpected module origins, missing native symbols, nonzero exits, or excessive output all become explicit HOLD.

## Result semantics

A successful candidate run emits:

\`status=RUNTIME_CLOSURE_GREEN\`

and a canonical \`receipt_json\` binding the exact Python/stdlib/V5 identities and observed closure.

Even on GREEN:

\`\`\`text
protected_host_install=false
fsverity_host_readiness_established=false
protected_v5_apply=false
service_mutation=false
credential_access=false
signing=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
\`\`\`

The only allowed next action is:

\`BIND_EXACT_RUNTIME_RECEIPT_AND_RESOLVE_PERSISTENT_CONTENT_SEAL_HOLD\`

A later acceptance lane must source-pin the exact candidate receipt. A separate reviewed persistent-seal design remains mandatory before host installation.

## CI authority

CI runs only syntax/source checks and \`--self-test\`. It does **not** execute a candidate Python runtime and cannot manufacture candidate GREEN.

PROTECT THE CORE.
