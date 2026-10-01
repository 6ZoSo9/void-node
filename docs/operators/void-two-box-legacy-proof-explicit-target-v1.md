# VOID two-box legacy proof admission v1

Marker: `VOID_TWO_BOX_LEGACY_PROOF_EXPLICIT_TARGET_V1`

Status: source-only fail-closed operator hardening. This contract does not run a
two-box proof, SSH to an operator machine, submit a job, publish DataNet state,
restart a service, access a wallet/signer, submit a transaction, or move funds.

## Why this exists

This legacy proof family historically assumed one retired Alienware peer.
Replacing that implicit host with arbitrary environment strings is not enough:
OpenSSH treats leading `-` as option syntax, URLs can carry unintended
authority/path syntax, and several "proofs" perform real POST/job/WC/DataNet
effects.

The shared admission helper is:

`ops/lib/void-two-box-legacy-proof-admission-v1.sh`

Every guarded wrapper loads it before output-directory creation or network
activity.

## SSH destination contract

`ALIEN` is mandatory and is treated only as a destination. It must match:

`[user@]host`

User and host components begin alphanumeric and are limited to alphanumeric,
dot, underscore and hyphen characters. Leading option syntax, whitespace,
control/shell metacharacters and the retired Alienware identities are rejected
with exit 2.

Retired identities include:

- `100.122.79.39`;
- `zoso-alienware-aurora-r7.taila47fd.ts.net`; and
- the token `alienware`, case-insensitively.

## HTTP origin contract

Remote node, relayer and peer bases are explicit `http://` or `https://`
origins with:

- a bounded hostname;
- an explicit numeric port in 1..65535;
- no credentials/userinfo;
- no query or fragment;
- no whitespace/control or shell metacharacters; and
- no path except the specifically reviewed helper prefix below.

`REMOTE_HELPER_BASE` in `two-box-remote-product-proof.sh` is the sole
path-bearing exception and must end exactly in `/workcredits/devnet`
(optionally with one trailing slash).

`LOCAL_NODE_BASE` remains a loopback-only origin where used.
`two-box-ui-share-open-both-ways-proof.sh` additionally requires an explicit
validated `PUBLIC_LOCAL_NODE_BASE` before its peer-registry mutations.

For remote origins that are claimed to identify the selected remote box, the
admission step performs a fixed read-only SSH identity check and requires each
HTTP host to match one of the remote host's observed hostname, FQDN, Tailscale
IPv4 address or Tailscale DNS name.

## Source-generation gate

Before an admitted proof can proceed:

1. the local repository must be clean, on `main`, with a full 40-hex HEAD;
2. the selected remote repository must be clean, on `main`;
3. local and remote full Git HEAD values must be identical; and
4. the remote hostname must be distinct from the local hostname.

This check happens before the legacy wrapper's original network/product action.
Printing branch/head is not treated as source authority.

## Mutation confirmation

The following effectful wrappers additionally require:

`CONFIRM_TWO_BOX_LEGACY_PROOF=runVoidTwoBoxLegacyProofV1:<script-basename>`

The value is script-specific and must be present before source-parity SSH or any
POST/product action:

- `ops/two-box-bidirectional-open-proof.sh`
- `ops/two-box-datanet-canonical-proof.sh`
- `ops/two-box-datanet-peer-path-proof.sh`
- `ops/two-box-datanet-proof.sh`
- `ops/two-box-datanet-workloop-proof.sh`
- `ops/two-box-full-useful-work-loop-proof.sh`
- `ops/two-box-peer-proof-suite.sh`
- `ops/two-box-receipt-result-fetch-proof.sh`
- `ops/two-box-remote-product-proof.sh`
- `ops/two-box-remote-verify-redundancy-proof.sh`
- `ops/two-box-reverse-bidirectional-open-proof.sh`
- `ops/two-box-ui-share-open-both-ways-no-seed-proof.sh`
- `ops/two-box-ui-share-open-both-ways-proof.sh`

These three observer-style wrappers retain the strict target and exact-source
parity gates but do not require mutation confirmation:

- `ops/two-box-datanet-tab-proof.sh`
- `ops/two-box-remote-participant-copy-actions-proof.sh`
- `ops/two-box-remote-participant-js-parse-proof.sh`

The confirmation is admission to the legacy proof's already-existing effects;
it does not grant wallet, signer, transaction, treasury, liquidity or unrelated
runtime authority.

## CI boundary

Focused CI never supplies a real accepted remote machine. It proves terminal
fail-closed cases for all 16 wrappers:

- missing target;
- retired Alienware target;
- option-shaped/malformed SSH destination;
- unsupported/malformed remote origin;
- missing mutation confirmation for effectful wrappers; and
- static ordering of confirmation/source-parity gates before side effects.

The shared helper is additionally exercised against an isolated temporary Git
repository with a stubbed remote-identity collector. This proves:

- mismatched local/remote full HEAD fails closed;
- an HTTP origin for a different remote host fails closed; and
- a matching hermetic source/peer control reaches admission success.

No live SSH, HTTP, POST, WC, DataNet, systemd, validator, wallet, transaction,
treasury, liquidity or funds action is executed by the focused proof.

## Authority boundary

This patch hardens admission only. It does not make these historical workflows
crash-atomic, and it does not supersede the separately tracked cross-box
transaction/recovery work. Operators must not infer that an admitted legacy
proof is safe against mid-operation machine/process failure merely because its
targets, source generation and confirmation are valid.
