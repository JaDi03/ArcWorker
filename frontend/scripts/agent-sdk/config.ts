import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const ARC_TESTNET = defineChain({
    id: 5042002,
    name: 'ARC Testnet',
    network: 'arc-testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'USDC',
        symbol: 'USDC',
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.testnet.arc.network'],
        },
        public: {
            http: ['https://rpc.testnet.arc.network'],
        },
    },
});

export const CONTRACT_ADDRESSES = {
    TaskEscrow: '0x43AE98Ff8A2af37855C0209F4470e849B75cBE0F',
    ReputationRegistry: '0x5de82F982047365a68E6D87f740a6de656f6635A',
    UserRegistry: '0x75fC403F9604c4F401A1aEcc9aDA649bfc6Ea986',
};

// Tooling for the SDK
export const getClients = (privateKey?: string) => {
    const publicClient = createPublicClient({
        chain: ARC_TESTNET,
        transport: http(),
    });

    if (privateKey) {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        const walletClient = createWalletClient({
            account,
            chain: ARC_TESTNET,
            transport: http(),
            // Manual gas overrides for RPCs with poor estimation
            // @ts-ignore
            gas: 500_000n,
        });
        return { publicClient, walletClient, account };
    }

    return { publicClient };
};
