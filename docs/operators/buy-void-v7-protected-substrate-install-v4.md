# Buy VOID V7 protected substrate installer V4 — immutable release-root mode repair

Marker: `VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V4`.

Status: **source/CI-only repair; protected host apply remains separately authorized**.

## Reproduced Precision blocker

The operation-bound read-only V5R2 host evidence reached the authenticated receipt/live-process lane and found the accepted selector path absent. A follow-up plan-only V3 run reproduced both accepted candidate binaries exactly:

- native SHA-256 `8ce663ff7e3713fc6bf615dd743350be9e50dff729fdb3d609b065b158397851`, 21600 bytes;
- selector SHA-256 `048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232`, 26680 bytes.

Installer V3 then HOLDed before installed-state classification because the exact active release root
`/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`
is a canonical `root:root` directory with mode `0555`, while V3 hard-coded `0755` for that source root.

The V7 protected source, native-preentry and selector targets were all absent. No partial V7 publication occurred.

## Repair

V4 preserves V3 and binds it as the exact predecessor:

- predecessor main/merge: `0ada7fde0d90c3946b10693f4621cbd690bfcde6`;
- predecessor tree: `9e930fba9aacfafb5b163767302786cd7f31c81e`;
- predecessor V3 installer blob: `4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38`;
- materializer V2 blob: `474614da950db72082fb95a5174405ce8caf2513`;
- historical installed qualifier V2 blob: `56a7ca798553766af525d9fb1ccbe58b70fe9c1d`;
- installed qualifier V3 blob: `d3ad73b041ec7357e2ad8e758caf9d9390a4785b`.

The mode contract is role-specific:

- immutable active source release root: exact `root:root 0555`;
- newly published protected source root: exact `root:root 0755`;
- installed native/selector directories: unchanged exact `root:root 0755`;
- installed native/selector executable files: unchanged exact `root:root 0555`.

No source-release chmod or chown is introduced. Child tree nodes remain root-owned; non-symlink child nodes remain non-group/world-writable; strict internal symlink containment remains mandatory.

The tree digest still binds every child directory mode, regular-file mode/size/SHA-256, and symlink target. Root mode is represented separately in the V4 operation-bound plan so a `0555` immutable source release cannot be confused with the `0755` protected publication root. The plan also binds the exact installed-qualification V3 blob, and a successful create-only install points only to `RUN_INSTALLED_QUALIFICATION_V3`.

## Installed qualification V3 closure

Historical qualifier V2 remains unchanged. It had no role-specific root-mode contract, so following V4 with V2 would reintroduce the same host mismatch. V3 preserves canonical source-custody, exact commit/tree/symbolic-main/clean-worktree checks, source/target byte-identity comparison, exact native/selector/launcher identities, double native self-tests, and all false payment/activation/funds authority.

V3 adds only the role split required by observed immutable runtime state:
- active source-release root: exact root:root `0555`;
- protected source root: exact root:root `0755`.

Its source-only self-test explicitly rejects swapped modes and non-root ownership. The operational V3 run remains unprivileged/read-only and is not executed by hosted CI.

## Lifecycle

V4 uses a fresh `voidv7substrateinstallplan4_<sha256>` namespace and confirmation token `INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V4_CREATE_ONLY`.

Source/CI GREEN does not authorize `--apply`. A real `/opt` create-only publication remains a separate operator lifecycle action after an exact plan-only run is reviewed.

## Authority

This repair does not perform or authorize chmod/chown of the active release, protected `/opt` publication, service/systemd mutation, credential/private-key/wallet access, signing, transaction/RPC, payment acceptance, presale/WC activation, treasury/liquidity action, or funds movement.

PROTECT THE CORE.


## Qualifier binary-execution custody repair

Independent manual review of exact head `b8d877d219390dc6d807caf0361d4617b4623ad5`
found that qualifier V3 authenticated the native preentry and selector leaf files,
then executed them again by pathname without re-proving custody of their binary-root
directories. A runtime-UID-writable parent directory could therefore permit a
pathname swap between leaf validation and self-test execution.

This generation closes that gap. Qualifier V3 now:

- requires the immediate native/selector binary roots to remain exact root-owned
  `0755` directories and every ancestor to remain root-owned, non-symlink and
  non-group/world-writable;
- opens each exact `0555` ELF once with `O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK`;
- authenticates size and SHA-256 from the retained descriptor;
- executes both self-tests through `/proc/self/fd/<n>` with only that reviewed
  descriptor inherited;
- revalidates retained-descriptor identity, visible pathname identity and the full
  ancestor snapshot before/after execution; and
- re-hashes the retained descriptor after both self-tests before GREEN.

The qualifier remains unprivileged and read-only. This repair grants no protected
filesystem apply, service/systemd mutation, credential/key/wallet access, signing,
transaction/payment/activation, treasury/liquidity, or funds authority.


## Protected publication-parent custody repair

The protected installer also treats `/opt` as part of the privileged publication
boundary. Fixed staging names are safe only while their parent cannot be renamed or
rewritten by the runtime UID.

Installer V4 now fails closed unless `/opt` and its ancestor chain are
non-symlink, root-owned, non-group/world-writable directories and the immediate
`/opt` publication root is exact mode `0755`. Before each create-only
`renameat2(..., RENAME_NOREPLACE)`, it opens `/opt` with
`O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC`, requires the retained descriptor to match
the authenticated parent identity, and revalidates that identity plus path custody
after publication.

This prevents an unprivileged stage-name swap from substituting attacker-controlled
content between staging and create-only publication. No additional host authority is
granted.


## Candidate special-file race repair

The installer accepts externally materialized native and selector candidate paths.
A regular-file `lstat()` followed by a blocking pathname open can otherwise race:
the candidate can be replaced by a FIFO or other special file before `open()`,
causing a plan/apply to hang before the retained-FD identity checks run.

Installer V4 now opens candidate paths with
`O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK`. Immediately after open and before
any read, the retained FD must still be a direct regular file, have exactly one
link, and have the exact accepted byte size. The retained FD generation comparison
also includes mode and link count before and after the read, and the visible path
must remain the same exact generation.

The source self-test explicitly proves that regular/single-link/exact-size metadata
is accepted while FIFO, multi-link, and wrong-size metadata are rejected before
candidate bytes are consumed. This repair grants no new install/payment/activation
authority.


## Privileged Python/source entry boundary

Installer V4 is root-capable, so source validation cannot begin after importing
checkout-shadowable Python modules from an untrusted invocation environment.

The installer now imports only built-in `sys` first and requires isolated Python
with safe-path semantics before importing `argparse`, `ctypes`, `json`,
`pathlib`, or other stdlib modules. Hosted proof places a hostile
checkout-local `argparse.py` next to a disposable installer copy and requires
non-isolated execution to HOLD before that module can execute.

For `--apply`, the installer additionally requires the executing checkout,
its ancestor chain, and every checkout/.git node to be root-owned and
non-group/world-writable, with symlinks confined inside the same trusted source
root. This intentionally rejects privileged apply directly from the ordinary
user-owned canonical checkout.

The in-script guard does not authenticate Python startup hooks that can execute
before script entry. A separately reviewed root-custodied launcher must still pin
the interpreter, require `-I -B`, sanitize the environment, authenticate the
landed installer/input generation, and only then enter this apply path.
