// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

// NOTE: When you're ready to actually wire deployments, uncomment the imports you need
// and line up constructor args with your real contracts.
//
// import {VoidToken} from "../contracts/VoidToken.sol";
// import {VoidPremineVault} from "../contracts/VoidPremineVault.sol";
// import {VoidFounderTrustVesting} from "../contracts/VoidFounderTrustVesting.sol";
// import {AdminGate} from "../contracts/AdminGate.sol";
// import {ConfigGate} from "../contracts/ConfigGate.sol";
// import {VoidEmissionsController} from "../contracts/VoidEmissionsController.sol";
// import {VoidTreasury} from "../contracts/mainnet/VoidTreasury.sol";
// import {OpsTreasury} from "../contracts/mainnet/OpsTreasury.sol";
// import {RewardEngine} from "../contracts/mainnet/RewardEngine.sol";
// import {ValidatorSet} from "../contracts/mainnet/ValidatorSet.sol";
// import {JobQueue} from "../contracts/JobQueue.sol";
// import {ReceiptRegistry} from "../contracts/ReceiptRegistry.sol";
// import {AgentRegistry} from "../contracts/AgentRegistry.sol";
// import {DatasetRegistry} from "../contracts/DatasetRegistry.sol";
// import {ModelRegistry} from "../contracts/ModelRegistry.sol";
// import {ModelEvalRegistry} from "../contracts/ModelEvalRegistry.sol";
// import {JobReceipts} from "../contracts/JobReceipts.sol";

/// @dev Dev-sim bootstrap for VOID mainnet stack.
///      This does NOT deploy anything yet; it gives you a single place to
///      define dev addresses and the call-order. You fill in the new Foo(...)
///      lines once you line up constructor signatures.
contract VoidMainnetBootstrapDev is Script {
    /// @dev Key dev addresses / roles we’ll use in simulations.
    struct DevRoles {
        address deployer;

        // top-level governance / admin
        address masterKey;        // AdminGate master key
        address configAdmin;      // ConfigGate admin (usually AdminGate-controlled)
        address validatorAdmin;   // ValidatorSet admin
        address emissionsAdmin;   // Emissions controller admin
        address rewardsAdmin;     // Reward engine admin

        // treasury / premine plumbing
        address voidOwner;        // initial VoidToken owner (can be VoidTreasury in dev)
        address founderBeneficiary;
        address ecosystemReserve;
        address communityPool;

        address voidTreasuryAdmin;
        address opsTreasuryAdmin;
        address opsSpender;       // who calls OpsTreasury.spend in dev

        // agents / datasets / models
        address agentAdmin;
        address datasetAdmin;
        address modelAdmin;
        address evalAdmin;

        // job/receipt infra
        address jobQueueAdmin;
        address receiptsAdmin;
    }

    /// @dev Dev-only deterministic addresses. For real mainnet, you’ll
    ///      replace these with env-driven values: vm.envAddress("VOID_MASTER_KEY"), etc.
    function devRoles() internal pure returns (DevRoles memory r) {
        // These are all tiny hex literals; they’re just labels in dev-sim.
        r.deployer           = address(0xD00D);
        r.masterKey          = address(0xA11CE);
        r.configAdmin        = address(0xA11CE);
        r.validatorAdmin     = address(0xBEEF);
        r.emissionsAdmin     = address(0xBEEF);
        r.rewardsAdmin       = address(0xBEEF);

        r.voidOwner          = address(0xD00D);
        r.founderBeneficiary = address(0xF00D);
        r.ecosystemReserve   = address(0xE550);
        r.communityPool      = address(0xC001);

        r.voidTreasuryAdmin  = address(0xDEAD);
        r.opsTreasuryAdmin   = address(0xC0FFEE);
        r.opsSpender         = address(0xCAFE);

        r.agentAdmin         = address(0xA91317);
        r.datasetAdmin       = address(0xD47537);
        r.modelAdmin         = address(0xAD031); // <-- replace with a real hex before using
        r.evalAdmin          = address(0xE7A11);

        r.jobQueueAdmin      = address(0xFABB1E);
        r.receiptsAdmin      = address(0xF00BA4);
    }

    function run() external {
        DevRoles memory R = devRoles();

        console2.log("=== VOID mainnet dev bootstrap (skeleton) ===");
        console2.log("deployer           :", R.deployer);
        console2.log("masterKey          :", R.masterKey);
        console2.log("configAdmin        :", R.configAdmin);
        console2.log("validatorAdmin     :", R.validatorAdmin);
        console2.log("emissionsAdmin     :", R.emissionsAdmin);
        console2.log("rewardsAdmin       :", R.rewardsAdmin);
        console2.log("voidOwner          :", R.voidOwner);
        console2.log("founderBeneficiary :", R.founderBeneficiary);
        console2.log("ecosystemReserve   :", R.ecosystemReserve);
        console2.log("communityPool      :", R.communityPool);
        console2.log("voidTreasuryAdmin  :", R.voidTreasuryAdmin);
        console2.log("opsTreasuryAdmin   :", R.opsTreasuryAdmin);
        console2.log("opsSpender         :", R.opsSpender);
        console2.log("agentAdmin         :", R.agentAdmin);
        console2.log("datasetAdmin       :", R.datasetAdmin);
        console2.log("modelAdmin         :", R.modelAdmin);
        console2.log("evalAdmin          :", R.evalAdmin);
        console2.log("jobQueueAdmin      :", R.jobQueueAdmin);
        console2.log("receiptsAdmin      :", R.receiptsAdmin);

        // Once you’re ready to actually simulate a deploy, you’ll do:
        //
        // vm.startBroadcast(R.deployer);
        //
        // 1) Core token + premine plumbing.
        //
        //     // TODO: line this up with your real constructor
        //     // VoidToken token = new VoidToken(R.voidOwner);
        //     // VoidFounderTrustVesting trust = new VoidFounderTrustVesting(
        //     //     token,
        //     //     R.gateAddress,
        //     //     R.founderBeneficiary,
        //     //     startTimestamp,
        //     //     ...
        //     // );
        //     // VoidPremineVault vault = new VoidPremineVault(
        //     //     token,
        //     //     R.founderTrustAddress,
        //     //     R.ecosystemReserve,
        //     //     R.communityPool,
        //     //     R.gateAddress
        //     // );
        //
        // 2) Governance / gates.
        //
        //     // AdminGate adminGate = new AdminGate(R.masterKey, 2050);
        //     // ConfigGate configGate = new ConfigGate(address(adminGate), 2050);
        //     // ValidatorSet validatorSet = new ValidatorSet(2050, R.masterKey, R.validatorAdmin);
        //
        // 3) Emissions + reward plumbing.
        //
        //     // VoidEmissionsController emissions = new VoidEmissionsController(
        //     //     address(token),
        //     //     R.emissionsAdmin,
        //     //     /* schedule params consistent with TokenomicsSpec.t.sol */
        //     // );
        //     // OpsTreasury opsTreasury = new OpsTreasury(
        //     //     IVoidTokenLike(address(token)),
        //     //     R.opsTreasuryAdmin
        //     // );
        //     // VoidTreasury voidTreasury = new VoidTreasury(
        //     //     IVoidTokenLike(address(token)),
        //     //     opsTreasury,
        //     //     R.voidTreasuryAdmin
        //     // );
        //     // RewardEngine rewardEngine = new RewardEngine(
        //     //     IVoidTokenLike(address(token)),
        //     //     IValidatorSetLike(address(validatorSet)),
        //     //     R.rewardsAdmin
        //     // );
        //
        // 4) Agent / dataset / model infra.
        //
        //     // AgentRegistry agentReg = new AgentRegistry(R.agentAdmin);
        //     // DatasetRegistry datasetReg = new DatasetRegistry(R.datasetAdmin, R.masterKey);
        //     // ModelRegistry modelReg = new ModelRegistry(R.modelAdmin, R.masterKey);
        //     // ModelEvalRegistry evalReg = new ModelEvalRegistry(R.evalAdmin);
        //
        // 5) Job / receipts infra.
        //
        //     // JobQueue jobQueue = new JobQueue(R.jobQueueAdmin);
        //     // ReceiptRegistry receipts = new ReceiptRegistry(R.receiptsAdmin);
        //     // JobReceipts jobReceipts = new JobReceipts(R.receiptsAdmin);
        //
        // vm.stopBroadcast();
        //
        // You’ll fill these out by looking at each contract’s actual constructor
        // and tests in this repo, then keep this script as the canonical
        // mainnet bootstrap plan (dev-sim version).

        // For now we don’t broadcast so the script is a pure "plan printer".
        // This keeps forge compile + script dry-runs green until you’re ready
        // to hook real deployments.
    }
}
