# Buy VOID source-finality execution preflight v1 review checklist

Review this lane as a fail-closed execution guard, not as production source-finality activation.

- Base must be merged #1476 `67e85c3e2abe99753ec784f31e96f0448da12cc1` unless a later synchronization is explicitly reviewed.
- V4 must remain unchanged at `source_generation_verified=false`, `deployed_artifact_generation_verified=false`, `ancestry_verified=false`, `provider_quorum_verified=false`, and `production_source_finality_authority_ready=false`.
- The delivery runtime must wrap the injected signer and broadcaster; it must not accept caller-supplied source-finality policy or capability objects.
- The preflight must execute before `signer.get_address()`, `signer.sign_transaction(...)`, and `broadcaster.broadcast_signed_transaction(...)` delegate calls.
- A failed preflight must prevent the underlying signer/broadcaster method from being called.
- The preflight result must be cached per operator command so signing and broadcast cannot observe different finality generations within one command.
- The preflight must be lazy. It must not run merely because an apply-mode command is reconciling an already-broadcast transaction.
- Reconciliation/terminal recovery paths that do not use signer/broadcaster must remain available.
- The preflight must reconstruct the payment request from the unique server-owned execution-attempt/fulfillment-intent journals and reject ambiguity or identity mismatch.
- Source RPC URL fingerprints must be server-derived from normalized URLs.
- Non-loopback source RPC must require HTTPS; URL userinfo and fragments must be rejected.
- Canonical USDC contracts, receive addresses, minimum confirmations, and presale economics must come from existing server policy / canonical economics, not caller input.
- Immutable process-source marker/commit/tree/main-branch shape must be required before any source-chain RPC observation.
- `ready` must require all of: reviewed source files, authenticated transport, total deadline, source generation, deployed artifact generation, ancestry, provider quorum, and production source-finality authority.
- Current V4 must therefore hold and must not release signer/broadcaster capability.
- Focused proof must run on Node 22, 24, and 26 with typecheck, build, V4 preservation proof, delivery-runtime integration guard, and committed-range diff hygiene.
- No deployment/restart, production environment mutation, credential/key/wallet access, signing, transaction broadcast, Chain-2050 mutation, inventory/presale mutation, treasury/liquidity action, or funds movement is authorized or performed by this PR.

A PASS means the irreversible dependency seam is guarded fail-closed. It does **not** mean production source-finality authority is ready, the delivery runtime is enabled, a signer is configured, presale inventory is active, or funds may move.
