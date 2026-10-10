# Nimo V3 inactive exact-wire bundle v1

This successor packages the current combined Nimo witness V3 candidate
`voidwfb3_cec212bbadb4586f7d479c2284e7a2850f47bdc2205a6dccfad5274c8c7ef454`
without installing or accepting it.

The historical V1 witness and proposed V2 lock remain immutable. The V3
candidate changes only the compiled allocation-reservation ledger from the
proposed V2 runtime closure; the other seven runtime files remain the reviewed
V2 bytes.

`scripts/prove_buy_void_nimo_v3_inactive_bundle_v1.py` verifies the exact
eight runtime sizes/SHA-256 identities and the exact V2 lock Git blob, builds a
deterministic USTAR archive with fixed member order/uid/gid/mode/mtime, and
independently reparses the result. Inspection reconstructs the canonical TAR
byte-for-byte, so changed headers, payload bytes, padding, or trailing blocks
HOLD.

CI builds the runtime independently on Node 22, 24 and 26, requires the same V3
candidate ID, packages and reinspects each archive, rejects a trailing-byte
tamper, then requires all three archives and receipts to be byte-identical.

This remains an inactive review artifact. It does not install files on Nimo,
authenticate the cross-UID custody principal, mount verified-payment to
allocation dispatch, enable custody reserve/recover, accept customer payment,
activate the presale, access wallets/signers, or move funds.
