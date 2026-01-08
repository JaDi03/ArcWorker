// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArcPayment
 * @dev Handles social payments with on-chain memos for the ArcWorker Protocol.
 */
contract ArcPayment is Ownable {
    IERC20 public immutable usdc;

    event SocialPayment(
        address indexed from,
        address indexed to,
        uint256 amount,
        string memo,
        uint256 timestamp
    );

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    /**
     * @dev Sends USDC to a recipient with a custom message.
     * @param to The recipient address.
     * @param amount The amount of USDC (in units).
     * @param memo The personal message to include.
     */
    function sendWithMemo(address to, uint256 amount, string calldata memo) external {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than zero");
        
        // Transfer USDC from sender to recipient
        require(usdc.transferFrom(msg.sender, to, amount), "Transfer failed");

        emit SocialPayment(msg.sender, to, amount, memo, block.timestamp);
    }
}
