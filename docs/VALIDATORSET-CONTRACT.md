
ValidatorSet MUST NOT:

- Implement full consensus or fork choice logic.
- Directly custody stake funds (keep that in a separate staking/vault contract).
- Implement slashing or reward distribution (those belong in higher-level economics modules).
