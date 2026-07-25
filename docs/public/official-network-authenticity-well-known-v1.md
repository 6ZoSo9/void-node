# VOID Official Network Authenticity Well-Known V1

`VOID_OFFICIAL_NETWORK_AUTHENTICITY_WELL_KNOWN_V1`

Public routes:

- `/.well-known/void-network-authenticity.json`
- `/.well-known/void-network-authenticity.schema.json`

The packet is self-contained: public key, Ed25519 signature, and signed payload.
It remains `admitted_unactivated`; it grants verification only and no runtime,
wallet, validator, Work Credit, Buy VOID, economic, or third-party-network
control authority.

Checkpoint: `ckpt-official-network-authenticity-root-public-admission-v2-1-post-merge-exact-green-20260725T144005Z` at `b8e93d1d0b84e917c16a2d5cdfc195fcb6e4e8af`.

This isolated lane does not edit `src/index.ts` or the large public route index.
