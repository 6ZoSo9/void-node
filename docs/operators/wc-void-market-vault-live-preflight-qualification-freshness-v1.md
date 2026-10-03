# WC/VOID market-vault live-preflight qualification freshness v1

Tracks #2225.

The market-vault role/deployment qualification embeds the bounded
launch-controller proof-of-control window:

```text
verified_at_unix
reverified_at_unix
valid_until_unix
```

The live deployment observation preflight must not convert that short-lived
control proof into an indefinitely reusable deployment-preparation credential.

## Production rule

The live preflight applies the same control-freshness window twice: once before
any Chain-2050 RPC observation and again after the fixed-block / pending-nonce
revalidation immediately before any production preflight material or
`preflight_id` is constructed.

Before the first RPC, the production preflight also receives the exact private
signed launch-controller control-evidence bytes and an independent SHA-256. It
replays that evidence through the reviewed control-requalification source and
reviewed `ethers` runtime, then requires the reverified identity/timestamps and
false authority facts to match the qualification exactly.

Both freshness checks require:

```text
verified_at_unix <= reverified_at_unix < valid_until_unix
reverified_at_unix <= current_wall_clock_unix < valid_until_unix
```

The final production wall-clock value must also be greater than or equal to the
initial production wall-clock value. A backward clock step during observation
fails closed rather than extending the apparent lifetime of the qualification.

At either boundary, at or after `valid_until_unix`, the result is:

```text
HOLD
reason=live_deployment_preflight_launch_controller_control_expired
```

Before the first boundary, **zero RPC calls** are permitted. If the qualification
is fresh when observation begins but expires while RPC observation is in flight,
the RPC reads may already have occurred, but the second boundary returns HOLD
before a production preflight artifact or ID is minted.

Production evaluation time comes from the process wall clock inside
`observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(...)`. The initial and
final wall-clock reads are internal; a production caller cannot extend
qualification life by supplying either time.

The legacy broad test-only observer retains its non-production synthetic
qualification seam for RPC semantics. A separate strict test-only observer
requires the same signed-evidence replay as production. CI uses that strict path
to prove valid signed evidence can reach RPC while missing, hash-mismatched, or
forged self-consistent qualification/evidence inputs make zero RPC calls.

The freshness observer retains deterministic explicit initial/final
evaluation-time seams so CI proves expiry before RPC, expiry after a full valid
RPC observation but before artifact mint, and a backward wall-clock step after
RPC.

## Operational consequence

A qualification is current only while all of these are simultaneously true
through the **entire observation and artifact-mint boundary**:

1. its recorded source head is a Git ancestor of canonical current main;
2. its recorded source tree is re-derived exactly from that historical source
   head;
3. the historical qualification tool + reviewed dependency bytes match the
   recorded blob/SHA-256 manifest;
4. current canonical main still carries those exact same reviewed
   qualification/dependency bytes;
5. the exact signed launch-controller evidence bytes and independent SHA-256
   match the qualification and reverify through the reviewed control/ethers
   boundary before any RPC;
6. its launch-controller proof-of-control window has not expired at observation
   start; and
7. that same control window remains unexpired after RPC revalidation immediately
   before artifact mint.

Unrelated merges therefore do not invalidate a still-fresh qualification merely
because the repository HEAD changed. Any change to an authority-bearing reviewed
qualification/dependency byte still fails closed.

The production observer itself must still be clean local `main` equal to live
GitHub `refs/heads/main`; only the **qualification's historical source
generation** is allowed to be an ancestor.

If the control window expires before the production RPC/deployer/inventory
observation is ready, create a new challenge, obtain a fresh offline control
signature, verify new control evidence, and generate a new qualification. Do
not extend or rewrite the old artifact.

This freshness wall does not authorize deployer selection, transaction
construction/signing/broadcast, deployment, inventory funding, market/presale
activation, token transfer, or funds movement.
