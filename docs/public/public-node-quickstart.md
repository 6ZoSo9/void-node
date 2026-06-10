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
