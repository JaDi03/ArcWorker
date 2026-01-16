import React, { useEffect, useState, useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';
import { formatUnits, parseEther } from 'viem';

interface LiveYieldCounterProps {
    address: `0x${string}`;
}

import { useTasks } from '@/hooks/useTasks';

export function LiveYieldCounter({ address }: LiveYieldCounterProps) {
    const { isConnected } = useAccount();
    const [now, setNow] = useState(Date.now());

    // 1. Read User's Shares from TaskEscrow (Liquid Savings)
    const { data: savingsShares, refetch: refetchShares } = useReadContract({
        address: CONTRACTS.TaskEscrow.address,
        abi: CONTRACTS.TaskEscrow.abi,
        functionName: 'savingsShares',
        args: [address],
    });

    // 1b. Read User's Locked Shares from Active Tasks (AUM)
    const { tasks } = useTasks(address);
    const lockedShares = useMemo(() => {
        if (!tasks) return BigInt(0);
        return tasks.reduce((acc: bigint, task: any) => {
            // Only count active tasks where user is Agency
            if (task.agency?.toLowerCase() === address.toLowerCase() && (task.status === 0 || task.status === 1)) {
                return acc + (typeof task.deposit === 'bigint' ? task.deposit : BigInt(task.deposit || 0));
            }
            return acc;
        }, BigInt(0));
    }, [tasks, address]);

    // Combined Shares for Display
    const totalUserShares = useMemo(() => {
        const liquid = savingsShares ? BigInt(savingsShares as any) : BigInt(0);
        return liquid + lockedShares;
    }, [savingsShares, lockedShares]);


    // 2. Read Vault Stats (Global) ...
    const { data: vaultTotalAssets } = useReadContract({
        address: CONTRACTS.MockYieldVault.address,
        abi: CONTRACTS.MockYieldVault.abi,
        functionName: 'totalAssets',
    });

    const { data: vaultTotalDeposited } = useReadContract({
        address: CONTRACTS.MockYieldVault.address,
        abi: CONTRACTS.MockYieldVault.abi,
        functionName: 'totalAssetsDeposited',
    });

    const { data: vaultTotalShares } = useReadContract({
        address: CONTRACTS.MockYieldVault.address,
        abi: CONTRACTS.MockYieldVault.abi,
        functionName: 'totalShares',
    });

    // ... Withdraw Actions ...
    const { writeContract: withdraw, data: withdrawTx, isPending: isWithdrawing } = useWriteContract();

    const { isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({
        hash: withdrawTx,
    });

    useEffect(() => {
        if (isWithdrawSuccess) {
            refetchShares();
        }
    }, [isWithdrawSuccess, refetchShares]);

    // 4. Live Interpolation ...
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(interval);
    }, []);

    const stats = useMemo(() => {
        if (!vaultTotalShares || !vaultTotalAssets || !vaultTotalDeposited) {
            return { principal: 0, yield: 0, total: 0, liquidYield: 0 };
        }

        // Use TOTAL shares (Liquid + Locked) for the Big Number
        const uShares = totalUserShares;
        const vShares = BigInt(vaultTotalShares as any);
        const vAssets = BigInt(vaultTotalAssets as any);
        const vPrincipal = BigInt(vaultTotalDeposited as any);

        if (vShares === BigInt(0)) return { principal: 0, yield: 0, total: 0, liquidYield: 0 };

        // Current Asset Value of User's Shares
        const userValueBig = (uShares * vAssets) / vShares;
        const userValue = Number(formatUnits(userValueBig, 18));

        // Calculate "Implied Principal" 
        let principal = 0;
        if (vAssets > BigInt(0)) {
            const userPrincipalBig = (userValueBig * vPrincipal) / vAssets;
            principal = Number(formatUnits(userPrincipalBig, 18));
        }

        const yieldEarned = userValue - principal;

        // Calculate Liquid Yield Only (for Withdraw Button)
        const liquidSharesBig = savingsShares ? BigInt(savingsShares as any) : BigInt(0);
        const liquidValueBig = (liquidSharesBig * vAssets) / vShares;
        const liquidPrincipalBig = (liquidValueBig * vPrincipal) / vAssets;
        const liquidYieldBig = liquidValueBig - liquidPrincipalBig; // Approximation
        const liquidYield = Number(formatUnits(liquidYieldBig, 18));

        // Note: liquidYield calculation above is rough. 
        // Better: We just let them withdraw whatever matches 'savingsShares' value?
        // Actually, withdrawSavings takes an Amount in Assets.
        // So we should calculate the Asset Value of savingsShares.
        const liquidAssetValue = Number(formatUnits((liquidSharesBig * vAssets) / vShares, 18));

        return {
            principal,
            yield: yieldEarned, // Total Yield (Locked + Liquid)
            total: userValue,
            liquidValue: liquidAssetValue
        };

    }, [totalUserShares, savingsShares, vaultTotalAssets, vaultTotalDeposited, vaultTotalShares]);

    // Visual Interpolation
    const tick = (now % 10000) / 10000;
    const totalDisplay = stats.total > 0 ? (stats.total + (stats.total * 0.05 / 31536000 * (now % 60000) / 1000)).toFixed(4) : "0.0000";
    const yieldDisplay = stats.yield > 0 ? (stats.yield + (stats.total * 0.05 / 31536000 * (now % 60000) / 1000)).toFixed(4) : "0.0000";

    const [userRole, setUserRole] = useState<'worker' | 'agency' | 'developer' | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('arc_user');
        if (saved) {
            try {
                const p = JSON.parse(saved);
                setUserRole(p.role);
            } catch (e) { }
        }
    }, []);

    const handleWithdrawYield = async () => {
        const safeLiquid = stats.liquidValue || 0;
        const safeTotal = stats.total || 0;
        const safePrincipal = stats.principal || 0;

        if (safeLiquid <= 0) return;

        // Logic branching based on Role
        // Agency: "Should be only yield" (Profit taking)
        // Worker: "Withdraw everything" (Paycheck + Yield)

        let amountToCheck = 0;

        if (userRole === 'worker') {
            // Workers take it all. 
            // Passing 0 triggers 'Withdraw Max' in the smart contract logic
            // ensuring we don't fail due to floating point precision errors.
            amountToCheck = 0;
        } else {
            // Agencies take yield only (default behavior)
            const yieldToClaim = Math.min(safeTotal - safePrincipal, safeLiquid);
            amountToCheck = yieldToClaim > 0.000001 ? yieldToClaim : safeLiquid;
        }

        // Convert to Wei
        // If 0, we pass 0 string. If not, we parse.
        const amountWei = amountToCheck === 0 ? "0" : parseEther(amountToCheck.toFixed(18)).toString();

        // 1. Circle Flow
        const circleUser = localStorage.getItem('arc_user');

        // FIX: Check !isConnected instead of !address (which is the prop)
        if (circleUser && !isConnected) {
            try {
                const user = JSON.parse(circleUser);
                const userId = user.id || user.userId;
                const userToken = localStorage.getItem('arc_session_token');
                const encryptionKey = localStorage.getItem('arc_encryption_key');

                console.log("[Withdraw] Initiating Circle Gasless Withdrawal for:", userId);
                const { W3SSdk } = await import('@circle-fin/w3s-pw-web-sdk');
                const axios = (await import('axios')).default;
                // WAIT. I cannot finish this without the API route.
                // I will assume '/api/circle/withdraw' exists for this step and then create it immediately after.

                const res = await axios.post('/api/circle/withdraw', {
                    userId,
                    amount: amountWei.toString(),
                    userToken,
                    encryptionKey
                });

                console.log("[DEBUG] API Response:", res.data);

                const { challengeId, appId, userToken: updatedUserToken, encryptionKey: updatedEncryptionKey } = res.data;

                // Persist fresh tokens
                if (updatedUserToken && updatedUserToken !== userToken) {
                    localStorage.setItem('arc_session_token', updatedUserToken);
                    if (updatedEncryptionKey) localStorage.setItem('arc_encryption_key', updatedEncryptionKey);
                }

                const sdk = new W3SSdk();
                sdk.setAppSettings({ appId: appId || process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '' });
                sdk.setAuthentication({
                    userToken: updatedUserToken || userToken || '',
                    encryptionKey: updatedEncryptionKey || encryptionKey || ''
                });

                await new Promise((resolve, reject) => {
                    sdk.execute(challengeId, (error: any, result: any) => {
                        if (error) {
                            console.error("SDK Execution Failed:", JSON.stringify(error, null, 2));
                            reject(error);
                        }
                        else resolve(result);
                    });
                });

                alert("✅ Withdrawal Successful!");
                refetchShares();
            } catch (e: any) {
                console.error("Withdraw Error Full:", e);
                const err = typeof e === 'object' ? JSON.stringify(e?.response?.data || e, null, 2) : e.message;
                alert(`Withdrawal Failed: ${err}`);
            }
            return;
        }

        // 2. Wagmi Flow
        withdraw({
            address: CONTRACTS.TaskEscrow.address,
            abi: CONTRACTS.TaskEscrow.abi,
            functionName: 'withdrawSavings',
            args: [amountWei] // Withdraw specific yield amount
        });
    };

    return (
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div
                className="rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group"
                // Metallic Blue: Deep base + Shine + Inset Shadow for depth
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #60a5fa 100%)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), inset 0 0 20px rgba(255,255,255,0.1)'
                }}
            >
                {/* ... (Header remains same) ... */}
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center px-2">
                    <div className="text-center md:text-left mb-6 md:mb-0">
                        {/* ... */}
                        <div className="flex items-center space-x-2 mb-2 justify-center md:justify-start">
                            <span className="bg-white/20 p-1 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                </svg>
                            </span>
                            <p className="text-white/90 font-bold uppercase tracking-widest text-xs">Arc High-Yield Savings</p>
                            <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold">5.0% APY</span>
                        </div>

                        <div className="flex items-baseline space-x-1 font-mono">
                            <span className="text-5xl md:text-6xl font-black tracking-tighter tabular-nums drop-shadow-md">
                                {totalDisplay.split('.')[0]}.
                                <span className="text-4xl md:text-5xl">{totalDisplay.split('.')[1]}</span>
                            </span>
                            <span className="text-2xl font-bold opacity-80 uppercase ml-2">USDC</span>
                        </div>
                        <p className="text-white/60 text-sm mt-1 font-medium bg-black/10 inline-block px-3 py-1 rounded-full border border-white/5">
                            Principal: ${(stats.principal || 0).toFixed(2)} • Liquid: ${(stats.liquidValue || 0).toFixed(2)}
                        </p>
                    </div>

                    <div className="flex flex-col space-y-3 w-full md:w-auto min-w-[200px]">
                        <button
                            onClick={handleWithdrawYield}
                            disabled={isWithdrawing || (stats.liquidValue || 0) < 0.000001}
                            className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/40 font-bold py-3 px-6 rounded-xl transition-all active:scale-95 flex justify-between items-center group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                            title={userRole === 'worker' ? 'Withdraw All Funds' : 'Withdraw Accumulated Yield'}
                        >
                            <span>{userRole === 'worker' ? 'Withdraw All' : 'Claim Yield'}</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-xs ml-2 group-hover/btn:bg-white/30">
                                {userRole === 'worker'
                                    ? `$${(stats.liquidValue || 0).toFixed(2)}`
                                    : `$${((stats.total || 0) - (stats.principal || 0)).toFixed(2)}`
                                }
                            </span>
                        </button>
                    </div>
                </div>

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full -ml-16 -mb-16 blur-2xl"></div>
            </div>
        </div>
    );
}
