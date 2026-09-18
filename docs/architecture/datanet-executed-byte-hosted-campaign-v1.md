# DataNet executed-byte hosted campaign v1

This lane turns the executed-byte contract into natural hosted process evidence.
For each Node 22/24/26 runtime and each `current|protected` profile it executes
the exact 48-schedule member manifest:

- mutable artifacts: runtime, observer and proof;
- cuts: after digest, before process creation, after child creation before target
  open, and after target open before the post-check;
- termination modes: normal and supervisor crash; and
- one fresh recovery control after every attack.

The launch fixture uses a real selected Node executable plus executable preload,
observer and proof bytes. Current-path attacks transiently substitute equal-size
marked artifacts and restore the pathname before its post-check. Protected
attacks use the sealed-memfd mechanism. The child reports kernel-opened
device/inode/byte/SHA-256 identities, evaluates the retained script bytes, and
performs a `/proc` writable-FD/shared-VMA census before completion.

For crash schedules, a per-schedule supervisor is SIGKILLed after the child has
opened/evaluated the launch artifacts but before terminal completion. The outer
campaign controller discards the supervisor partial record, retires the orphaned
child within the 64-tick bound, then starts a fresh recovery control. Crash
observations come from the execution child and are retained separately from the
discarded supervisor partial state.

Six independent member artifacts are retained through GitHub Actions and
recursively revalidated into one complete hosted tier. The aggregate does not
construct a two-tier receipt and explicitly reports `two_tier_acceptance=false`.

## Scope boundary

This is a hostile launch-mechanism campaign using committed harness logic and
generated launch fixtures. It does not prove designated-host/Precision behavior,
external machine identity, ext4 generation, DataNet payload durability, peer
repair, Chain-2050 finality, deployment, wallet/signing, market activation,
liquidity, or funds authority. A GREEN hosted tier is necessary evidence for the
executed-byte gate, not final #1464 acceptance.
