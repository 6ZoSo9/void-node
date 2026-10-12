# DataNet registry deployer offline selection v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_REGISTRY_DEPLOYER_SELECTION_JOURNAL_V1`

On 2026-09-28, Nimo completed a second offline ceremony to create a dedicated
registry deployer separate from the already-selected DataNet publisher.

Public deployer:

`0x6c93ddfcc4116574fe66d63c1c67daedc0070dbb`

Address fingerprint SHA-256:

`bbf87ccd6c56e68fc486c310a12074d51a23af79df8e9c4727fe156099b864d1`

Public ceremony receipt SHA-256:

`81a43d3c245b5badfa975c7ab998094359f62872600d533453df6cab8ed68cb3`

Canonical publisher remains:

`0x926aa1d35824e6957fae1a05510e6cc6a0d57be6`

The two roles are deliberately distinct. The deployer does not reuse legacy
treasury, role-authority deployer, or presale deployer material.

The private deployer key was not printed or committed and its encrypted backup
was verified on `VOID_AUTHORITY`.

Current boundary:

- deployer selected: yes;
- live deployer nonce observed: no;
- deployer native balance observed: no;
- predicted registry CREATE address resolved: no;
- predicted address vacancy observed: no;
- deployer funding authorized: no;
- deployment authorized: no;
- transaction signing/broadcast: no; and
- Chain-2050 write: no.

Next gate: fresh read-only Precision deployer-state and CREATE-address
resolution.

Memory for context. Repo for truth. Brood journal for continuity.
