import { useMemo, useState, useEffect } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem'; // Added import
import { CONTRACTS } from '@/utils/contracts';

/**
 * Custom hook to fetch and normalize tasks from the TaskEscrow contract.
 * @param addressOrAddresses Optional address or array of addresses to filter tasks
 * @returns 
 */
export function useTasks(addressOrAddresses?: string | string[], workerAddress?: string) {
    const [lastError, setLastError] = useState<string | null>(null);

    const { data: taskCount } = useReadContract({
        address: CONTRACTS.TaskEscrow.address,
        abi: CONTRACTS.TaskEscrow.abi,
        functionName: 'taskCounter',
    });

    const addresses = useMemo(() => {
        if (!addressOrAddresses) return [];
        return Array.isArray(addressOrAddresses) ? addressOrAddresses : [addressOrAddresses];
    }, [addressOrAddresses]);

    const { data: rawTasks, isLoading: isTasksLoading, refetch: refetchTasks, error: readError } = useReadContract({
        address: CONTRACTS.TaskEscrow.address,
        abi: CONTRACTS.TaskEscrow.abi,
        functionName: 'getRecentTasks',
        args: [BigInt(200)], // Increased to 200 to catch older stuck tasks (like #118, #101)
        query: {
            staleTime: 10000, // Increase stale time
            refetchInterval: 10000,
            refetchOnWindowFocus: true,
            enabled: true
        }
    });

    // Persist error so it doesn't just "disappear" during refetch
    useEffect(() => {
        if (readError) {
            setLastError(readError.message);
        }
    }, [readError]);

    const [rawProcessedTasks, setRawProcessedTasks] = useState<any[]>([]);

    // Removed aggressive cache clearing on mount to improve stability

    // Effect to update local state when fresh network data arrives
    useEffect(() => {
        if (!rawTasks || (rawTasks as any).length === 0) return;

        const tasksArray = Array.isArray(rawTasks) ? rawTasks : [];

        const processed = tasksArray
            .filter((t: any) => {
                const agency = t.agency || t[1];
                // 1. Must be valid address
                if (!t || !agency || agency === '0x0000000000000000000000000000000000000000') return false;

                // 2. PRIVACY FILTER: If filtered addresses are provided, ONLY show tasks belonging to them
                if (addresses.length > 0) {
                    const agencyLower = agency.toLowerCase();
                    const isMyTask = addresses.some(addr => addr.toLowerCase() === agencyLower);
                    if (!isMyTask) return false;
                }

                return true;
            })
            .map((t: any, index: number) => {
                const id = t.id !== undefined ? Number(t.id) : (t[0] !== undefined ? Number(t[0]) : index);
                const agency = t.agency || t[1];
                const reward = t.reward !== undefined ? t.reward : t[2];
                const status = t.status !== undefined ? t.status : t[5];
                const metadataStr = t.metadataHash || t[6];
                const currentSubmissions = t.currentSubmissions !== undefined ? t.currentSubmissions : t[8];
                const requiredSubmissions = t.requiredSubmissions !== undefined ? t.requiredSubmissions : t[7];
                const deadline = t.deadline !== undefined ? t.deadline : t[4];
                const correctAnswerHash = t.correctAnswerHash || t[9];

                // AUTO-DETECCIÓN DE CAMPOS (Capa de resiliencia para contratos desincronizados)
                let actualStatus = Number(status || 0);
                let actualDeadline = Number(deadline || 0);
                let actualDeposit = Number(t.depositShares || t[3] || 0);
                let actualMetadataHash = metadataStr || '';

                // Si metadataHash parece un número (0-4) y status parece un timestamp (> 1e9)
                // significa que los campos están desplazados en el contrato desplegado
                const looksLikeInverted = (typeof actualMetadataHash === 'number' || (typeof actualMetadataHash === 'string' && actualMetadataHash.length <= 1)) && Number(status) > 1000000000;

                if (looksLikeInverted) {
                    actualStatus = Number(actualMetadataHash || 0);
                    actualDeadline = Number(status || 0);
                    actualDeposit = Number(deadline || 0);
                    actualMetadataHash = ''; // Metadata vendrá de correctAnswerHash como fallback
                }

                let metadata: any = { title: 'Unknown', description: 'No description', timeEstimate: '5 mins', tags: [], verification: 'auto' };

                try {
                    // Prioridad 1: metadataHash si contiene JSON
                    if (typeof actualMetadataHash === 'string' && actualMetadataHash.startsWith('{')) {
                        metadata = JSON.parse(actualMetadataHash);
                    }
                    // Prioridad 2: correctAnswerHash si contiene JSON (fallback histórico)
                    else if (typeof correctAnswerHash === 'string' && correctAnswerHash.startsWith('{')) {
                        metadata = JSON.parse(correctAnswerHash);
                    }
                } catch (e) {
                    console.warn('⚠️ Error parseando metadata en ID:', id, e);
                }

                return {
                    id: id,
                    agency: agency,
                    // Heuristic: If reward > 100,000 (100k USDC), it is likely an 18-decimal "bugged" task.
                    // 100k USDC in 6 decimals = 100,000 * 10^6 = 10^11.
                    // 1 USDC in 18 decimals = 10^18.
                    // So if raw > 10^14 (100 million USDC equivalent), treat as 18 decimals.
                    reward: (Number(formatUnits(BigInt(reward || 0), 18))).toFixed(2),
                    rewardValue: BigInt(reward || 0),
                    deposit: actualDeposit,
                    deadline: actualDeadline,
                    status: actualStatus,
                    metadataHash: actualMetadataHash || JSON.stringify(metadata),
                    requiredSubmissions: Number(requiredSubmissions || 1) || 1,
                    currentSubmissions: Number(currentSubmissions || 0) || 0,
                    correctAnswerHash: correctAnswerHash,
                    title: metadata.title || 'Unknown',
                    description: metadata.description || metadata.desc || 'No description',
                    timeEstimate: metadata.timeEstimate || '5 mins',
                    tags: metadata.tags || [],
                    metadata: metadata
                };
            });

        if (processed.length > 0) {
            setRawProcessedTasks(processed);
        }
    }, [rawTasks]);

    // FETCH PARTICIPATION IN BATCH
    const participationConfig = useMemo(() => {
        if (!workerAddress || !rawProcessedTasks.length) return [];
        return rawProcessedTasks.map(t => ({
            address: CONTRACTS.TaskEscrow.address,
            abi: CONTRACTS.TaskEscrow.abi,
            functionName: 'taskParticipated',
            args: [BigInt(t.id), workerAddress],
        }));
    }, [workerAddress, rawProcessedTasks]);

    const { data: participations } = useReadContracts({
        contracts: participationConfig as any,
        query: {
            enabled: !!workerAddress && rawProcessedTasks.length > 0,
            staleTime: 10000,
            retry: 2 // Retry failed checks automatically
        }
    });

    // CACHE PARTICIPATIONS TO PREVENT FLICKER (USER-SPECIFIC)
    const [participationMap, setParticipationMap] = useState<Record<string, boolean>>({});

    // Effect to handle user-specific cache loading and isolation
    useEffect(() => {
        if (typeof window !== 'undefined' && workerAddress) {
            try {
                const cacheKey = `arc_participation_cache_${workerAddress.toLowerCase()}`;
                const stored = localStorage.getItem(cacheKey);
                setParticipationMap(stored ? JSON.parse(stored) : {});
            } catch (e) {
                setParticipationMap({});
            }
        } else if (!workerAddress) {
            setParticipationMap({});
        }
    }, [workerAddress]);

    useEffect(() => {
        if (participations && rawProcessedTasks.length > 0 && participations.length === rawProcessedTasks.length) {
            setParticipationMap(prev => {
                const next = { ...prev };
                let hasChanges = false;

                participations.forEach((p, i) => {
                    const task = rawProcessedTasks[i];
                    // Only update if success.
                    if (task && p.status === 'success') {
                        const rpcSaysParticipated = p.result === true;
                        const currentlyParticipated = next[task.id] === true;

                        // STICKY LOGIC: Once true, stay true. 
                        // Only update if we are flipping from false -> true.
                        // Never flip true -> false based on RPC (RPC might be lagging behind our local optimistic write)
                        if (rpcSaysParticipated && !currentlyParticipated) {
                            next[task.id] = true;
                            hasChanges = true;
                        }
                        // If RPC says false, but we have true locally, IGNORE RPC. Trust local.
                    }
                });

                if (hasChanges && workerAddress) {
                    const cacheKey = `arc_participation_cache_${workerAddress.toLowerCase()}`;
                    localStorage.setItem(cacheKey, JSON.stringify(next));
                    return next;
                }
                return prev;
            });
        }
    }, [participations, rawProcessedTasks, workerAddress]);

    const allTasks = useMemo(() => {
        return rawProcessedTasks.map((t) => ({
            ...t,
            hasParticipated: participationMap[t.id] === true
        }));
    }, [rawProcessedTasks, participationMap]);

    const filteredTasks = useMemo(() => {
        if (addresses.length === 0) return allTasks;
        const lowerAddresses = addresses.map((a: any) => a?.toLowerCase()).filter(Boolean);
        if (lowerAddresses.length === 0) return allTasks;

        return allTasks.filter((t: any) => {
            const agencyAddr = t.agency?.toLowerCase();
            return agencyAddr && lowerAddresses.includes(agencyAddr);
        });
    }, [allTasks, addresses]);

    const isInitialLoading = isTasksLoading && allTasks.length === 0;

    const refetch = async () => {
        await refetchTasks?.();
    };

    const markAsParticipated = (taskId: string | number) => {
        if (!workerAddress) return;
        const idStr = taskId.toString();
        const cacheKey = `arc_participation_cache_${workerAddress.toLowerCase()}`;
        setParticipationMap(prev => {
            const next = { ...prev, [idStr]: true };
            localStorage.setItem(cacheKey, JSON.stringify(next));
            return next;
        });
    };

    return {
        tasks: filteredTasks,
        allTasks,
        isLoading: isInitialLoading,
        isSyncing: isTasksLoading,
        taskCounter: taskCount ? Number(taskCount) : allTasks.length,
        allTasksCount: allTasks.length,
        actualContractCount: taskCount ? Number(taskCount) : 0,
        readError: lastError, // Use persistent lastError
        refetch,
        markAsParticipated // Export new function
    };
}
