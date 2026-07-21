# VOID Release Update Channel v1 — Operator Runbook

marker: `VOID_PUBLIC_RELEASE_UPDATE_CHANNEL_OPERATOR_V1`

## Build the channel with a tagged release

```bash
node tools/build-public-release-v1.mjs \
  --out dist-release \
  --version "$(node -p 'require("./package.json").version')"

(
  cd dist-release
  sha256sum --check --strict SHA256SUMS
)

TAG="release-v$(node -p 'require("./package.json").version')"
node tools/build-public-release-channel-v1.mjs \
  --manifest dist-release/void-node-release-manifest.json \
  --checksums dist-release/SHA256SUMS \
  --base-url "https://github.com/6ZoSo9/void-node/releases/download/$TAG" \
  --repository 6ZoSo9/void-node \
  --release-tag "$TAG" \
  --channel stable \
  --out dist-release/stable-v1.json
```

## Release gate

```bash
make public-release-distribution-v1-proof
make public-release-update-channel-v1-proof
```

The tag workflow publishes the stable channel beside the release assets. The
channel timestamp derives from deterministic release metadata rather than wall
clock time.

## Recovery

A failed health gate automatically restores the previous release. Operators
may also run `void-node update rollback`. Do not delete `previous` until the new
release has remained healthy through the intended observation window.

## Explicit non-scope

This wall does not publish a tag from the controller, deploy or restart a live
node, generate private keys, alter wallet or ledger state, fulfill Buy VOID,
admit validators, move treasury assets, or transfer authority.
