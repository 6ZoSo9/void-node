# Cross-box bootstrap mutation boundary v1

Marker: `VOID_CROSSBOX_BOOTSTRAP_MUTATION_BOUNDARY_V1`

## Scope

This contract hardens four existing Precision-oriented cross-box bootstrap/Tailnet operator proofs:

- `ops/mainnet0/mutual-tailnet-peer-env-proof.sh`
- `ops/mainnet0/tailnet-http-public-base-proof.sh`
- `ops/post-bootstrap-crossbox-proof.sh`
- `ops/tailscale-ssh-auth-preflight-proof.sh`

Only the mutual peer-env proof mutates runtime configuration. The other three remain read-only observation/preflight tools.

## Destination-only SSH input

Every `ALIEN` value is now parsed only as a destination:

```text
[user@]host
```

The grammar rejects whitespace, leading option syntax, shell fragments, and punctuation outside alphanumeric / dot / underscore / hyphen destination tokens.

Retired Alienware coordinates remain forbidden.

## Mutating peer-env proof

The mutating path requires:

```text
ALIEN=<explicit SSH destination>
PRECISION_TS=<valid IPv4, or current local tailscale -4 result>
ALIEN_TS=<explicit valid remote Tailnet IPv4>
HTTP_PORT=<1..65535>
CONFIRM_MUTUAL_TAILNET_PEER_ENV=applyVoidMutualTailnetPeerEnvV1
```

`PRECISION_TS` and `ALIEN_TS` must be distinct.

Before any output directory, systemd drop-in write, daemon reload, or restart, the proof must verify:

1. local repository is clean;
2. local full Git HEAD is valid;
3. remote repository is clean;
4. remote full Git HEAD equals the local full HEAD;
5. remote hostname is present and is not the local hostname/short hostname.

The source-parity SSH is read-only. Mutation begins only after it succeeds.

The peer URLs written into systemd are then constructed only from validated IPv4 + port values.

## Read-only companion proofs

The companion proofs reject malformed SSH destinations before output creation or SSH.

Additional bounds:

- Tailnet HTTP proof requires a valid Tailnet IPv4 and port.
- Its `PUBLIC_LOCAL_NODE_BASE` must exactly equal `http://<TS_IP>:<HTTP_PORT>`.
- Post-bootstrap proof requires `PREC_TS` to be a valid IPv4 address.

## Failure behavior

Input/confirmation failures HOLD with exit code 2 before network/systemd commands.

A source-parity failure may perform the single read-only SSH identity preflight, but it must HOLD before:

- creating the proof output directory;
- creating the systemd drop-in directory;
- writing a drop-in;
- `systemctl --user daemon-reload`; or
- restarting either node.

## CI boundary

The focused proof uses fake `ssh`, `systemctl`, `curl`, `tailscale`, `ss`, and `make` commands for adversarial cases. It never performs live SSH, Tailscale observation, systemd mutation, service restart, or runtime/network mutation.

This source change grants no wallet/signer, transaction, validator, Work Credit, treasury/liquidity, activation, or funds authority.
