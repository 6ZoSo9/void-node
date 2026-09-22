# Chain-2050 role-authority unsigned deployment policy v1

## Purpose

Bind the accepted role-authority registry bytecode, the verified offline
owner/deployer pair, and the exact Precision read-only deployment observation
into one unsigned EIP-1559 deployment candidate.

No signing, broadcast, deployment or funding is performed.

## Exact pair

- owner: `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`
- deployer: `0x4d0a1149d13b03448c56ee6582d161159c5e537f`
- predicted nonce-0 contract:
  `0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49`

The Precision observation proved nonce 0, no pending transactions, and an
empty predicted contract address at block 37377.

## Exact deployment identity

- creation bytecode SHA-256:
  `c0844cd0718ed2dc345bbc01107b57dbb2c2129e325066bff399502031a14733`
- deployment data SHA-256:
  `1f6f97cabc21b54875f1b181b27153be75ee261a6bc5d77ff30c993187fab068`
- deployment data Keccak-256:
  `0xa0a33788745d22d83b2cbf0058912abe19d8cc34d2403252fd4c95cf3b5786f6`
- expected deployed runtime SHA-256:
  `b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d`

## Gas and fee policy

Precision measured exact deployment gas at `2002484`.

The existing reviewed 12000-bps deployment margin yields:

`gas_limit=2402981`

The unsigned candidate reuses the bounded Mainnet-0 fee envelope:

- max fee: `3000000000` wei/gas;
- max priority fee: `1000000000` wei/gas.

The observation had base fee `7` wei and priority suggestion
`1000000000` wei, so the current observed requirement
`2 × base + priority = 1000000014` remains below the cap.

This is a candidate fee envelope only; it does not authorize signing.

## Funding hold

The deployer balance was exactly zero.

At the candidate maximum fee and gas limit, the maximum gas liability is:

`7208943000000000 wei`

Therefore the same amount is the current minimum additional deployer funding
needed to satisfy this bounded transaction candidate.

Funding is **not** authorized by this gate.

## Unsigned transaction

The source gate materializes the exact type-2 transaction candidate and
derives both:

- unsigned serialized transaction bytes; and
- the exact unsigned transaction hash that a later offline signer would sign.

Those values are deterministic proof outputs, not signing authority.

## Required next sequence

1. separate authorization for deployer gas funding;
2. fund only the reviewed deployer address;
3. fresh read-only nonce/balance/address/code/gas/fee revalidation;
4. exact single-transaction signing authorization;
5. offline deployer signature;
6. independent signed-transaction verification;
7. separate broadcast authorization.

No later step is implied by this source gate.
