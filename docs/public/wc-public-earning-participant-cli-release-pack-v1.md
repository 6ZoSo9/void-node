# WC Public Earning Participant CLI Release Pack V1

Marker: `WC_PUBLIC_EARNING_PARTICIPANT_CLI_RELEASE_PACK_V1`

This lane creates a deterministic, checksum-bearing review artifact for the
already merged WC public-earning participant CLI. It packages the exact
repository CLI bytes, the VOID Community License, a content-addressed source
manifest, and a plain-language operator README.

The release pack is meant to make the existing executor workflow easier to
download and independently verify. It does **not** remove the current runtime
requirements: the participant must already have a compatible local VOID
executor endpoint, a fresh ticket, and the exact trusted coordinator base and
node ID. The current pilot awards exactly 3 WC only after an exact-green,
ticket-bound completion accepted by the coordinator.

The archive is deterministic: entries are sorted, uncompressed, fixed to one
timestamp and explicit Unix modes, and stripped of comments and platform
metadata. Rebuilding from the same source commit produces identical bytes.

## Artifacts

- `void-wc-public-earning-participant-cli-v1.zip`
- `void-wc-public-earning-participant-cli-v1.release.json`
- `WC_PUBLIC_EARNING_PARTICIPANT_CLI_RELEASE_PACK_V1_SHA256SUMS.txt`

## Local verification

```bash
python3 scripts/prove_wc_public_earning_participant_cli_release_pack_v1.py
python3 scripts/build_wc_public_earning_participant_cli_release_pack_v1.py \
  --source-commit "$(git rev-parse HEAD)" \
  --output-dir out
sha256sum --check --strict \
  out/WC_PUBLIC_EARNING_PARTICIPANT_CLI_RELEASE_PACK_V1_SHA256SUMS.txt
```

## Authority boundary

The packager reads the participant CLI and license and writes only the selected
output directory. It does not issue or consume a ticket, connect to a node or
coordinator, enable a coordinator or executor, execute work, award or write WC,
settle WC to VOID, access a wallet or signer, authorize or execute payment,
fulfill Buy VOID, deploy or restart a service, mutate runtime state, or move
funds.
