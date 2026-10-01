# Jobs submit E2E local-evidence binding v1

Marker: `VOID_JOBS_SUBMIT_E2E_LOCAL_EVIDENCE_BINDING_V1`

## Problem

`ops/jobs-submit-e2e-proof.sh` submitted to a default node URL on the retired
Alienware address while proving success by reading local files under
`$HOME/dev/void-node/data_a`.

That allowed the proof to mix a remote HTTP mutation with unrelated local job,
receipt, and Work Credit ledger evidence.

The remote two-box wrappers already SSH into the target machine and invoke this
script there, so the correct primitive is a **local proof on the machine whose
evidence files are being inspected**.

## Contract

The script now:

- starts with a valid shebang;
- defaults to `http://127.0.0.1:4100`;
- accepts only loopback HTTP origins with an explicit port;
- derives listener/PID observation from the selected local port instead of
  hard-coding `4100`; and
- continues to bind job, receipt, and WC-credit evidence to the local
  `DATA_DIR`.

To run the proof against another machine, SSH to that machine and execute the
proof there. Do not point this local-evidence proof at a remote HTTP origin.

## Mutation boundary

The operator script is intentionally mutation-capable: when explicitly run, it
submits one `datanet_publish` job and waits for the resulting receipt/WC credit.

The focused CI lane **does not run that operator script**. CI performs only:

- shell syntax validation; and
- static source-contract verification.

No job submission, Work Credit write, wallet/signer access, transaction
broadcast, validator mutation, or funds movement occurs in CI.
