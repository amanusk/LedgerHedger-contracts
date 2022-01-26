// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

struct MetaTx {
    uint256 nonce;
    address to;
    uint256 value;
    bytes callData;
}

enum State {
    INIT,
    REGISTERED,
    IDLE
}

contract LedgerHedger {
    uint256 public nonce;

    uint32 public startBlock;
    uint32 public endBlock;
    uint32 public regBlock;

    address public buyer;
    address public seller;
    uint256 public gasHedged;

    uint256 public collateral;
    uint256 public payment;
    uint256 public eps;

    State public status;

    constructor(address _owner) public {
        buyer = _owner;
        status = State.IDLE;
    }

    receive() external payable {}

    function init(
        uint32 _regBlock,
        uint32 _startBlock,
        uint32 _endBlock,
        uint256 _gasHedged,
        uint256 _col,
        uint256 _eps
    ) external payable {
        require(buyer == msg.sender, "Not owner");
        require(block.number <= _regBlock && _regBlock < _startBlock && _startBlock <= _endBlock, "block out of bound");
        // NOTE: Optionally let this be reinitiated if depeleted
        require(status == State.IDLE, "Contract already initialized");
        require(_gasHedged > 0, "Hedged amount can't be negative");
        require(_col >= 0, "Collateral can't be negative");
        require(_eps > 0, "Epsilon can't be negative");
        require(msg.value > eps, "Payment can't be negative");

        regBlock = _regBlock;
        startBlock = _startBlock;
        endBlock = _endBlock;

        gasHedged = _gasHedged;

        eps = _eps;
        payment = msg.value - eps;
        collateral = _col;

        status = State.INIT;
    }

    // The callers of the function sets themselves as the gasPayer
    function register() external payable {
        require(block.number <= regBlock, "Register block expired");
        require(status == State.INIT, "Contract not initialized");
        require(msg.value >= collateral, "Insufficient collateral provided");
        seller = msg.sender;
        status = State.REGISTERED;
    }

    function refund() external {
        require(block.number >= startBlock && block.number <= endBlock, "Block must be between start and end");
        require(status == State.INIT, "Contract must be only initiated");
        require(msg.sender == buyer, "Not owner");
        status = State.IDLE;
        buyer.call{ value: payment + eps }(""); // the payment is sent to the buyer anyway
    }

    function execute(MetaTx memory _metaTx, bytes memory _sig) external {
        require(block.number >= startBlock && block.number <= endBlock, "Block must be between start and end");
        require(status == State.REGISTERED, "Contract not registered");
        require(msg.sender == seller, "Wrong seller");
        status = State.IDLE;
        (bool _success, bytes memory _result) = seller.call{ value: collateral + payment + eps }(""); // the payment is sent to the seller anyway
        require(_success, "payment failed");
        verifyAndExecute(_metaTx, _sig);
    }

    function exhaust() external {
        require(block.number >= startBlock && block.number <= endBlock, "Block must be between start and end");
        require(status == State.REGISTERED, "Contract not registered");
        require(msg.sender == seller, "Wrong seller");
        loopUntil();
        status = State.IDLE;
        seller.call{ value: collateral + payment }(""); // the payment is sent to the seller anyway
    }

    function verifyAndExecute(MetaTx memory _metaTx, bytes memory _sig) public returns (bytes memory) {
        require(_metaTx.nonce == nonce, "Nonce incorrect");
        bytes32 metaTxHash = keccak256(abi.encode(_metaTx.nonce, _metaTx.to, _metaTx.value, _metaTx.callData));
        address signer = ECDSA.recover(ECDSA.toEthSignedMessageHash(metaTxHash), _sig);
        require(buyer == signer, "UNAUTH");
        nonce++; // We up the nonce regardless of success
        (bool _success, bytes memory _result) = _metaTx.to.call{ value: _metaTx.value }(_metaTx.callData);
        if (status == State.INIT) {
            require(address(this).balance >= payment + eps, "cannot spend locked funds");
        } else if (status == State.REGISTERED) {
            require(address(this).balance >= payment + eps + collateral, "cannot spend locked funds");
        }
        return _result;
    }

    function loopUntil() public {
        uint256 i = 0;
        uint256 times = (gasHedged - 23330) / 117;
        for (i; i < times; i++) {}
    }
}
