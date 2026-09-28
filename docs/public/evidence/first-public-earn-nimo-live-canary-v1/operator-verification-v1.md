# VOID First Public Earn Nimo Live Canary

Milestone ID: `voidpearnmil1_7ea5c19116369eeaeba7bf5f44ad3a5bd09476e872805128f29011d678907b9d`

## Result

Nimo completed one bounded public Work Credit earning attempt through `https://seed.nullfeed.org` using the canonical no-node client and the existing pending capability ticket.

- Account: `nimo-first-public-earn-v1`
- Executor node: `b1f0484e430d17d6220ec72612bb2760`
- Coordinator node: `9d89483769e469e0473b489dc50dba96`
- Ticket: `0f4f906e7c4836e2b16fa2bdf6bcbc60`
- Task: `datanet_fetch_verify`
- Dataset: `void-public-earn-first-work-v1`
- Dataset SHA-256: `c12a7a4aec535398d3cb9b3dd7a19894f52daf8a2bf1c11019f81a1f0a0c38ea`
- Job: `job_no_node_v1_8fef6bd23f8632e9059cbee6`
- Receipt: `rcpt_no_node_v1_696a68f8b783d42b689d0d87`
- Transport: `outbound_bundle`
- WC transition: `0 → 3`
- WC quanta: `0 → 3000000000`
- Numeric authority: `nano_wc_fixed_point_v1`

The terminal client marker was `VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_EARNED_3_WC_EXACT_GREEN`. The client reported `resumed_pending_ticket=true`, `ticket_deleted=1`, and `recovered_terminal=false`.

## Recovery path

The live canary exposed two bounded recovery seams before the successful completion:

1. `remote_truth_warming` while the coordinator refreshed its remote-truth/history authority.
2. `capability_result_conflict` when a later process generated a different result identity for the same pending capability.

The final successful run resumed the original ticket and completed it. PR #2009 then merged the canonical client repair that retries only `remote_truth_warming` and reuses the exact signed request body within the same invocation.

## Source binding

- Execution client source commit: `61ffc590a83d50b2da894888559cc4d6a4b08ff9`
- Execution client Git blob SHA-1: `f68fd0f4afed303c8583ba3b87a2351054bbe578`
- Recovery fix merge commit: `2707b29ec67053b894e396f63501151cd30e45fc`
- Recovery fix PR: `#2009`

The coordinator runtime commit is deliberately not claimed because this evidence did not independently attest the running process commit.

## Security boundary

This public packet excludes the capability token, executor-identity private-key bytes, private Nimo state paths, raw claim/result signatures, and the private local receipt file. It publishes only a sanitized receipt projection and public identifiers needed to bind the observed result.

The canonical no-node client did access the local Ed25519 executor-identity private key and used it to sign the claim and result envelope. No EVM/Chain-2050 wallet or transaction signer was used. No VOID transfer, WC-to-VOID settlement, payment transfer, validator mutation, or treasury movement occurred.

## Scope

This is evidence of **one bounded live Public Earn canary**. It supports the existing `Bounded pilot` classification for Work Credit earning. It does not establish permissionless WC issuance or broader economic activation.
