# Precision web recovery — reviewed current gateway V2 (source-only)

## Purpose and exact source lineage

The archived **Precision web recovery V1** review is pinned to a historic
`ops/public/void-public-app-composition-gateway-v1.mjs` Git blob
`850419187facd4a90feeb15aa676b03d785e44b5`. That contract MUST
reject newer gateway source; overwriting its blob, source contract, proofs
or workflow to turn a check green would falsify historical acceptance.

This additive **V2** source-generation candidate is stacked on
[public Buy VOID checkout edge Draft #2823](https://github.com/6ZoSo9/void-node/pull/2823)
at exact inspected parent commit
`2f5a8d98ab3cefafe04286b271552b501dd96704`.
It binds the newer checked gateway Git blob
`0f7b7ccec7aecbcfe6a48df1cd28063dc6550131`.
The remaining seven reviewed public seed, runner, systemd, frontdoor and
HTML source blobs are kept as in V1. The immutable plan still requires a
clean checkout, a bounded reviewed absolute Git executable with hostile
repository and config overrides ignored, exact HEAD/tree/source-object
reads, and source generation revalidation before returning a plan.

The V2 has its **own marker, source file, plan/evidence IDs, exact V2
generation and proof**. Frozen V1 remains byte-for-byte unchanged:
- `tools/void-precision-web-recovery-evidence-v1.mjs`: Git blob
  `fca92451258bfd5446cb675530dbdb70b6ecf5df`.
- `scripts/prove_void_precision_web_recovery_evidence_v1.mjs`: Git blob
  `c6554e860ead91042170df22d4aae49ceb2eabc0`.

## What runs in hosted CI

`.github/workflows/void-precision-web-recovery-current-gateway-v2.yml`
checks out the exact PR head without persistently stored GitHub credentials
and requires the exact new gateway plus frozen historic tool/proof bytes.
On supported Node 22, 24, and 26, the new proof replays the complete
source-plan, hostile Git override, identity, topology and synthetic
host-observation contract checks, and **requires the original frozen V1
tool to reject this gateway with a source-blob mismatch**. It also runs
the checkout edge's actual isolated-HTTP upstream proof, which has no
access to real buyer records or Precision services.

Three raw proof receipts must be byte-identical, not merely share a
success label. V2 closes a *source review and synthetic compatibility*
gap only. It does NOT turn any V1 historical failure into success.

## Boundaries and independent next gate

This candidate DOES NOT inspect Precision's running processes, accept
the current installed service, prove systemd unit or Tailscale/Funnel
cutover, establish actual wallet/buyer payment intake, assert storage
directory binding, access credentials, or sign/broadcast a transaction.
It is **not** an executable host remediation/activation packet. It
does not close the separate historical Precision host-observer V1
source-generation rejection; that requires an independently reviewed,
additive current-version host-observation protocol and operator-host
evidence. A newer #2823 checkout gateway source or merged #2811 writer
also requires explicit V2 requalification, not silent digest replacement.

**No Ready, merge, deployment, service restart, wallet, signer, key,
customer ledger, Work Credits, coupled presale/WC market activation or
funds movement is authorized. PROTECT THE CORE.**
