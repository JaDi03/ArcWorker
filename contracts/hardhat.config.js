require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.19",
    networks: {
        arcTestnet: {
            url: "https://rpc.testnet.arc.network",
            chainId: 5042002,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [], // Validates if env var exists, else empty
        },
    },
};
