'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { polygonAmoy } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { ReactNode } from 'react';

// Arc Network Testnet Definition
const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
});

const config = createConfig({
  chains: [arcTestnet, polygonAmoy],
  transports: {
    [arcTestnet.id]: http(undefined, { batch: true }),
    [polygonAmoy.id]: http(undefined, { batch: true }),
  },
  connectors: [
    injected(), // MetaMask & others
  ],
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
