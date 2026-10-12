# 2026-09-25 — Launch-State Refresh V1

Marker: `VOID_REN_LAUNCH_STATE_REFRESH_V1`

## Material changes

Since the continuity bootstrap, four merged changes materially altered the handoff state:

- PR #1820 merged the direct IPv4 + Tor v3 authenticated P2P introduction path with exact node-identity binding and N-1 acceptance evidence for the public-bootstrap child.
- PR #1821 merged the policy that production WC/VOID and the public VOID presale must open in the same launch ceremony; neither may open alone.
- PR #1823 merged the fail-closed production WC/VOID readiness classifier and candidate. The candidate remains `HOLD` on `main`.
- PRs #1832 and #1833 refreshed the public documentation, release truth, whitepaper, and repository working agreement so current repository guidance matches those newer network/economic invariants.

Main observed for this journal entry: `d4a8f43462be30699678a2da710c427e38768655`.

## Network truth

Issue #1005 remains open.

The highest repository truth recorded here is **merged public-bootstrap source/evidence for the direct IPv4 + Tor introduction classes and their N-1 child acceptance**. That is not a blanket declaration that every remaining #1005 acceptance condition is closed.

Any claim that public bootstrap is fully accepted must still come from fresh live issue, runtime, and outside-network evidence.

## Economic truth

Issue #1822 remains open as the production WC/VOID implementation blocker.

Merged policy now requires:

- coupled presale + WC/VOID public opening;
- 10,000,000 VOID / 0 WC opening policy;
- market-determined WC/VOID pricing;
- no fixed WC→VOID redemption;
- BTC/VOID and ETH/VOID only after the presale under their own gates.

PR #1823 proves the fail-closed readiness boundary, not production activation.

PRs #1824 through #1834 form a stacked draft preparation/review line above the merged baseline. PR #1834 records explicit approval of exact market-vault role bindings, but it remains open/draft. The draft state must not be rewritten in continuity as merged, deployed, funded, or active.

## Remaining authority gates

The continuity update does **not** authorize or imply:

- deployer selection or nonce/fee observation;
- transaction construction, signing, or broadcast;
- Chain-2050 deployment or other chain mutation;
- WC/VOID inventory funding;
- public presale or market activation;
- treasury/liquidity movement or funds movement.

Those gates remain separate and must be established by their own exact live evidence and authorization.

## Release and documentation truth

PR #1832 merged the September 25 public-state refresh, including `RELEASES.md` and the whitepaper.

At that merged state, package version `0.1.0` exists, but the official `release-v0.1.0` tag and an official stable VOID node GitHub Release were not published. Public documentation is descriptive evidence, not operational proof.

## Continuity consequence

Future Ren sessions should start from the refreshed current-state file, then resolve live GitHub/runtime truth before acting.

The journal remains a bounded continuity cache:

`newest ZoSo instruction -> live repository/runtime/external evidence -> live coordination -> current-state cache -> historical journal`.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
