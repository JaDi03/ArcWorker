import { useMemo, useState, useEffect } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';

/**
 * Custom hook to fetch and normalize tasks from the TaskEscrow contract.
 * @param addressOrAddresses Optional address or array of addresses to filter tasks
 * @returns 
 */
export function useTasks(addressOrAddresses?: string | string[]) {
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
        args: [BigInt(100)], // Fetch last 100 for better coverage
        query: {
            staleTime: 5000,
            refetchInterval: 5000,
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

    const [allTasks, setAllTasks] = useState<any[]>([]);

    useEffect(() => {
        localStorage.removeItem('arc_tasks_cache');
    }, []);

    // Effect to update local state when fresh network data arrives
    useEffect(() => {
        if (!rawTasks || (rawTasks as any).length === 0) return;

        const tasksArray = Array.isArray(rawTasks) ? rawTasks : [];

        const processed = tasksArray
            .filter((t: any) => {
                const agency = t.agency || t[1];
                return t && agency && agency !== '0x0000000000000000000000000000000000000000';
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
                    reward: (Number(reward || 0) / 1e6).toFixed(2),
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
            setAllTasks(processed);
        }
    }, [rawTasks]);

    const filteredTasks = useMemo(() => {
        if (addresses.length === 0) return [];
        const lowerAddresses = addresses.map((a: any) => a?.toLowerCase()).filter(Boolean);
        if (lowerAddresses.length === 0) return [];

        return allTasks.filter((t: any) => {
            const agencyAddr = t.agency?.toLowerCase();
            return agencyAddr && lowerAddresses.includes(agencyAddr);
        });
    }, [allTasks, addresses]);

    const isInitialLoading = isTasksLoading && allTasks.length === 0;

    const refetch = async () => {
        await refetchTasks?.();
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
        refetch
    };
}
