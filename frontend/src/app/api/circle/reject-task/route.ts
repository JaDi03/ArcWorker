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
            if (isExpired && finalUserId) {
                console.log(`[Circle API] Token expired. Refreshing session for userId: ${finalUserId}`);
                const session = await createCircleSession(finalUserId);
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
        console.log(`[Circle API] Requesting rejection for Task #${taskId} from wallet ${circleAddress}`);

        // 1. Verify Task State on-chain
        try {
            const task = await publicClient.readContract({
                address: CONTRACTS.TaskEscrow.address,
                abi: CONTRACTS.TaskEscrow.abi,
                functionName: 'tasks',
                args: [BigInt(taskId)],
            }) as any;

            const agencyOnChain = task[1];
            const statusOnChain = Number(task[5]); // Status is at index 5 in the Task struct

            if (agencyOnChain.toLowerCase() !== circleAddress.toLowerCase()) {
                console.error(`[Circle API] REJECT PERMISSION DENIED: Wallet ${circleAddress} is not the agency ${agencyOnChain}`);
                return NextResponse.json({
                    error: 'Permission Denied',
                    message: `Only the agency (${agencyOnChain}) can reject this task.`
                }, { status: 403 });
            }

            if (statusOnChain !== 1) {
                return NextResponse.json({
                    error: 'Invalid Task Status',
                    message: `Tasks must be in 'Submitted' state to be rejected.`
                }, { status: 400 });
            }
        } catch (readError: any) {
            console.error(`[Circle API] RPC ERROR during pre-check for rejection:`, readError.message);
            if (readError.message.includes('502') || readError.message.includes('Gateway')) {
                return NextResponse.json({
                    error: 'Network Error (RPC Down)',
                    message: 'The Arc Network RPC is currently unstable (502). Please try again in a few minutes.'
                }, { status: 502 });
            }
        }

        // 0. Ensure we have an encryption key BEFORE creating the challenge
        if (!encryptionKey && finalUserId) {
            console.log(`[Circle API] Request missing encryption key. Forcing session refresh BEFORE challenge...`);
            const session = await createCircleSession(finalUserId);
            userToken = session.userToken;
            encryptionKey = session.encryptionKey;
        }

        // Initiate contract call: rejectTask(taskId)
        const challengeId = await createCircleContractCall(
            userToken,
            wallet.id,
            CONTRACTS.TaskEscrow.address,
            'rejectTask(uint256)',
            [taskId.toString()]
        );


        return NextResponse.json({ challengeId, userToken, appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID, encryptionKey });
    } catch (error: any) {
        console.error('Circle Reject Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: 'Failed to initiate gasless rejection',
            details: error.response?.data
        }, { status: 500 });
    }
}
