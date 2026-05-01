// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FheType} from "@fhevm/solidity/lib/FheType.sol";
import {Impl} from "@fhevm/solidity/lib/Impl.sol";

/**
 * @title ConfidentialUSDC
 * @notice A mintable ERC-20 stablecoin for the VeilPay bounty system on Sepolia.
 * @dev    This is NOT a confidential-balance token — balances are plaintext.
 *         We use a standard ERC-20 so employers can easily deposit and candidates
 *         can see their bounty earnings. The "Confidential" branding signals
 *         that this token is purpose-built for the VeilPay FHE ecosystem.
 *
 *         Anyone can mint testnet tokens via the faucet() function (max 1000 per call).
 */
contract ConfidentialUSDC is ZamaEthereumConfig {
    string public constant name = "Confidential USDC";
    string public constant symbol = "cUSDC";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public constant FAUCET_AMOUNT = 1000 * 10**6; // 1000 cUSDC per claim
    mapping(address => uint256) public lastFaucetClaim;
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event FaucetClaimed(address indexed claimer, uint256 amount);

    /**
     * @notice Testnet faucet — claim 1000 cUSDC for free (once per hour).
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "cUSDC: Faucet cooldown active (1 hour)"
        );

        lastFaucetClaim[msg.sender] = block.timestamp;
        totalSupply += FAUCET_AMOUNT;
        balanceOf[msg.sender] += FAUCET_AMOUNT;

        emit Transfer(address(0), msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "cUSDC: Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "cUSDC: Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "cUSDC: Insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
