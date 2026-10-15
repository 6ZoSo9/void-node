# Buy VOID user-manager query ELF acceptance lock v2

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V2`.

Status: **source/CI acceptance of one exact post-hardening authenticated-query ELF pair only**.

## Accepted candidate

Parent candidate: #3100 exact head
`df7bfa95539c78d88e672746a80041ca959dbfda`.

Hosted run `38741557266` produced byte-identical metadata and binaries across
independent slots a/b/c and executed the fixed-path preload adversary before
publishing hashes.

Hosted artifacts:
- a `11976129058`
- b `11975598541`
- c `11975224121`

Accepted identities:
- preexec source blob `f0fbfaae97df3294097a281100f06ada2ef157ff`;
- query source blob `44051589338df7557b167f567cbe1ce524611621`;
- embedded peer source blob `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- static preexec: 706504 bytes, SHA-256
  `8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11`;
- V2 query: 43064 bytes, SHA-256
  `af0f005f56693e785cd2bceaeea863aaaf4873d314b288f8eca5daebc0b98f32`;
- candidate metadata: 901 bytes, SHA-256
  `f19ca349e2c65d2ee455f6d31310467e7a15d8b200f9d352cf5d18e5cdb6ea4a`,
  Git blob `1b2ee0a7c7e9b8d1f99288428a6fa9b2aa4a1e7f`.

Compiler and strip-tool identities remain the historical accepted Ubuntu 24.04
identities.

## Security contract

This generation includes #3092's systemd user-manager reexec argv repair and
#3100's post-hardening kernel capability evidence.

The native query requires:
- authenticated retained systemd private connection and exact peer identity;
- systemd NoNewPrivileges enabled;
- kernel NoNewPrivs=1;
- kernel CapInh/CapPrm/CapEff/CapAmb all zero;
- systemd AmbientCapabilities=0;
- kernel CapBnd equal to the configured systemd CapabilityBoundingSet;
- kernel security snapshot stable through post-query generation revalidation.

This intentionally does not require an empty configured capability bounding
set; Precision's accepted user-systemd V2 hardening preserves the existing
bounding mask while active capability masks remain zero.

## Independent lock proof

Node 22/24/26 independently recompile and strip the exact sources, verify the
unchanged static/no-PT_INTERP preexec, run the exact V2 query self-test, and
require the committed candidate/lock bytes to match the derived values.

Historical V1 lock remains frozen predecessor evidence.

## Lock identity

`voidbuyumqelflock2_295873e6ea531eb2fbbf60103633e742da94c8884f8360a909991c18085a5fc7`

## Authority

The lock accepts only the exact binary identity.

`candidate_accepted=true`

Still false:
`install_authorized`,
`protected_install_performed`,
`complete_host_evidence_collector`,
`production_host_evidence_authority`,
`payment_acceptance`,
`public_presale_activation`,
`funds_movement`.

A separately reviewed fixed-path protected replacement transaction is required
before the V2 query may be used on Precision. The installed V1 pair is not
modified by this lock.

PROTECT THE CORE.
