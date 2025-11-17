// SPDX-License-Identifier: VCL-1.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry reg;
    address admin = address(0xA11CE);
    address agent = address(0xBEEF);
    string constant MODEL_ID = "void-devnet-model-1";

    function setUp() public {
        reg = new AgentRegistry(admin);
    }

    function testAdminSetOnDeploy() public {
        assertEq(reg.admin(), admin, "admin should be set from constructor");
    }

    function testOnlyAdminCanSetGlobal() public {
        // non-admin should revert
        vm.prank(address(0x1234));
        vm.expectRevert(AgentRegistry.NotAdmin.selector);
        reg.setAgentGlobal(agent, true);

        // admin path succeeds
        vm.prank(admin);
        reg.setAgentGlobal(agent, true);
        assertTrue(reg.globalAgents(agent), "globalAgents(agent) should be true");
    }

    function testOnlyAdminCanSetPerModel() public {
        vm.prank(address(0x1234));
        vm.expectRevert(AgentRegistry.NotAdmin.selector);
        reg.setAgentModel(agent, MODEL_ID, true);

        vm.prank(admin);
        reg.setAgentModel(agent, MODEL_ID, true);

        // should now be authorized for that model
        bool ok = reg.isAuthorized(agent, MODEL_ID);
        assertTrue(ok, "agent should be authorized for MODEL_ID");
    }

    function testGlobalAuthOverridesModel() public {
        // grant model-specific but then revoke global and test behavior

        vm.startPrank(admin);
        reg.setAgentModel(agent, MODEL_ID, true);
        reg.setAgentGlobal(agent, true);
        vm.stopPrank();

        // any model should be allowed via global
        bool ok1 = reg.isAuthorized(agent, MODEL_ID);
        bool ok2 = reg.isAuthorized(agent, "some-other-model");
        assertTrue(ok1, "MODEL_ID should be authorized");
        assertTrue(ok2, "other model should be authorized via global");

        // revoke global; model-specific still applies
        vm.prank(admin);
        reg.setAgentGlobal(agent, false);

        ok1 = reg.isAuthorized(agent, MODEL_ID);
        ok2 = reg.isAuthorized(agent, "some-other-model");

        assertTrue(ok1, "MODEL_ID should still be authorized via per-model");
        assertFalse(ok2, "other model should no longer be authorized without global");
    }

    function testChangeAdmin() public {
        address newAdmin = address(0xDEAD);

        // non-admin cannot change
        vm.prank(address(0x1234));
        vm.expectRevert(AgentRegistry.NotAdmin.selector);
        reg.setAdmin(newAdmin);

        // admin can change
        vm.prank(admin);
        reg.setAdmin(newAdmin);
        assertEq(reg.admin(), newAdmin, "admin should be updated");

        // old admin should no longer be able to act
        vm.prank(admin);
        vm.expectRevert(AgentRegistry.NotAdmin.selector);
        reg.setAgentGlobal(agent, true);

        // new admin can act
        vm.prank(newAdmin);
        reg.setAgentGlobal(agent, true);
        assertTrue(reg.globalAgents(agent), "globalAgents(agent) should be true");
    }

    function testIsAuthorizedDefaultsToFalse() public {
        bool ok1 = reg.isAuthorized(agent, MODEL_ID);
        bool ok2 = reg.isAuthorized(agent, "");
        assertFalse(ok1, "unauthorized agent should not be authorized");
        assertFalse(ok2, "empty modelId should never be authorized");
    }
}
