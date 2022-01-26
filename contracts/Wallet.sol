// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

struct MetaTx {
    address to;
    uint256 value;
    bytes callData;
}

contract Wallet {
    address owner;

    constructor(address _owner) public {
        owner = _owner;
    }

    receive() external payable {}

    function verifySig(MetaTx memory _metaTx, bytes memory _sig) external returns (bytes memory) {
        bytes32 metaTxHash = keccak256(abi.encode(_metaTx.to, _metaTx.value, _metaTx.callData));
        address signer = ECDSA.recover(ECDSA.toEthSignedMessageHash(metaTxHash), _sig);
        require(owner == signer, "UNAUTH");

        (bool _success, bytes memory _result) = _metaTx.to.call{ value: _metaTx.value }(_metaTx.callData);
        require(_success);
        return _result;
    }

    function call(MetaTx memory _metaTx) external returns (bytes memory) {
        (bool _success, bytes memory _result) = _metaTx.to.call{ value: _metaTx.value }(_metaTx.callData);
        require(_success);
        return _result;
    }
}
