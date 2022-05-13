// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IcTToken {
    function balanceOfUnderlying(address owner) external returns (uint);

    function getAccountSnapshot(address account)
        external
        view
        returns (
            uint,
            uint,
            uint,
            uint
        );
}
