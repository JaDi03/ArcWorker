import { useMemo, useState, useEffect } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';

/**
 * Custom hook to fetch and normalize tasks from the TaskEscrow contract.
 * @param address Optional address to filter tasks for a specific user (worker or agency)
 * @returns 
 */
export function useTasks(address?: string) {
    const [effectiveCounter, setEffectiveCounter] = useState<number>(0);

    useEffect(() => {
        const val = localStorage.getItem('arc_task_counter_cache');
        if (val) setEffectiveCounter(Number(val));
    }, []);

    const { data: taskCounter, isLoading: isCounterLoading, refetch: refetchCounter } = useReadContract({
        address: CONTRACTS.TaskEscrow.address,
        abi: CONTRACTS.TaskEscrow.abi,
        functionName: 'taskCounter',
        query: {
            staleTime: 30000, // 30 seconds - reduce RPC calls
            refetchInterval: 30000, // Auto-refresh every 30 seconds (was 5s)
        }
    });

    useEffect(() => {
        if (taskCounter) {
            setEffectiveCounter(Number(taskCounter));
            localStorage.setItem('arc_task_counter_cache', taskCounter.toString());
        }
    }, [taskCounter]);


    const tasksConfig = useMemo(() => {
        const config = [];
        if (effectiveCounter > 0) {
            const count = effectiveCounter;
            const limit = 20;
            const start = Math.max(1, count - limit + 1);

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
    }, [effectiveCounter]);

    const { data: rawTasks, isLoading: isTasksLoading, refetch: refetchTasks } = useReadContracts({
        contracts: tasksConfig as any,
        query: {
            staleTime: 30000, // 30 seconds - reduce RPC calls
            refetchInterval: 30000, // Auto-refresh every 30 seconds (was 5s)
            enabled: tasksConfig.length > 0,
        }
    });


    const [allTasks, setAllTasks] = useState<any[]>([]);

    // Cache initialization on mount
    useEffect(() => {
        const cached = localStorage.getItem('arc_tasks_cache');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setAllTasks(parsed);
            } catch (e) {
                console.error("Cache parsing error", e);
            }
        }
    }, []);

    // Effect to update local state when fresh network data arrives
    useEffect(() => {
        if (!rawTasks || rawTasks.length === 0) return;

        const processed = rawTasks
            .map((r: any) => r.result)
            .filter((t: any) => t)
            .map((t: any) => {
                let metadata: any = { title: 'Unknown', description: 'No description', timeEstimate: '5 mins', tags: [], verification: 'auto' };
                try {
                    metadata = JSON.parse(t[7]);
                } catch (e) { }
                return {
                    id: Number(t[0]),
                    agency: t[1],
                    worker: t[2],
                    reward: (Number(t[3]) / 1e6).toFixed(2),
                    rewardValue: BigInt(t[3]),
                    deposit: t[4],
                    deadline: t[5],
                    status: Number(t[6]),
                    metadataHash: t[7],
                    answer: t[8],
                    title: metadata.title || 'Unknown',
                    description: metadata.description || metadata.desc || 'No description',
                    timeEstimate: metadata.timeEstimate || '5 mins',
                    tags: metadata.tags || [],
                    metadata: metadata
                };
            });

        // Only update state if we found valid tasks
        if (processed.length > 0) {
            setAllTasks(processed);
            if (typeof window !== 'undefined') {
                // Fix: Serialize BigInts as strings to avoid JSON error
                const serialized = JSON.stringify(processed, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                );
                localStorage.setItem('arc_tasks_cache', serialized);
            }
        }
    }, [rawTasks]);

    const filteredTasks = useMemo(() => {
        if (!address) return allTasks;
        const lowerAddress = address.toLowerCase();
        return allTasks.filter((t: any) =>
            t.worker?.toLowerCase() === lowerAddress ||
            t.agency?.toLowerCase() === lowerAddress
        );
    }, [allTasks, address]);

    const isInitialLoading = (isCounterLoading || isTasksLoading) && allTasks.length === 0;

    const refetch = async () => {
        await refetchCounter?.();
        await refetchTasks?.();
    };

    return {
        tasks: filteredTasks,
        allTasks,
        isLoading: isInitialLoading,
        isSyncing: isCounterLoading || isTasksLoading,
        taskCounter: Number(taskCounter || 0),
        refetch
    };
}
