// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// interfaces
import { IMultiCall } from "../interfaces/utils/IMultiCall.sol";

/////////////////////////////////////////////////////
/// PLEASE DO NOT USE THIS CONTRACT IN PRODUCTION ///
/////////////////////////////////////////////////////

/**
 * @title MultiCall Contract
 * @author Opty.fi
 * @dev Provides functions used commonly for decoding codes and execute
 * the code calls for Opty.fi contracts
 */
abstract contract MultiCall is IMultiCall {
    /**
     * @inheritdoc IMultiCall
     */
    function executeCode(bytes memory _code, string memory _errorMsg) public override {
        (address _contract, uint256 _amount, bytes memory _data) = abi.decode(_code, (address, uint256, bytes));
        (bool _success, ) = _contract.call{ value: _amount }(_data); //solhint-disable-line avoid-low-level-calls
        require(_success, _errorMsg);
    }

    /**
     * @inheritdoc IMultiCall
     */
    function executeCodes(bytes[] memory _codes, string memory _errorMsg) public override {
        for (uint256 _j = 0; _j < _codes.length; _j++) {
            executeCode(_codes[_j], _errorMsg);
        }
    }
}
