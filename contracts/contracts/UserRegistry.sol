// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title UserRegistry
 * @dev Maps wallet addresses to human-readable usernames for ArcWorker Protocol.
 * This allows P2P transfers via 'username'.
 */
contract UserRegistry {
    mapping(address => string) public addressToName;
    mapping(string => address) public nameToAddress;
    
    event UserRegistered(address indexed user, string name);

    /**
     * @dev Register a username.
     * Name must be unique and non-empty.
     */
    function register(string memory _name) external {
        require(bytes(_name).length > 2, "Name too short");
        require(bytes(_name).length < 20, "Name too long");
        require(nameToAddress[_name] == address(0), "Name already taken");
        require(bytes(addressToName[msg.sender]).length == 0, "Address already registered");

        // Simple validation: Allow alphanumeric (simplified for gas)
        // In prod, extensive regex validation should be done off-chain or via refined logic.

        addressToName[msg.sender] = _name;
        nameToAddress[_name] = msg.sender;

        emit UserRegistered(msg.sender, _name);
    }

    /**
     * @dev Resolve a username to an address.
     */
    function resolve(string memory _name) external view returns (address) {
        return nameToAddress[_name];
    }

    /**
     * @dev Get username for an address.
     */
    function getName(address _user) external view returns (string memory) {
        return addressToName[_user];
    }
}
