// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

interface ILidoDeposit {
    /**
     * @return the amount of shares that corresponds to `_ethAmount` protocol-controlled Ether.
     */
    function getSharesByPooledEth(uint256 _ethAmount) external view returns (uint256);

    /**
     * @return the entire amount of Ether controlled by the protocol.
     *
     * @dev The sum of all ETH balances in the protocol, equals to the total supply of stETH.
     */
    function getTotalPooledEther() external view returns (uint256);

    /**
     * @return the total amount of shares in existence.
     *
     * @dev The sum of all accounts' shares can be an arbitrary number, therefore
     * it is necessary to store it in order to calculate each account's relative share.
     */
    function getTotalShares() external view returns (uint256);

    /**
     * @return the amount of shares owned by `_account`.
     */
    function sharesOf(address _account) external view returns (uint256);
}
