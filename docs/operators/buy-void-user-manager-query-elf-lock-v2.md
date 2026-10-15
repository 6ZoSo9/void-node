# Buy VOID user-manager query ELF acceptance lock v2

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V2`.

Status: **source/CI acceptance of the final post-hardening authenticated-query ELF pair only**.

## Accepted candidate

Parent candidate: #3100 exact head
`27de5f113826d6fb214f9a1fb49d54454d4a3cd4`.

Hosted run `38744405436` produced byte-identical metadata and binaries across
independent slots a/b/c and executed the fixed-path preload adversary before
publishing hashes.

Hosted artifacts:
- a `11977696442`
- b `11977916630`
- c `11977112276`

Accepted identities:
- preexec source blob `f0fbfaae97df3294097a281100f06ada2ef157ff`;
- query source blob `5355b7f177574ac4fa173a693605acaf9c5f26e4`;
- embedded peer source blob `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- static preexec: 706504 bytes, SHA-256 `8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11`;
- V2 query: 43064 bytes, SHA-256 `d11304cb35be20dd4775677a2d5bf41c09f0f0b7a747ec7a8fea952e4bc8639c`;
- candidate metadata: 901 bytes, SHA-256 `a627245d6fede4fc1af7f32ecacafbbc24aa0af14de2e6cc0e7156e61a1d28ce`,
  Git blob `c73920dc02aaad5e99314fd981defe42db224749`.

## Security contract

This final generation requires:
- closed systemd `--user` / `--user --deserialize=<positive-decimal-fd>` manager argv;
- authenticated retained private-manager connection with kernel peer identity;
- systemd `NoNewPrivileges=yes` and kernel `NoNewPrivs=1`;
- authenticated `PrivateUsers=no`;
- configured ambient capabilities zero;
- kernel CapInh/CapPrm/CapEff/CapAmb all zero;
- kernel CapBnd equal to configured systemd CapabilityBoundingSet;
- stable kernel security snapshot, pidfds, cgroup, executable and generations.

This is the exact contract matching the V2 hardening already live on Precision.

## Independent acceptance

Node 22/24/26 independently recompile and strip the exact sources, verify the
unchanged static/no-PT_INTERP preexec, run the full V2 query self-test, and
derive byte-identical committed lock JSON.

Historical V1 lock remains frozen predecessor evidence.

## Lock identity

`voidbuyumqelflock2_c643213ce46d6f2b4dfe04675a7fbbcaad2b6aea40418cb921586362a054f474`

## Authority

The lock accepts only the binary identity. It does not replace the installed
V1 query, execute the live query, mutate a service, accept payment, activate
presale/WC, sign a transaction, or move funds.

`candidate_accepted=true`

Still false: `install_authorized`, `protected_install_performed`,
`production_host_evidence_authority`, `payment_acceptance`,
`public_presale_activation`, and `funds_movement`.

PROTECT THE CORE.
