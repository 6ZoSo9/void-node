# VOID Mainnet-0 Operator Contact Record

operator_label: zoso
operator_role: bootstrap operator / validator candidate operator
contact_mode: local operator only for Mainnet-0 bootstrap
public_contact_status: not published yet

## Current intent

This operator record is for the solo Mainnet-0 bootstrap phase.

The operator is responsible for:
- running the Precision and Alienware nodes,
- maintaining local monitoring,
- reviewing validator admission state,
- responding to checkpoint/finality incidents,
- collecting incident bundles before making strong canonical claims,
- keeping update safety, validator lifecycle, and readiness gates green.

## Admission status

This record does not admit the validator by itself.

Remaining admission blockers:
- final reward address must be selected,
- final consensus key must be selected,
- operator must explicitly mark checkpoint awareness as reviewed,
- operator must explicitly mark incident response readiness as reviewed.

## Safety posture

No private keys or seed phrases belong in this file.

