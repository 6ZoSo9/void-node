// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../contracts/mainnet/BuyVoidPresaleFulfillmentV1.sol";

contract BuyVoidGasMeasureTokenV1 {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient_balance");
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
        return true;
    }
}

contract BuyVoidPresaleFulfillmentV1GasMeasurement {
    event GasMeasured(uint256 gasUsed);

    uint256 internal constant CAP = 10_000_000 ether;
    bytes32 internal constant PAYMENT =
        keccak256("void:gas-measure:genesis-first");

    BuyVoidGasMeasureTokenV1 internal token;
    BuyVoidPresaleFulfillmentV1 internal registry;

    function setUp() public {
        token = new BuyVoidGasMeasureTokenV1();
        registry = new BuyVoidPresaleFulfillmentV1(
            address(token),
            address(this),
            address(0)
        );
        token.mint(address(registry), CAP);
    }

    function test_genesisFirstFulfillmentGasMeasurement() public {
        uint256 beforeGas = gasleft();

        registry.fulfill(
            PAYMENT,
            address(0xBEEF),
            1 ether
        );

        uint256 gasUsed = beforeGas - gasleft();
        emit GasMeasured(gasUsed);

        require(registry.isFulfilled(PAYMENT), "fulfillment_missing");
        require(
            token.balanceOf(address(0xBEEF)) == 1 ether,
            "recipient_balance_mismatch"
        );
        require(
            registry.totalFulfilledAtoms() == 1 ether,
            "total_mismatch"
        );
    }
}
