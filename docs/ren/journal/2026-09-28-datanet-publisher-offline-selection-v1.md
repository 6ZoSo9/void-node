# DataNet publisher offline selection v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_SELECTION_JOURNAL_V1`

On 2026-09-28, Nimo completed the dedicated DataNet publisher key ceremony while
offline.

Public publisher address:

`0x926aa1d35824e6957fae1a05510e6cc6a0d57be6`

Address fingerprint SHA-256:

`cfeeeb9e2ebaf80e6637aaa706a89ed1ab9d5f2c70b6eb5ed9ba2fe12e240214`

Public ceremony receipt SHA-256:

`119d634591a324d6b5cd4736ff97d21ad527a69ad6f4a6982fc6ebd360ce701a`

The private key was not printed or committed. The ceremony verified an encrypted
backup on `VOID_AUTHORITY`.

The selection is deliberately narrow:

- fresh dedicated publisher: yes;
- legacy treasury reuse: no;
- deployer selection implied: no;
- deployment authorized: no;
- transaction construction/signing/broadcast: no;
- Chain-2050 write: no; and
- state-root anchor readiness: still false.

The next gate is explicit reviewed registry-deployer selection before any
source-only unsigned deployment plan is constructed.

Memory for context. Repo for truth. Brood journal for continuity.
