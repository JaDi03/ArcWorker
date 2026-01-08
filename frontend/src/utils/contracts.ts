import TaskEscrowArtifact from '../abis/TaskEscrow.json';
import ReputationRegistryArtifact from '../abis/ReputationRegistry.json';
import MockYieldVaultArtifact from '../abis/MockYieldVault.json';

export const CONTRACTS = {
    TaskEscrow: {
        address: "0xFd3CF1C00e6F99Eb77FC908c5B56dd899D2bCac6" as `0x${string}`, // Arc Testnet (FIXED VAULT)
        abi: TaskEscrowArtifact.abi,
    },
    ReputationRegistry: {
        address: "0x5de82F982047365a68E6D87f740a6de656f6635A" as `0x${string}`, // Arc Testnet
        abi: ReputationRegistryArtifact.abi,
    },
    UserRegistry: {
        address: "0x75fC403F9604c4F401A1aEcc9aDA649bfc6Ea986" as `0x${string}`, // Arc Testnet
        abi: [
            "function register(string memory _name)",
            "function resolve(string memory _name) view returns (address)",
            "function getName(address _user) view returns (string memory)"
        ]
    },
    MockYieldVault: {
        address: "0x567d55D61196B9FF0C07E2914E62F87bdd86Df47" as `0x${string}`, // Arc Testnet (WITH RECEIVE)
        abi: MockYieldVaultArtifact.abi,
    }
} as const;

export const CHAIN_ID = 5042002;
