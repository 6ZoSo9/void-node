# Buy VOID Epoch-2 live composition native acceptance lock v2

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_LOCK_V2`.

Status: **source/CI acceptance of one exact static native first-entry + reviewed
runner pair only**.

## Hosted candidate evidence

Accepted candidate source head:

`de1d19d8782405afa4d62ae670b11087d9c7e93e` (#3200).

Accepted trust-root source parent:

`907bc1780110717f4caaae06595ec742976162f1` (#3184).

Candidate merge commit:

`23e963fb7b16dd2e64ce6934beb9cf831767fe75`.

Hosted derivation run:

`38811855456`.

Artifacts:
- slot a: `12007939670`;
- slot b: `12008782133`;
- slot c: `12008931729`.

All three derivations and cross-job byte equality are GREEN.

## Accepted identities

Source:
- native preentry:
  `4aa091e7835b32aa5c4e7b8e4059651c69a64eb3`;
- V2 runner:
  `92e8c8696ea7e2bb81b6ef089db8baa657188935`;
- native trust proof:
  `4db3583c5c058a581fce69ef49312f7d3534b8ca`;
- native trust workflow:
  `85c28fdf03345240332cbf41d46fbda065958ec7`;
- sealed credential attestation V2:
  `14cbe81e27d04fee77cbe75225ce308bf8561a7b`;
- candidate workflow:
  `f3f644ad6c1ee916465a5a471e5b8edb23d18e8d`.

Candidate metadata:
- bytes: 1,644;
- SHA-256:
  `c60e8e1e5bd4974be21e19a903bcd3d5a9858ecccc7f01977a48707f16c1d774`;
- Git blob:
  `0975734c1d3e7f9dd8bc1abe65dc28eb7d0faf0d`.

Accepted native binary:
- bytes: 726,976;
- SHA-256:
  `78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589`;
- static;
- no PT_INTERP.

Accepted runner:
- bytes: 30,103;
- SHA-256:
  `2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73`;
- future installed mode: `0444`.

Toolchain:
- /usr/bin/cc SHA-256:
  `1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26`;
- /usr/bin/strip SHA-256:
  `0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42`.

## Accepted trust contract

The candidate requires:
- native first instruction before privileged JavaScript;
- statically linked native preentry and no PT_INTERP;
- fixed root-owned native/runner paths;
- native parent retained for the complete child lifetime;
- private inherited parent-proof channel;
- parent/child PID + start-time generation binding;
- installed native/runner/Node identity binding in the parent proof;
- native parent revalidation after the sensitive sequence;
- proof-pipe closure fail-closed;
- caller stdin JavaScript rejected before root JS;
- hostile loader injection blocked before native main.

The future host policy still binds later:
- exact deployed expected Git head;
- exact Precision /usr/bin/node identity;
- the accepted runner identity from this lock.

## Lock identity

`voidbuye2livecompnativelock2_32261e9f34a132269b9d65a3cc14723938e00a7a6fc4ff08888861afcc50fbd3`.

Node 22, 24 and 26 independently rederive the candidate and lock and must
produce byte-identical lock JSON. The Node 24 lane also reruns the complete
native privileged trust proof.

## Authority

This lock accepts candidate identity only:

- `candidate_accepted=true`;
- `install_authorized=false`;
- `live_execution_authorized=false`;
- `protected_install_performed=false`;
- `credential_access=false`;
- `private_key_access=false`;
- `transaction=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `funds_movement=false`;
- `production_host_evidence_authority=false`.

No Precision install, credential read, signing, transaction, payment/presale
activation, WC/VOID activation or funds movement is authorized.

Next gate: a separately reviewed protected installation/policy plan that binds
the exact live-host Node identity and expected deployed Git head to this lock.

PROTECT THE CORE.
