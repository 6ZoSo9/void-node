# Buy VOID protected V7/V2 enforcement lock V4

Status: **accepted source identity only; no deployment or economic authority**.

This successor accepts the exact repaired deployment-reader V4 candidate from
Draft #3680 at `895c2bf320defbbca5fba6792e2a75126b2c4d76`.

## Hosted evidence

- workflow run: `39665164718`
- Node 22 artifact: `12376738282`
- Node 24 artifact: `12377278277`
- Node 26 artifact: `12377118279`
- candidate cross-node job: `119449789170`
- Dispatch V4 cross-node job: `119450541241`

## Exact identities

- candidate proof: `f33a579e62c8201de24d5076cfcbffab66df8dae`
- candidate JSON: `5893e300a78dc4ca7729ef47f95a8e3eea2043cf`
- candidate SHA-256: `bf360784af7a6ddf908812b9c335e8e52d4410ba249c5ea1988b97d9cfd5a72c`
- protected inventory SHA-256: `8485ef25c236b8798bed3a67b9308ef7dcd383aedca1486f4f488d043d7efbe0`
- enforcement-set SHA-256: `ff084a754e7eb6bef08ec1b1079a17a6110b4333876f0231e46395eed63042d2`
- Dispatch V4: `51a51a7f85c8068269bad0e09e3ae872c4323a58`
- lock JSON: `854b9e39772e1e930c63b71e1099509df0f2dbf8`
- lock proof: `040414e96906043e2a01995bf2cbd259a7dbd58f`

The accepted candidate records the exact descriptor-bound production reader
transition `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0` to `e0a682ea4038ca22e3a3b97da2cac29874096c46` and preserves the other 48 protected
source rows.

## CI source-context isolation

The final acceptance-lock successor spans eight paths relative to exact V4
candidate head `895c2bf320defbbca5fba6792e2a75126b2c4d76`: four lock-generation paths plus four legacy
workflow consumers whose candidate-only Dispatch V4 jobs are pinned back to
that exact candidate head.

Candidate and Dispatch artifacts are downloaded under `$RUNNER_TEMP`, outside
the checked-out repository. The provider-closure, census, historical-refusal,
executable-delta, and candidate/Dispatch proof contexts are all isolated from
the later acceptance-lock head. The current-head lock proof therefore keeps a
clean Git worktree while validating the exact eight-path successor delta.

## Authority boundary

`candidate_enforcement_identity_accepted=true` applies only to the exact V4
source identity. Deployed artifact generation, runtime mount authority,
production source-finality authority, public presale activation, and funds
movement remain false.

No deployment receipt is installed. No service, credential, wallet, signer,
transaction, chain-2050, presale, or funds mutation occurs in this lane.
