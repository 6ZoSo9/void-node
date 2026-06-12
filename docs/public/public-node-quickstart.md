# VOID Public Node Quickstart <!-- VOID_PUBLIC_NODE_QUICKSTART_DOC_V1 -->

This page is the outside-tester quickstart for the VOID public node surface.

## Entry point

```text
/public-node
Machine-readable quickstart
/public-node/quickstart.json
Local start command
mkdir -p .runtime/public-node
if [ ! -f .runtime/public-node/node.key ]; then
  openssl genpkey -algorithm ED25519 -out .runtime/public-node/node.key
  chmod 600 .runtime/public-node/node.key
fi

npm run build

DATA_DIR=.runtime/public-node/data \
NODE_PRIVKEY_PATH=.runtime/public-node/node.key \
HTTP_PORT=4100 \
PORT=4100 \
VOID_HTTP_PORT=4100 \
HOST=127.0.0.1 \
P2P_PORT=4700 \
PUBLIC_NODE_EXTERNAL_BASE_URL=http://127.0.0.1:4100 \
npm start
Smoke check
PUBLIC_NODE_BASE=http://127.0.0.1:4100
for p in /public-node /public-node/quickstart.json /public-node/route-index.json /public-node/external-base-url.json /public-node/public-exposure-smoke-pack.json /proofs; do
  curl -fsS "$PUBLIC_NODE_BASE$p" >/dev/null && echo "ok $p"
done
Safety boundary

This quickstart checks public routes only.

It does not touch private APIs, wallet sends, swaps, Buy VOID fulfillment, validator mutation, money movement, or proof mutation.
## Proven live serving posture <!-- VOID_PUBLIC_NODE_QUICKSTART_LIVE_RUNTIME_QUARANTINE_POINTER_V1 -->

Current public-node Local Data Drop testing should use the quarantined live serving posture.

Checkpoint:

    08383516
    ckpt-public-node-live-runtime-quarantine-green-20260612-210820

Status pointer:

    4a49a8c9
    ckpt-public-node-live-runtime-quarantine-status-pointer-green-20260612-211330

Proof marker:

    VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_PROOF_V1_GREEN

Demo 002 public object proof:

    /public-node/local-data-drop/proof/264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871.json

This means the tester should see public HTTP routes stay responsive while the operator keeps hot runtime wrapper/txroot/saveblock/forensics/drift families quarantined and keeps legacy `void-node.service` inactive/disabled.
