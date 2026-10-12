// SPDX-License-Identifier: VCL-1.0
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
} from "./chain2050_role_authority_record_v1.js";
import {
  admitParticipantRoleAuthorityV1,
  revalidateParticipantRoleAuthorityV1,
} from "./participant_role_authority_guard_v1.js";

export const VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_ADAPTER_V1 =
  Object.freeze({
    marker: "VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_ADAPTER_V1",
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    required_role: "AGENT" as const,
    wallet_private_key_access: false,
    signing_authority: false,
    work_credit_mutation_authority: false,
    validator_mutation_authority: false,
    chain2050_write_authority: false,
    money_movement_authority: false,
  });

export function createParticipantRoleAuthoritySessionAdapterV1({
  roleSource,
  expectedBindingDescriptorSha256,
}: {
  roleSource: unknown;
  expectedBindingDescriptorSha256: string;
}) {
  return Object.freeze({
    ...VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_ADAPTER_V1,
    admit(subject: unknown) {
      return admitParticipantRoleAuthorityV1(
        roleSource,
        expectedBindingDescriptorSha256,
        subject,
      );
    },
    revalidate(admission: unknown, subject: unknown) {
      return revalidateParticipantRoleAuthorityV1(
        roleSource,
        expectedBindingDescriptorSha256,
        admission,
        subject,
      );
    },
  });
}
