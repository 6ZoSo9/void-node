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

contract VoidMainnetBootstrapDevPlan is Script {
    uint256 internal constant VOID_CHAIN_ID = 2050;

    struct Roles {
        address deployer;
        address treasuryAdmin;
        address opsTreasuryAdmin;
        address validatorAdmin;
        address adminGateOwner;
        address updateGateOwner;
        address configGateOwner;
        address treasuryOwner;
        address opsTreasuryOwner;
        address rewardEngineOwner;
        address validatorSetOwner;

        // Derived for dev-sim (we alias emissions/rewards admin to rewardEngineOwner).
        address emissionsAdmin;
        address rewardsAdmin;
    }

    struct Validator0 {
        address reward;
        bytes32 consensusKey;
        uint256 stakeVOID;
    }

    struct Config {
        uint256 chainId;
        Roles roles;
        Validator0 validator0;
    }

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

    function loadConfig(string memory path) internal view returns (Config memory cfg) {
        string memory json = vm.readFile(path);

        cfg.chainId = vm.parseJsonUint(json, ".chainId");

        cfg.roles.deployer          = vm.parseJsonAddress(json, ".roles.deployer");
        cfg.roles.treasuryAdmin     = vm.parseJsonAddress(json, ".roles.treasuryAdmin");
        cfg.roles.opsTreasuryAdmin  = vm.parseJsonAddress(json, ".roles.opsTreasuryAdmin");
        cfg.roles.validatorAdmin    = vm.parseJsonAddress(json, ".roles.validatorAdmin");
        cfg.roles.adminGateOwner    = vm.parseJsonAddress(json, ".roles.adminGateOwner");
        cfg.roles.updateGateOwner   = vm.parseJsonAddress(json, ".roles.updateGateOwner");
        cfg.roles.configGateOwner   = vm.parseJsonAddress(json, ".roles.configGateOwner");
        cfg.roles.treasuryOwner     = vm.parseJsonAddress(json, ".roles.treasuryOwner");
        cfg.roles.opsTreasuryOwner  = vm.parseJsonAddress(json, ".roles.opsTreasuryOwner");
        cfg.roles.rewardEngineOwner = vm.parseJsonAddress(json, ".roles.rewardEngineOwner");
        cfg.roles.validatorSetOwner = vm.parseJsonAddress(json, ".roles.validatorSetOwner");

        // For dev we simply alias emissions/rewards admin to rewardEngineOwner.
        cfg.roles.emissionsAdmin = cfg.roles.rewardEngineOwner;
        cfg.roles.rewardsAdmin   = cfg.roles.rewardEngineOwner;

        cfg.validator0.reward       = vm.parseJsonAddress(json, ".validator0.reward");
        cfg.validator0.consensusKey = vm.parseJsonBytes32(json, ".validator0.consensusKey");
        cfg.validator0.stakeVOID    = vm.parseJsonUint(json, ".validator0.stakeVOID");
    }

    function _bootstrapCore(Config memory cfg, address premineRecipient) internal returns (Deployed memory d) {
        console2.log("=== [core] deploy VoidToken ===");
        d.token = new VoidToken(premineRecipient);

        uint256 premine = d.token.balanceOf(premineRecipient);
        uint256 expectedPremine = d.token.PREMINE();
        require(premine == expectedPremine, "dev-plan: premine mismatch");

        console2.log("VoidToken.totalSupply :", d.token.totalSupply());
        console2.log("VoidToken.PREMINE     :", expectedPremine);
        console2.log("VoidToken.owner       :", d.token.owner());
        console2.log("VoidToken premine to  :", premineRecipient);

        console2.log("=== [core] deploy OpsTreasury & VoidTreasury ===");
        d.opsTreasury = new OpsTreasury(
            IVoidTokenLike(address(d.token)),
            cfg.roles.opsTreasuryAdmin
        );

        d.voidTreasury = new VoidTreasury(
            IVoidTokenLike(address(d.token)),
            address(d.opsTreasury),
            cfg.roles.treasuryAdmin
        );

        console2.log("OpsTreasury   :", address(d.opsTreasury));
        console2.log("VoidTreasury  :", address(d.voidTreasury));

        console2.log("=== [core] move premine into VoidTreasury ===");
        {
            bool ok = d.token.transfer(address(d.voidTreasury), premine);
            require(ok, "dev-plan: transfer premine -> treasury failed");
        }

        console2.log("balance[premineRecipient] :", d.token.balanceOf(premineRecipient));
        console2.log("balance[VoidTreasury]     :", d.token.balanceOf(address(d.voidTreasury)));

        console2.log("=== [core] deploy AdminGate & ConfigGate ===");
        d.adminGate = new AdminGate(
            VOID_CHAIN_ID,
            cfg.roles.adminGateOwner,
            address(0) // UpdateGate wired later via governance
        );

        d.configGate = new ConfigGate(
            VOID_CHAIN_ID,
            address(d.adminGate) // AdminGate controls config
        );

        console2.log("AdminGate           :", address(d.adminGate));
        console2.log("ConfigGate          :", address(d.configGate));
        console2.log("AdminGate.masterKey :", d.adminGate.masterKey());
        console2.log("ConfigGate.adminGate:", d.configGate.adminGate());

        console2.log("=== [core] deploy ValidatorSet ===");
        d.validatorSet = new ValidatorSet(cfg.roles.validatorAdmin);
        console2.log("ValidatorSet :", address(d.validatorSet));
        console2.log("Validator admin:", d.validatorSet.admin());

        console2.log("=== [core] deploy EmissionsController ===");
        d.emissions = new VoidEmissionsController(cfg.roles.emissionsAdmin);
        console2.log("EmissionsController :", address(d.emissions));
        console2.log("Emissions admin     :", d.emissions.admin());
        console2.log("Emissions budget    :", d.emissions.EMISSIONS_BUDGET());

        console2.log("=== [core] deploy RewardEngine ===");
        d.rewardEngine = new RewardEngine(
            IVoidTokenLike(address(d.token)),
            IValidatorSetLike(address(d.validatorSet)),
            cfg.roles.rewardsAdmin
        );

        console2.log("RewardEngine :", address(d.rewardEngine));
        console2.log("Reward admin :", d.rewardEngine.admin());
        console2.log("Reward budget:", d.rewardEngine.EMISSIONS_BUDGET());

        // NOTE: For dev we are not yet:
        //  - Registering validator0 in ValidatorSet
        //  - Wiring AdminGate.systemContracts / ConfigGate params
        //  - Wiring RewardEngine to emissions controller in a router
        // That comes later when we lock the full wiring.

        return d;
    }

    function run(string memory configPath) external {
        Config memory cfg = loadConfig(configPath);

        require(cfg.chainId == VOID_CHAIN_ID, "dev-plan: chainId mismatch");
        require(cfg.validator0.stakeVOID > 0, "dev-plan: validator0 stake=0");

        uint256 deployerKey = vm.envUint("VOID_DEV_DEPLOYER_KEY");
        address envDeployer = vm.addr(deployerKey);

        console2.log("=== VOID mainnet dev bootstrap (from PLAN) ===");
        console2.log("runtime chainId :", block.chainid);
        console2.log("config  chainId :", cfg.chainId);
        console2.log("plan.deployer   :", cfg.roles.deployer);
        console2.log("env deployer    :", envDeployer);
        console2.log("NOTE: dev bootstrap uses env deployer for signing; PLAN roles are metadata.");

        console2.log("=== [roles snapshot] ===");
        console2.log("treasuryAdmin     :", cfg.roles.treasuryAdmin);
        console2.log("opsTreasuryAdmin  :", cfg.roles.opsTreasuryAdmin);
        console2.log("validatorAdmin    :", cfg.roles.validatorAdmin);
        console2.log("adminGateOwner    :", cfg.roles.adminGateOwner);
        console2.log("configGateOwner   :", cfg.roles.configGateOwner);
        console2.log("rewardEngineOwner :", cfg.roles.rewardEngineOwner);
        console2.log("validatorSetOwner :", cfg.roles.validatorSetOwner);

        console2.log("=== [validator0 snapshot] ===");
        console2.log("validator0.reward       :", cfg.validator0.reward);
        console2.log("validator0.consensusKey :");
        console2.logBytes32(cfg.validator0.consensusKey);
        console2.log("validator0.stakeVOID    :", cfg.validator0.stakeVOID);

        // Use env deployer as premine recipient so we can move tokens to Treasury.
        address premineRecipient = envDeployer;

        vm.startBroadcast(deployerKey);
        Deployed memory d = _bootstrapCore(cfg, premineRecipient);
        vm.stopBroadcast();

        console2.log("=== [summary] deployed core VOID stack (dev-plan) ===");
        console2.log("VoidToken           :", address(d.token));
        console2.log("VoidTreasury        :", address(d.voidTreasury));
        console2.log("OpsTreasury         :", address(d.opsTreasury));
        console2.log("AdminGate           :", address(d.adminGate));
        console2.log("ConfigGate          :", address(d.configGate));
        console2.log("ValidatorSet        :", address(d.validatorSet));
        console2.log("EmissionsController :", address(d.emissions));
        console2.log("RewardEngine        :", address(d.rewardEngine));
    }
}
