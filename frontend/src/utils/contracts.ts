import TaskEscrowArtifact from '../abis/TaskEscrow.json';
import ReputationRegistryArtifact from '../abis/ReputationRegistry.json';
import MockYieldVaultArtifact from '../abis/MockYieldVault.json';

export const CONTRACTS = {
    TaskEscrow: {
        address: "0x43AE98Ff8A2af37855C0209F4470e849B75cBE0F" as `0x${string}`, // Arc Testnet (BATCH SUPPORT)
        abi: TaskEscrowArtifact.abi,
    },
    ReputationRegistry: {
        address: "0x5de82F982047365a68E6D87f740a6de656f6635A" as `0x${string}`, // Arc Testnet
        abi: ReputationRegistryArtifact.abi,
    },
    UserRegistry: {
        address: "0x75fC403F9604c4F401A1aEcc9aDA649bfc6Ea986" as `0x${string}`, // Arc Testnet
        abi: [
            { name: "register", type: "function", inputs: [{ name: "_name", type: "string" }], outputs: [], stateMutability: "nonpayable" },
            { name: "resolve", type: "function", inputs: [{ name: "_name", type: "string" }], outputs: [{ type: "address" }], stateMutability: "view" },
            { name: "getName", type: "function", inputs: [{ name: "_user", type: "address" }], outputs: [{ type: "string" }], stateMutability: "view" }
        ]
    },
    MockYieldVault: {
        address: "0xe0e2f4eA038B9dFdfb92B2761B752FBbE0cF292e" as `0x${string}`, // Arc Testnet (LATEST VAULT)
        abi: MockYieldVaultArtifact.abi,
    },
    USDC: {
        address: "0x3600000000000000000000000000000000000000" as `0x${string}`, // Arc Testnet Canonical USDC (ERC-20 Interface for Native Gas)
        abi: [
            { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
        ]
    }
} as const;

export const CHAIN_ID = 5042002;
