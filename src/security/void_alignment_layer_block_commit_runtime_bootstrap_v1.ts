import {
  installVoidAlignmentLayerBlockCommitRuntimeFromEnvironmentV1,
} from "./void_alignment_layer_block_commit_runtime_v1.js";

export const VOID_AL_BLOCK_COMMIT_RUNTIME_BOOTSTRAP_V1 =
  "VOID_AL_BLOCK_COMMIT_RUNTIME_BOOTSTRAP_V1" as const;

/**
 * Explicit runtime bootstrap only.
 *
 * This module is intentionally not imported by the normal node entry point.
 * A later reviewed activation lane may preload the compiled module with Node's
 * --import option. Until then, merging this source does not change startup.
 */
export const VOID_AL_BLOCK_COMMIT_RUNTIME_BOOTSTRAP_STATUS_V1 =
  installVoidAlignmentLayerBlockCommitRuntimeFromEnvironmentV1();
