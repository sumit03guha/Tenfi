// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface tenLots {
    function updateAccPerShare(uint256 amount) external;
}

contract TransferReward {
    address public owner;
    address public TenLots;
    address public BUSD = 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56;

    modifier checkOwner(address caller) {
        require(caller == owner, "Error: Not Authorised");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function changeOwner(address newOwner) external checkOwner(msg.sender) {
        owner = newOwner;
    }

    function changeTenLots(address tenlots) external checkOwner(msg.sender) {
        TenLots = tenlots;
    }

    function update() external {
        IERC20(BUSD).approve(TenLots, IERC20(BUSD).balanceOf(address(this)));
        tenLots(TenLots).updateAccPerShare(
            IERC20(BUSD).balanceOf(address(this))
        );
    }

    function withdrawTokens(address to) external checkOwner(msg.sender) {
        IERC20(BUSD).transfer(to, IERC20(BUSD).balanceOf(address(this)));
    }
}
