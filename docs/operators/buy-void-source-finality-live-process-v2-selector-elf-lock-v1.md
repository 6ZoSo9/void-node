# Buy VOID V2 selector ELF lock

The exact selector ELF candidate from #2967 is accepted for review identity:

- selector source Git blob: `b7aad6ecea7afa5b7f931b50b4b463e992b19748`
- ELF SHA-256: `048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232`
- ELF bytes: `26680`
- candidate run: `38622183894`
- three independent Ubuntu 24.04 builds: byte-identical

The lock also pins the compiler and strip executable digests plus deterministic
compile flags. Node 22/24/26 rederive the exact same accepted ELF.

Acceptance is identity-only. Installation, V2 receipt publication, V7 production
authority, presale activation and funds movement remain false.
