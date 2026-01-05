// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockYieldVault
 * @dev Simulates a Yield-Bearing Vault (like USYC or Aave).
 * It magically generates 5% APY effectively increasing the redemption value of shares over time.
 */
contract MockYieldVault {
    string public name = "Arc Yield USD";
    string public symbol = "ayUSD";
    uint8 public decimals = 18; // Same as Native USDC on Arc

    uint256 public totalShares;
    uint256 public totalAssetsDeposited;
    
    // Simulation Parameters
    uint256 public constant APY_BPS = 500; // 5% APY
    uint256 public startTimestamp;

    mapping(address => uint256) public shares;

    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);

    constructor() {
        startTimestamp = block.timestamp;
    }

    /**
     * @dev Calculates total assets controlled by the vault.
     * Starts with actual deposits + simulated yield based on time.
     */
    function totalAssets() public view returns (uint256) {
        if (totalAssetsDeposited == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - startTimestamp;
        // Simple Interest for Mock: Principal * (1 + Rate * Time)
        // Rate per second = 5% / 31536000 seconds
        uint256 yield = (totalAssetsDeposited * APY_BPS * timeElapsed) / (10000 * 365 days);
        
        return totalAssetsDeposited + yield;
    }

    function _convertToShares(uint256 assets) internal view returns (uint256) {
        uint256 _totalAssets = totalAssets();
        if (totalShares == 0 || _totalAssets == 0) {
            return assets; // 1:1 Initial Exchange Rate
        }
        // Shares = Amount * (TotalShares / TotalAssets)
        return (assets * totalShares) / _totalAssets;
    }

    function _convertToAssets(uint256 _shares) internal view returns (uint256) {
        uint256 _totalAssets = totalAssets();
        if (totalShares == 0) return 0;
        // Assets = Shares * (TotalAssets / TotalShares)
        return (_shares * _totalAssets) / totalShares;
    }

    function convertToAssets(uint256 _shares) external view returns (uint256) {
        return _convertToAssets(_shares);
    }
    
    /**
     * @dev Deposit Native USDC (msg.value) into the vault.
     * Returns minted shares.
     */
    function deposit() external payable returns (uint256) {
        require(msg.value > 0, "Deposit must be > 0");

        uint256 sharesToMint = _convertToShares(msg.value);
        
        totalAssetsDeposited += msg.value;
        totalShares += sharesToMint;
        shares[msg.sender] += sharesToMint;

        emit Deposit(msg.sender, msg.value, sharesToMint);
        return sharesToMint;
    }

    /**
     * @dev Withdraw Assets by burning shares.
     */
    function withdraw(uint256 _shares) external {
        require(shares[msg.sender] >= _shares, "Insufficient balance");

        uint256 assetsToReturn = _convertToAssets(_shares);
        
        shares[msg.sender] -= _shares;
        totalShares -= _shares;
        
        // Ensure we don't underflow if yield calc is slightly off in edge cases
        if (assetsToReturn > address(this).balance) {
            assetsToReturn = address(this).balance;
        }
        
        // Update principal tracking (simplification)
        if (assetsToReturn >= totalAssetsDeposited) {
            totalAssetsDeposited = 0;
        } else {
            totalAssetsDeposited -= assetsToReturn;
        }

        (bool success, ) = payable(msg.sender).call{value: assetsToReturn}("");
        require(success, "Transfer failed");

        emit Withdraw(msg.sender, assetsToReturn, _shares);
    }
    
    // Helper for UI
    function balanceOf(address account) external view returns (uint256) {
        return _convertToAssets(shares[account]);
    }
    
    function shareBalanceOf(address account) external view returns (uint256) {
        return shares[account];
    }
}
