import {
  blockProposerAuthorityRequiredFromEnv,
} from "../chain/block.js";
import {
  VOID_AL_BLOCK_COMMIT_RUNTIME_ENABLE_ENV_V1,
} from "./void_alignment_layer_block_commit_runtime_v1.js";
import {
  installVoidAlignmentLayerBlockCommitDurableRuntimeFromEnvironmentV1,
} from "./void_alignment_layer_block_commit_durable_runtime_v1.js";

export const VOID_AL_BLOCK_COMMIT_RUNTIME_BOOTSTRAP_V1 =
  "VOID_AL_BLOCK_COMMIT_RUNTIME_BOOTSTRAP_V1" as const;
export const VOID_AL_BLOCK_COMMIT_PROPOSER_AUTHORITY_REQUIRED_V1 =
  "VOID_AL_BLOCK_COMMIT_PROPOSER_AUTHORITY_REQUIRED_V1" as const;

/**
 * Explicit runtime bootstrap only.
 *
 * This module is intentionally not imported by the normal node entry point.
 * A later reviewed activation lane may preload the compiled module with Node's
 * --import option. Until then, merging this source does not change startup.
 *
 * Production activation must not turn AL on while proposer-authority policy is
 * in its backward-compatible default-off mode. Signature self-authentication
 * alone is integrity evidence, not authorization.
 *
 * The durable runtime installer additionally requires a pre-initialized private
 * durable-safe-mode root. Missing, malformed, crash-locked, or latched state
 * fails closed before mutation authority becomes usable.
 */
const requested = String(
  process.env[VOID_AL_BLOCK_COMMIT_RUNTIME_ENABLE_ENV_V1] ?? "",
).trim();
if (
  requested === "1" &&
  !blockProposerAuthorityRequiredFromEnv(process.env)
) {
  throw new Error(VOID_AL_BLOCK_COMMIT_PROPOSER_AUTHORITY_REQUIRED_V1);
}

export const VOID_AL_BLOCK_COMMIT_RUNTIME_BOOTSTRAP_STATUS_V1 =
  installVoidAlignmentLayerBlockCommitDurableRuntimeFromEnvironmentV1();
