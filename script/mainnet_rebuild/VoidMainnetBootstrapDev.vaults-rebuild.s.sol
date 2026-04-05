// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {VoidToken} from "../contracts/VoidToken.sol";
import {VoidEmissionsController} from "../contracts/VoidEmissionsController.sol";
import {AdminGate} from "../contracts/AdminGate.sol";
import {ConfigGate} from "../contracts/ConfigGate.sol";
import {ValidatorSet} from "../contracts/mainnet/ValidatorSet.sol";
import {RewardEngine} from "../contracts/mainnet/RewardEngine.sol";
import {VoidTreasury} from "../contracts/mainnet/VoidTreasury.sol";
import {OpsTreasury} from "../contracts/mainnet/OpsTreasury.sol";
import {IVoidTokenLike} from "../contracts/mainnet/IVoidTokenLike.sol";
import {IValidatorSetLike} from "../contracts/mainnet/IValidatorSetLike.sol";

/// @dev Dev-sim bootstrap for VOID mainnet stack.
///      This version rebuilds the mainnet rehearsal flow around a selected premine vault
///      and a small active hot wallet on an ephemeral chain (or devnet fork).
///
///      It is **not** the real mainnet bootstrap. Later we will add a
///      VoidMainnetBootstrapMainnet that fills the same Roles struct from
///      env variables tied to LUKS/hardware keys.
contract VoidMainnetBootstrapDev is Script {
    uint256 internal constant VOID_CHAIN_ID = 2050;

    /// @dev Key dev addresses / roles we’ll use in simulations.
    struct Roles {
        address deployer;

        // top-level governance / admin
        address masterKey;        // AdminGate master key
        address configAdmin;      // ConfigGate admin (usually AdminGate-controlled)
        address validatorAdmin;   // ValidatorSet admin
        address emissionsAdmin;   // Emissions controller admin
        address rewardsAdmin;     // Reward engine admin

        // treasury / premine plumbing
        address selectedPremineVault; // currently selected offline premine vault for this rehearsal
        address activeHotWallet;      // small active wallet funded from selected vault
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

    /// @dev Handles deployed core contracts for logging / inspection.
    struct Deployed {
        VoidToken token;
        VoidEmissionsController emissions;
        AdminGate adminGate;
        ConfigGate configGate;
        ValidatorSet validatorSet;
        OpsTreasury opsTreasury;
        VoidTreasury voidTreasury;
        RewardEngine rewardEngine;
    }

    /// @dev Dev-only deterministic addresses. For real mainnet, you’ll
    ///      replace these with env-driven values: vm.envAddress("VOID_MASTER_KEY"), etc.
    function devRoles() internal pure returns (Roles memory r) {
        // These are all tiny hex literals; they’re just labels in dev-sim.
        r.deployer           = address(0xD00D);

        // governance
        r.masterKey          = address(0xA11CE);
        r.configAdmin        = address(0xA11CE);
        r.validatorAdmin     = address(0xBEEF);
        r.emissionsAdmin     = address(0xBEEF);
        r.rewardsAdmin       = address(0xBEEF);

        // premine / treasury plumbing
        r.selectedPremineVault = address(0xD00D);    // stand-in for currently selected premine vault in rehearsal
        r.activeHotWallet      = address(0xCA11);    // small active wallet funded from selected vault
        r.founderBeneficiary   = address(0xF00D);
        r.ecosystemReserve     = address(0xE550);
        r.communityPool        = address(0xC001);

        r.voidTreasuryAdmin  = address(0xDEAD);
        r.opsTreasuryAdmin   = address(0xC0FFEE);
        r.opsSpender         = address(0xCAFE);

        // AI infra admins (not wired yet, but reserved)
        r.agentAdmin         = address(0xA91317);
        r.datasetAdmin       = address(0xD47537);
        r.modelAdmin         = address(0xAD031);
        r.evalAdmin          = address(0xE7A11);

        // job / receipts infra
        r.jobQueueAdmin      = address(0xFABB1E);
        r.receiptsAdmin      = address(0xF00BA4);
    }

    /// @dev Core bootstrap logic: deploys mainnet-ish contracts and rehearses
    ///      explicit funding from a selected premine vault instead of moving the entire premine into one treasury.
    function _bootstrapCore(Roles memory R) internal returns (Deployed memory d) {
        console2.log("=== [core] deploy VoidToken ===");
        d.token = new VoidToken(R.selectedPremineVault);
        // Rehearsal model: premine initially lands in the currently selected premine vault.

        uint256 premine = d.token.balanceOf(R.selectedPremineVault);
        uint256 expectedPremine = d.token.PREMINE();
        require(premine == expectedPremine, "bootstrap: premine mismatch");

        // Rehearsal-only partial allocations:
        uint256 hotWalletFunding = 1_000_000 ether;
        uint256 treasuryFunding = 50_000_000 ether;
        require(hotWalletFunding + treasuryFunding < premine, "bootstrap: invalid rehearsal allocations");

        console2.log("VoidToken.totalSupply        :", d.token.totalSupply());
        console2.log("VoidToken.PREMINE            :", expectedPremine);
        console2.log("VoidToken.owner              :", d.token.owner());
        console2.log("selectedPremineVault         :", R.selectedPremineVault);
        console2.log("activeHotWallet              :", R.activeHotWallet);
        console2.log("rehearsal hotWalletFunding   :", hotWalletFunding);
        console2.log("rehearsal treasuryFunding    :", treasuryFunding);

        console2.log("=== [core] deploy OpsTreasury & VoidTreasury ===");
        d.opsTreasury = new OpsTreasury(
            IVoidTokenLike(address(d.token)),
            R.opsTreasuryAdmin
        );

        d.voidTreasury = new VoidTreasury(
            IVoidTokenLike(address(d.token)),
            address(d.opsTreasury),
            R.voidTreasuryAdmin
        );

        console2.log("OpsTreasury   :", address(d.opsTreasury));
        console2.log("VoidTreasury  :", address(d.voidTreasury));

        console2.log("=== [core] fund active hot wallet + treasury from selected premine vault ===");
        // Rehearsal model:
        //  - selected premine vault is the current cold source
        //  - active hot wallet receives only a small working balance
        //  - treasury receives an explicit partial allocation, not the full premine
        {
            bool okHot = d.token.transfer(R.activeHotWallet, hotWalletFunding);
            require(okHot, "bootstrap: transfer selected vault -> hot wallet failed");

            bool okTreasury = d.token.transfer(address(d.voidTreasury), treasuryFunding);
            require(okTreasury, "bootstrap: transfer selected vault -> treasury failed");
        }

        console2.log("balance[selectedPremineVault] :", d.token.balanceOf(R.selectedPremineVault));
        console2.log("balance[activeHotWallet]      :", d.token.balanceOf(R.activeHotWallet));
        console2.log("balance[VoidTreasury]         :", d.token.balanceOf(address(d.voidTreasury)));

        console2.log("=== [core] deploy AdminGate & ConfigGate ===");
        d.adminGate = new AdminGate(
            VOID_CHAIN_ID,
            R.masterKey,
            address(0) // UpdateGate to be wired later
        );

        d.configGate = new ConfigGate(
            VOID_CHAIN_ID,
            address(d.adminGate) // AdminGate controls config via forwarding
        );

        console2.log("AdminGate    :", address(d.adminGate));
        console2.log("ConfigGate   :", address(d.configGate));
        console2.log("AdminGate.masterKey :", d.adminGate.masterKey());
        console2.log("ConfigGate.adminGate:", d.configGate.adminGate());

        console2.log("=== [core] deploy ValidatorSet ===");
        d.validatorSet = new ValidatorSet(R.validatorAdmin);
        console2.log("ValidatorSet :", address(d.validatorSet));
        console2.log("Validator admin:", d.validatorSet.admin());

        console2.log("=== [core] deploy EmissionsController ===");
        d.emissions = new VoidEmissionsController(R.emissionsAdmin);
        console2.log("EmissionsController :", address(d.emissions));
        console2.log("Emissions admin     :", d.emissions.admin());
        console2.log("Emissions budget    :", d.emissions.EMISSIONS_BUDGET());

        console2.log("=== [core] deploy RewardEngine ===");
        d.rewardEngine = new RewardEngine(
            IVoidTokenLike(address(d.token)),
            IValidatorSetLike(address(d.validatorSet)),
            R.rewardsAdmin
        );

        console2.log("RewardEngine :", address(d.rewardEngine));
        console2.log("Reward admin :", d.rewardEngine.admin());
        console2.log("Reward budget:", d.rewardEngine.EMISSIONS_BUDGET());

        // NOTE: We are not yet wiring:
        //  - Era schedules into a router that calls VoidEmissionsController + RewardEngine
        //  - AdminGate.systemContracts keys
        //  - ConfigGate initial parameters
        //  - Agent/Dataset/Model/Job/Receipts infra
        //
        // Those will come next once the high-level wiring is locked in and we
        // add a dedicated mainnet bootstrap script that reads roles from env.

        return d;
    }

    function run() external virtual {
        Roles memory R = devRoles();

        console2.log("=== VOID mainnet dev bootstrap (dev-sim) ===");
        console2.log("deployer           :", R.deployer);
        console2.log("masterKey          :", R.masterKey);
        console2.log("configAdmin        :", R.configAdmin);
        console2.log("validatorAdmin     :", R.validatorAdmin);
        console2.log("emissionsAdmin     :", R.emissionsAdmin);
        console2.log("rewardsAdmin       :", R.rewardsAdmin);
        console2.log("selectedPremineVault :", R.selectedPremineVault);
        console2.log("activeHotWallet      :", R.activeHotWallet);
        console2.log("founderBeneficiary   :", R.founderBeneficiary);
        console2.log("ecosystemReserve     :", R.ecosystemReserve);
        console2.log("communityPool        :", R.communityPool);
        console2.log("voidTreasuryAdmin    :", R.voidTreasuryAdmin);
        console2.log("opsTreasuryAdmin     :", R.opsTreasuryAdmin);
        console2.log("opsSpender           :", R.opsSpender);
        console2.log("agentAdmin           :", R.agentAdmin);
        console2.log("datasetAdmin         :", R.datasetAdmin);
        console2.log("modelAdmin           :", R.modelAdmin);
        console2.log("evalAdmin            :", R.evalAdmin);
        console2.log("jobQueueAdmin        :", R.jobQueueAdmin);
        console2.log("receiptsAdmin        :", R.receiptsAdmin);

        // In dev we simulate that R.deployer controls the currently selected premine vault.
        vm.startBroadcast(R.deployer);

        Deployed memory d = _bootstrapCore(R);

        vm.stopBroadcast();

        console2.log("=== [summary] deployed core VOID stack (dev-sim) ===");
        console2.log("VoidToken         :", address(d.token));
        console2.log("VoidTreasury      :", address(d.voidTreasury));
        console2.log("OpsTreasury       :", address(d.opsTreasury));
        console2.log("AdminGate         :", address(d.adminGate));
        console2.log("ConfigGate        :", address(d.configGate));
        console2.log("ValidatorSet      :", address(d.validatorSet));
        console2.log("EmissionsControl  :", address(d.emissions));
        console2.log("RewardEngine      :", address(d.rewardEngine));
    }
}
