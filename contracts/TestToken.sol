// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

//import "hardhat/console.sol";

/**
 * @notice A mintable ERC20
 */
contract TestToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() public ERC20("Test Token", "TST") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _mint(msg.sender, 100 ether);
    }

    function mint(address to, uint256 amount) external {
        require(hasRole(MINTER_ROLE, msg.sender), "Only minter can mint");
        _mint(to, amount);
    }

    function distribute(address[] calldata to, uint256[] calldata amounts) external {
        //console.log("Balance of message sender", balanceOf(msg.sender));
        require(to.length == amounts.length, "Amounts must be same length as addresses");
        // this will fail if owner does not have enough balance
        for (uint256 i = 0; i < to.length; i++) {
            // console.log("Sending to address", to[i]);
            // console.log("Sending amount", amounts[i]);
            _transfer(msg.sender, to[i], amounts[i]);
        }
    }
}
