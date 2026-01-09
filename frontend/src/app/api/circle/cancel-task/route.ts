import { NextResponse } from 'next/server';
import { createCircleContractCall, getCircleWallet, createCircleSession, getOrCreateCircleUser } from '@/arcworker-sdk/wallet/server';
import { CONTRACTS } from '@/utils/contracts';
import { publicClient } from '@/utils/platform-admin';

export async function POST(request: Request) {
    try {
        const { userId, taskId, userToken: providedUserToken, encryptionKey: providedEncryptionKey } = await request.json();

        if (!userId || !taskId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        let userToken = providedUserToken;
        let encryptionKey = providedEncryptionKey;
        let finalUserId = userId;

        // 0. Ensure user exists and get their TRUE Circle ID
        if (userId) {
            const circleUserObj = await getOrCreateCircleUser(userId);
            finalUserId = circleUserObj.userId || userId;
        }

        if (!userToken) {
            const session = await createCircleSession(finalUserId);
            userToken = session.userToken;
            encryptionKey = session.encryptionKey;
        }

        // 2. Get Wallet (with Auto-Refresh for expired tokens)
        let wallet;
        try {
            wallet = await getCircleWallet(userToken);
            if (!wallet) throw new Error('Wallet not found');
        } catch (e: any) {
            const isExpired = e.response?.data?.code === 155104 || e.message?.includes('expired');
            if (isExpired && userId) {
                console.log(`[Circle API] Token expired. Refreshing session for userId: ${userId}`);
                const session = await createCircleSession(userId);
                userToken = session.userToken;
                encryptionKey = session.encryptionKey;
                wallet = await getCircleWallet(userToken);
            } else {
                throw e;
            }
        }

        if (!wallet) {
            return NextResponse.json({ error: 'Circle wallet not found' }, { status: 404 });
        }

        const circleAddress = wallet.address;
        console.log(`[Circle API] Requesting cancellation for Task #${taskId} from wallet ${circleAddress}`);

        // 1. Verify Task State on-chain before attempting Circle call
        try {
            const task = await publicClient.readContract({
                address: CONTRACTS.TaskEscrow.address,
                abi: CONTRACTS.TaskEscrow.abi,
                functionName: 'tasks',
                args: [BigInt(taskId)],
            }) as any;

            const agencyOnChain = task[1];
            const statusOnChain = Number(task[5]); // Status is at index 5 in the Task struct

            console.log(`[Circle API] Task #${taskId} state: Agency=${agencyOnChain}, Status=${statusOnChain}`);

            if (agencyOnChain.toLowerCase() !== circleAddress.toLowerCase()) {
                console.error(`[Circle API] PERMISSION DENIED: Wallet ${circleAddress} is not the agency ${agencyOnChain}`);
                return NextResponse.json({
                    error: 'Permission Denied',
                    message: `Security Check Failed: This task was created by ${agencyOnChain}, but you are logged in with ${circleAddress}.`
                }, { status: 403 });
            }

            // Status 0=Created can be cancelled. Status 1 (Submitted) usually implies funds are locked until approval/rejection, but cancelTask might be allowed depending on contract logic (usually refunds agency).
            // Checking logic: usually cancel allows if not approved/completed.
            if (statusOnChain >= 2) {
                // 2=Approved, 3=Rejected, 4=Cancelled (Assuming enum order)
                // If already cancelled or approved, we can't cancel.
                // Actually contract V3 cancelTask requires status == Created? Or allow Submitted?
                // Let's assume standard logic: Only 'Created' (0) or maybe 'Submitted' (1) if no work done. 
                // But strictly, let's rely on contract to revert if invalid, but warned here.
                if (statusOnChain === 4) {
                    return NextResponse.json({ error: 'Already Cancelled', message: 'Task is already cancelled.' }, { status: 400 });
                }
            }

        } catch (readError: any) {
            console.error(`[Circle API] RPC ERROR during pre-check:`, readError.message);
            // Non-blocking, proceed to try simulation
        }

        // 0. Ensure we have an encryption key BEFORE creating the challenge
        // This prevents creating a challenge for one token and returning another refreshed token.
        if (!encryptionKey && finalUserId) {
            console.log(`[Circle API] Request missing encryption key. Forcing session refresh BEFORE challenge...`);
            const session = await createCircleSession(finalUserId);
            userToken = session.userToken;
            encryptionKey = session.encryptionKey;
        }

        // Initiate contract call: cancelTasksBatch(uint256[]) or cancelTask(uint256)
        // If taskId is an array or we want to force batching:
        const isBatch = Array.isArray(taskId);
        const method = isBatch ? 'cancelTasksBatch(uint256[])' : 'cancelTask(uint256)';
        const args = isBatch ? [taskId.map(id => id.toString())] : [taskId.toString()];

        console.log(`[Circle API] Calling ${method} with args:`, JSON.stringify(args));

        const challengeId = await createCircleContractCall(
            userToken,
            wallet.id,
            CONTRACTS.TaskEscrow.address,
            method,
            args,
            undefined
        );

        return NextResponse.json({
            challengeId,
            userToken,
            appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID,
            encryptionKey,
            userId: finalUserId
        });
    } catch (error: any) {
        const errorData = error.response?.data || error.message;
        const msg = error.response?.data?.message || error.message || "Unknown server error";
        console.error('Circle Cancel Error:', JSON.stringify(errorData, null, 2));

        return NextResponse.json({
            error: msg,
            message: msg,
            details: errorData,
            status: 500
        }, { status: 500 });
    }
}
