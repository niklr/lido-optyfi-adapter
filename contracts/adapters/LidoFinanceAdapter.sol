// solhint-disable no-unused-vars
// SPDX-License-Identifier: agpl-3.0

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

/////////////////////////////////////////////////////
/// PLEASE DO NOT USE THIS CONTRACT IN PRODUCTION ///
/////////////////////////////////////////////////////

//  libraries
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

//  interfaces
import { ILidoDeposit } from "../interfaces/lido.finance/ILidoDeposit.sol";
import { IBeacon } from "@openzeppelin/contracts/proxy/IBeacon.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAdapter } from "../interfaces/opty/defiAdapters/IAdapter.sol";

/**
 * @title Adapter for Lido protocol
 * @author niklr
 * @dev Abstraction layer to lido's pools
 */

contract LidoFinanceAdapter is IAdapter {
    using SafeMath for uint256;

    /**
     * @notice Pool used to swap between ETH and stETH (direct withdraw from Lido contract is not possible yet)
     * @dev https://github.com/curvefi/curve-contract/tree/master/contracts/pools/steth
     */
    address public constant curveStableSwapStEth = address(0xDC24316b9AE028F1497c275EB9192a3Ea0f67022);

    /**
     * @notice ETH address representation
     * @dev Equivalent of a burn address (same approach as Curve stable swap contract)
     */
    address public constant underlyingToken = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    /**
     * @notice Lido and stETH token proxy
     * @dev https://github.com/lidofinance/lido-dao
     */
    address public constant lidoTokenProxy = address(0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84);

    /**
     * @notice Lido DAO token
     * @dev Potential reward token in the future (current rewards are reflected in the vault's dynamic balance)
     * https://github.com/lidofinance/lido-dao/blob/master/contracts/0.4.24/StETH.sol
     */
    address public constant rewardToken = address(0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32);

    /**
     * @notice Optional address used as referral on deposit
     */
    address public constant referralAddress = address(0xF75Ad89a40909FA0592e96899E038afa8f8B2BaE);

    /**
     * @inheritdoc IAdapter
     */
    function getDepositAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = _vault.balance;
        return getDepositSomeCodes(_vault, _underlyingTokens, _liquidityPool, _amounts);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getWithdrawAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalance(_vault, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_vault, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getUnderlyingTokens(address, address) public view override returns (address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = underlyingToken;
    }

    /**
     * @inheritdoc IAdapter
     */
    function calculateAmountInLPToken(
        address,
        address,
        uint256 _depositAmount
    ) public view override returns (uint256) {
        return ILidoDeposit(lidoTokenProxy).getSharesByPooledEth(_depositAmount);
    }

    /**
     * @inheritdoc IAdapter
     */
    function calculateRedeemableLPTokenAmount(
        address payable,
        address,
        address,
        uint256 _redeemAmount
    ) public view override returns (uint256 _amount) {
        return ILidoDeposit(lidoTokenProxy).getPooledEthByShares(_redeemAmount);
    }

    /**
     * @inheritdoc IAdapter
     */
    function isRedeemableAmountSufficient(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_vault, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    /**
     * @inheritdoc IAdapter
     */
    function canStake(address) public view override returns (bool) {
        return false;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getDepositSomeCodes(
        address payable,
        address[] memory,
        address,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        if (_amounts[0] > 0) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(
                lidoTokenProxy,
                _amounts[0],
                abi.encodeWithSignature("submit(address)", referralAddress)
            );
        }
    }

    /**
     * @inheritdoc IAdapter
     */
    function getWithdrawSomeCodes(
        address payable,
        address[] memory,
        address,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        if (_amount > 0) {
            uint256 pooledEthAmount = ILidoDeposit(lidoTokenProxy).getPooledEthByShares(_amount);
            _codes = new bytes[](2);
            _codes[0] = abi.encode(
                lidoTokenProxy,
                0,
                abi.encodeWithSignature("approve(address,uint256)", curveStableSwapStEth, pooledEthAmount)
            );
            // https://github.com/curvefi/curve-contract/blob/master/contracts/pools/steth/StableSwapSTETH.vy#L431
            _codes[1] = abi.encode(
                curveStableSwapStEth,
                0,
                abi.encodeWithSignature(
                    "exchange(int128,int128,uint256,uint256)",
                    1, // i = Index value for the coin to send
                    0, // j = Index value of the coin to receive
                    pooledEthAmount, // Amount of `i` being exchanged
                    calculateMinAmountAfterSwap(pooledEthAmount) // Minimum amount of `j` to receive
                )
            );
        }
    }

    /**
     * @inheritdoc IAdapter
     */
    function getPoolValue(address, address) public view override returns (uint256) {
        return IERC20(lidoTokenProxy).totalSupply();
    }

    /**
     * @inheritdoc IAdapter
     */
    function getLiquidityPoolToken(address, address) public view override returns (address) {
        return lidoTokenProxy;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getAllAmountInToken(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        return
            getSomeAmountInToken(
                _underlyingToken,
                _liquidityPool,
                getLiquidityPoolTokenBalance(_vault, _underlyingToken, _liquidityPool)
            );
    }

    /**
     * @inheritdoc IAdapter
     */
    function getLiquidityPoolTokenBalance(
        address payable _vault,
        address,
        address
    ) public view override returns (uint256) {
        return ILidoDeposit(lidoTokenProxy).sharesOf(_vault);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getSomeAmountInToken(
        address,
        address,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            // getPooledEthByShares = shares[account] * _getTotalPooledEther() / _getTotalShares()
            _liquidityPoolTokenAmount = ILidoDeposit(lidoTokenProxy).getPooledEthByShares(_liquidityPoolTokenAmount);
        }
        return _liquidityPoolTokenAmount;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getRewardToken(address) public view override returns (address) {
        return rewardToken;
    }

    /**
     * @dev Calculate the minimum amount to receive after swap (assuming ETH & stETH are traded 1:1)
     * @param _amount The amount of tokens to swap
     * @return Returns the minimum amount to receive after swap
     */
    function calculateMinAmountAfterSwap(uint256 _amount) public pure returns (uint256) {
        if (_amount > 0) {
            uint256 slippage = _amount.mul(5).div(1000); // 0.5%
            _amount = _amount.sub(slippage);
        }
        return _amount;
    }
}
