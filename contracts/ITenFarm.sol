// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface TenFarm {
    function userInfo() external view returns (uint256);

    //Deposit LP tokens
    function deposit(uint256 _pid, uint256 _wantAmount) external;

    function withdraw(uint256 _pid, uint256 _amountIn) external;

    function stakedWantTokens(uint256 _pid, address _user)
        external
        view
        returns (uint256);

    function pendingTENFI(uint256 _pid, address _user)
        external
        view
        returns (uint256);
}
