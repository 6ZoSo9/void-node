# Buy VOID Docker npm CI only — unaccepted build-hardening candidate

## Exact narrow source change

This Draft is stacked on [integration #2675](https://github.com/6ZoSo9/void-node/pull/2675)
at exact parent `4b7466b9f34bac8f9766f708ddf8e24c2bf50331`.
The reviewed Dockerfile previously had
`RUN npm ci || yarn || pnpm i`.
That expression is not a single-lockfile install guarantee: if
`npm ci` fails, the build continues to an alternate package manager.
Failure may arise from a broken lock, script execution, dependency or network
error; a successful fallback can build a different dependency tree while
claiming the same reviewed source.

The **only Dockerfile change** is:
```diff
-RUN npm ci || yarn || pnpm i
+RUN npm ci
```

The npm CI **successful path** is unchanged. Importantly, this does not
disable npm package lifecycle scripts or resolve all supply-chain risk. The
Node Docker base `node:24-alpine` is a mutable tag, and the build also
depends on registry availability and dependency tarball integrity. Additional
base-image, package manager and dependency provenance gates remain required
before a durable production image identity can be approved.

## Source proof and stopped-image verification

`scripts/prove_buy_void_docker_npm_ci_only_v1.mjs` verifies:
- exact original integration Dockerfile Git blob
  `15375dfb34bc457ac57865ae07642b5602f9e958`;
- exact candidate blob
  `2acd9bcf0416eeb0f9fd72c1a556696863ff1607`;
- exact unchanged Dockerfile bytes except this single install line;
- exact order of lockfile COPY, `npm ci`, source COPY, `npm run build`,
  and runtime stage;
- exactly two `RUN` directives, with no Yarn/PNPM installer;
- unchanged explicit packaged saga source
  `/app/tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs`.

Inert memory-only adversaries reject `npm ci || yarn`, `npm ci || true`,
`npm ci || npm install`, semicolon fallback, PNPM alternative, plain
`npm install`, extra installer `RUN`, and omitted saga packaging.

The exact-head Node 22/24/26 focused workflow executes those proofs and
compares evidence byte-for-byte. A separate GitHub-hosted job builds a
candidate image using the new Dockerfile, creates but **never starts** a
container, and copies the saga file out for byte comparison against
the same reviewed checkout. This is not a registry push or live deployment;
no private operator/custody/transaction state is involved.

## Trust and deployment HOLDs

**This Dockerfile has a new Git blob**, which means existing historical
enforcement/artifact and image attestations referencing the old Dockerfile
are expected to fail closed. Do not re-pin old source or image manifests just
to force green. An independently reviewed successor must bind the new
Dockerfile, source tree, installed dependencies, full runtime tool closure,
Node base-image identity and final image/layers before any production mount.

This Draft is **NOT Ready** and does not authorize merge, signer access,
payments, allocation, presale, or WC/VOID market opening.

No Precision/Nimo/Xiphos service, customer ledger, private key, wallet,
transaction, treasury or funds activity was performed by this source-only
proposal. **PROTECT THE CORE.**
