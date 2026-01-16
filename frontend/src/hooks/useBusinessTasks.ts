import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';
import { formatEther, formatUnits } from 'viem';

/**
 * Hook optimized for Agency/Business Dashboard.
 * Focuses on Data Freshness over Instant Loading.
 * - Short staleTime
 * - No persistent local storage cache (avoids stale data on creation)
 * - Returns refetch capability
 */
export function useBusinessTasks(address?: string) {
    // 1. Fetch Counter (Short buffer)
    const { data: taskCounter, isLoading: isCounterLoading, refetch: refetchCounter } = useReadContract({
        address: CONTRACTS.TaskEscrow.address,
        abi: CONTRACTS.TaskEscrow.abi,
        functionName: 'taskCounter',
        query: {
            staleTime: 2000, // Very fresh
        }
    });

    // 2. Generate Config
    const tasksConfig = useMemo(() => {
        const config = [];
        if (taskCounter) {
            const count = Number(taskCounter);
            // Fetch ALL tasks for business view (or last 50)
            // Descending order to see newest first
            const start = Math.max(1, count - 50);
            for (let i = count; i >= start; i--) {
                config.push({
                    address: CONTRACTS.TaskEscrow.address,
                    abi: CONTRACTS.TaskEscrow.abi,
                    functionName: 'tasks',
                    args: [BigInt(i)],
                });
            }
        }
        return config;
    }, [taskCounter]);

    // 3. Batched Fetch
    const { data: rawTasks, isLoading: isTasksLoading, refetch: refetchTasks } = useReadContracts({
        contracts: tasksConfig as any,
        query: {
            staleTime: 2000, // Very fresh
        }
    });

    // 4. Parse & Filter
    const allTasks = useMemo(() => {
        if (!rawTasks) return [];

        return rawTasks
            .map((r: any) => r.result)
            .filter((t: any) => t)
            .map((t: any) => {
                let metadata: any = { title: 'Unknown', description: 'No description' };
                try {
                    metadata = JSON.parse(t[6]); // Index 6 is metadataHash
                } catch (e) { }
                const statusMap = ['Created', 'Submitted', 'Approved', 'Rejected', 'Cancelled'];
                const s = Number(t[5]); // Index 5 is status
                return {
                    id: Number(t[0]),
                    agency: t[1],
                    reward: (Number(formatUnits(BigInt(t[2] || 0), 18))).toFixed(2), // USDC (18 decimals native)
                    rewardRaw: t[2],
                    deposit: t[3],
                    deadline: t[4],
                    status: statusMap[s] || 'Unknown',
                    rawStatus: s,
                    metadataHash: t[6],
                    requiredSubmissions: Number(t[7]),
                    currentSubmissions: Number(t[8]),
                    title: metadata.title || 'Unknown',
                    metadata: metadata
                };
            });
    }, [rawTasks]);

    const filteredTasks = useMemo(() => {
        if (!address) return allTasks;
        const lowerAddress = address.toLowerCase();
        return allTasks.filter((t: any) => t.agency?.toLowerCase() === lowerAddress);
    }, [allTasks, address]);

    // Refetch both
    const refetch = async () => {
        await refetchCounter();
        await refetchTasks();
    };

    return {
        tasks: filteredTasks,
        allTasks,
        isLoading: isCounterLoading || isTasksLoading,
        refetch
    };
}
