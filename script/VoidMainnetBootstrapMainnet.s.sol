// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "./VoidMainnetBootstrapDev.s.sol";

/// @notice Mainnet-oriented bootstrap script that reuses the dev _bootstrapCore
///         but loads all roles from environment variables.
/// For rehearsal we can point these env vars at dummy/dev keys; for REAL mainnet
/// they must be fresh, never-reused keys per the LUKS/hardware-key plan.
contract VoidMainnetBootstrapMainnet is VoidMainnetBootstrapDev {
    /// @notice Load mainnet roles from environment variables.
    /// All of these MUST be set in the environment / .env before running.
    function mainnetRolesFromEnv() internal view returns (Roles memory R) {
        // Core authority / premine path
        R.deployer           = vm.envAddress("VOID_MAINNET_DEPLOYER");
        R.masterKey          = vm.envAddress("VOID_MAINNET_MASTER_KEY");
        R.configAdmin        = vm.envAddress("VOID_MAINNET_CONFIG_ADMIN");
        R.validatorAdmin     = vm.envAddress("VOID_MAINNET_VALIDATOR_ADMIN");
        R.emissionsAdmin     = vm.envAddress("VOID_MAINNET_EMISSIONS_ADMIN");
        R.rewardsAdmin       = vm.envAddress("VOID_MAINNET_REWARDS_ADMIN");
        R.voidOwner          = vm.envAddress("VOID_MAINNET_VOID_OWNER");

        // Long-term allocations / beneficiaries
        R.founderBeneficiary = vm.envAddress("VOID_MAINNET_FOUNDER_BENEFICIARY");
        R.ecosystemReserve   = vm.envAddress("VOID_MAINNET_ECOSYSTEM_RESERVE");
        R.communityPool      = vm.envAddress("VOID_MAINNET_COMMUNITY_POOL");

        // Treasury / ops controllers
        R.voidTreasuryAdmin  = vm.envAddress("VOID_MAINNET_TREASURY_ADMIN");
        R.opsTreasuryAdmin   = vm.envAddress("VOID_MAINNET_OPS_TREASURY_ADMIN");
        R.opsSpender         = vm.envAddress("VOID_MAINNET_OPS_SPENDER");

        // AI / agent infra admins
        R.agentAdmin         = vm.envAddress("VOID_MAINNET_AGENT_ADMIN");
        R.datasetAdmin       = vm.envAddress("VOID_MAINNET_DATASET_ADMIN");
        R.modelAdmin         = vm.envAddress("VOID_MAINNET_MODEL_ADMIN");
        R.evalAdmin          = vm.envAddress("VOID_MAINNET_EVAL_ADMIN");
        R.jobQueueAdmin      = vm.envAddress("VOID_MAINNET_JOBQUEUE_ADMIN");
        R.receiptsAdmin      = vm.envAddress("VOID_MAINNET_RECEIPTS_ADMIN");
    }

    /// @notice Mainnet bootstrap entrypoint using env-provided roles.
    /// For rehearsals: call without --broadcast (or against an anvil/dev RPC).
    /// For real VOID mainnet: call with --broadcast and REAL mainnet keys.
    function run() external override {
        Roles memory R = mainnetRolesFromEnv();

        // Deployer key handles all constructor txs in _bootstrapCore.
        vm.startBroadcast(R.deployer);
        _bootstrapCore(R);
        vm.stopBroadcast();
    }
}
