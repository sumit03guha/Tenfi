// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IcTToken {
    function balanceOfUnderlying(address owner) external returns (uint);
}
