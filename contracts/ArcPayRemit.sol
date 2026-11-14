// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ArcPayRemit
/// @notice Sends USDC directly to a recipient with a publicly readable onchain note.
/// @dev Intended for Arc Testnet USDC (6 decimals). Amounts use token base units.
///      Notes are recorded in event logs and contract storage, and are not private.
contract ArcPayRemit {
    using SafeERC20 for IERC20;

    /// @notice The USDC token used for all remittances.
    IERC20 public immutable usdc;

    /// @notice A successful remittance received by an address.
    struct Record {
        address from;
        uint64 timestamp;
        uint256 amount;
        string note;
    }

    /// @dev Recipient records stored in insertion order.
    mapping(address => Record[]) private _records;

    /// @notice The supplied token address is zero.
    error ZeroTokenAddress();

    /// @notice The supplied recipient address is zero.
    error ZeroRecipient();

    /// @notice The remittance amount is zero.
    error ZeroAmount();

    /// @notice The note exceeds the 140-byte limit.
    error NoteTooLong();

    /// @notice Emitted after a successful transfer to the recipient.
    /// @param from The sender whose tokens were transferred.
    /// @param to The recipient of the tokens.
    /// @param amount The transferred amount in token base units.
    /// @param note The public remittance note.
    event Remittance(address indexed from, address indexed to, uint256 amount, string note);

    /// @notice Sets the immutable USDC token address.
    /// @param usdcAddress The ERC-20 USDC token address on Arc Testnet.
    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert ZeroTokenAddress();
        usdc = IERC20(usdcAddress);
    }

    /// @notice Transfers USDC from the caller directly to a recipient with a note.
    /// @dev The caller must first approve this contract for at least amount tokens.
    ///      This function does not custody funds. The note limit counts UTF-8 bytes.
    /// @param to The recipient address.
    /// @param amount The amount in USDC base units (1 USDC = 1,000,000 units).
    /// @param note A publicly readable note of at most 140 bytes.
    function remit(address to, uint256 amount, string calldata note) external {
        if (to == address(0)) revert ZeroRecipient();
        if (amount == 0) revert ZeroAmount();
        if (bytes(note).length > 140) revert NoteTooLong();

        usdc.safeTransferFrom(msg.sender, to, amount);

        _records[to].push(Record(msg.sender, uint64(block.timestamp), amount, note));

        emit Remittance(msg.sender, to, amount, note);
    }

    /// @notice Returns the number of remittances recorded for a recipient.
    /// @param to The recipient address.
    /// @return The number of stored records.
    function recordCount(address to) external view returns (uint256) {
        return _records[to].length;
    }

    /// @notice Returns a newest-first page of a recipient's remittance records.
    /// @param to The recipient address.
    /// @param offset The number of newest records to skip; zero starts at the newest.
    /// @param limit The requested page size, capped at 50.
    /// @return records The page, empty when offset is out of range or limit is zero.
    function recordsOf(address to, uint256 offset, uint256 limit) external view returns (Record[] memory records) {
        uint256 count = _records[to].length;
        if (offset >= count) return new Record[](0);
        if (limit > 50) limit = 50;

        uint256 remaining = count - offset;
        if (limit > remaining) limit = remaining;
        records = new Record[](limit);
        for (uint256 i = 0; i < limit; ++i) {
            records[i] = _records[to][count - offset - 1 - i];
        }
    }
}
