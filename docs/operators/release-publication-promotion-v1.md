# Operator Runbook: VOID Release Publication and Promotion v1

`VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_OPERATOR_V1`

## One-time GitHub configuration

1. Enable immutable releases for `6ZoSo9/void-node`.
2. Create protected environment `void-release-publication` with required
   reviewers and prevent self-review where available.
3. Create protected environment `void-release-canary`.
4. Add `VOID_RELEASE_ADMIN_TOKEN` to `void-release-publication`. It must be able
   to read the immutable-release setting and write repository contents/releases.
5. Keep `main` protected; channel state is published only through pull requests.

## Publish an immutable release

Use the exact package version and exact `origin/main` commit:

```bash
VERSION="$(node -p 'require("./package.json").version')"
COMMIT="$(git rev-parse origin/main)"
TAG="release-v${VERSION}"

bash ops/release/void-release-dispatch-v1.sh publish \
  --version "$VERSION" \
  --commit "$COMMIT" \
  --confirm "PUBLISH VOID RELEASE ${TAG} AT ${COMMIT}"
```

The protected workflow builds, attests, tags, publishes, verifies immutability,
verifies every release asset, and emits:

```text
publication-packet-v1.json
publication-receipt-v1.json
PUBLICATION-SHA256SUMS
```

The dispatcher never publishes directly.

## Run the no-deployment canary

Download the publication workflow artifact, then dispatch:

```bash
bash ops/release/void-release-dispatch-v1.sh canary \
  --tag "$TAG" \
  --commit "$COMMIT" \
  --publication-receipt ./publication-receipt-v1.json
```

Download `canary-receipt-v1.json` from the resulting workflow artifact.

## Create the promotion ledger

```bash
STATE="$HOME/.local/state/void-release-promotion-v1"

node tools/void-release-promotion-v1.mjs candidate \
  --state-dir "$STATE" \
  --packet ./publication-packet-v1.json \
  --publication-receipt ./publication-receipt-v1.json \
  --confirm "PROMOTE ${TAG} TO CANDIDATE"

node tools/void-release-promotion-v1.mjs stable \
  --state-dir "$STATE" \
  --packet ./publication-packet-v1.json \
  --publication-receipt ./publication-receipt-v1.json \
  --canary-receipt ./canary-receipt-v1.json \
  --confirm "PROMOTE ${TAG} TO STABLE"

node tools/void-release-promotion-v1.mjs verify --state-dir "$STATE"
```

## Publish channel state through a PR

```bash
TIP="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["history_tip_sha256"])' \
  "$STATE/promotion-ledger-v1.json")"

python3 ops/release/void-release-promotion-pr-v1.py \
  --repo "$HOME/dev/void-node" \
  --state-dir "$STATE" \
  --action stable \
  --confirm "PUBLISH VOID RELEASE CHANNEL STATE ${TIP}" \
  --merge
```

The PR helper is exact-head pinned and recognizes the GitHub edge case where an
outer check remains pending after the underlying Actions job completed green.

## Freeze and recover

```bash
node tools/void-release-promotion-v1.mjs freeze \
  --state-dir "$STATE" --repository 6ZoSo9/void-node \
  --reason "incident review" \
  --confirm "FREEZE VOID RELEASE CHANNELS"

node tools/void-release-promotion-v1.mjs rollback \
  --state-dir "$STATE" --release-tag release-vPREVIOUS \
  --reason "emergency rollback" \
  --confirm "ROLL BACK VOID STABLE TO release-vPREVIOUS"
```

Revoking the current stable release requires `--rollback-to`:

```bash
node tools/void-release-promotion-v1.mjs revoke \
  --state-dir "$STATE" --release-tag "$TAG" \
  --reason "confirmed release defect" \
  --rollback-to release-vPREVIOUS \
  --confirm "REVOKE ${TAG}"
```

Every action requires an exact confirmation phrase. There is no generic `--yes`
for publication, promotion, freeze, revocation, or rollback.

## Qualification inputs for stable promotion

`VOID_PUBLIC_RELEASE_QUALIFICATION_CANARY_WALL_V1`

Supply both `--qualification-receipt` and `--qualification-approval`. Stable
promotion refuses missing, mismatched, failed, or non-independent qualification
artifacts.
