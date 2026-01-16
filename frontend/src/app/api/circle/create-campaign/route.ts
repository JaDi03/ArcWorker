import { NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import {
    createCircleContractCall,
    createCircleSession,
    getOrCreateCircleUser,
    findFundedWallet,
    verifyCircleSession,
    getUserIdFromToken
} from '@/arcworker-sdk/wallet/server';
import { CONTRACTS } from '@/utils/contracts';
import { updateUserCircleId } from '@/utils/db';

export async function POST(request: Request) {
    let args: any[] = [];
    let amountStr: string = "0";

    try {
        const body = await request.json();
        const { userId, userToken: providedUserToken, amount } = body;

        // Reconstruct args from body if they are not passed directly
        const rewardPerTask = body.rewardPerTask || 0.15;
        const taskCount = body.taskCount || 10;
        const deadlineDays = body.deadlineDays || 7;
        const metadataHash = body.metadataHash || "";
        const requiredSubmissions = body.requiredSubmissions || 1;
        const correctAnswerHash = body.correctAnswerHash || "0x0000000000000000000000000000000000000000000000000000000000000000";

        // CRITICAL FIX: Arc Testnet Native USDC (Gas) is 18 decimals.
        // Even if the ERC-20 interface says 6, the system expects 18-decimal raw values for native transfers.
        // We must send 10^18 units to transfer 1 full token.
        const rewardInAtoms = parseUnits(rewardPerTask.toString(), 18);
        const totalAmountInAtoms = parseUnits(amount.toString(), 18); // Use 18 decimals for total amount
        const deadlineSeconds = deadlineDays * 24 * 3600;

        args = [
            rewardInAtoms.toString(),
            taskCount.toString(),
            deadlineSeconds.toString(),
            metadataHash,
            requiredSubmissions.toString(),
            correctAnswerHash
        ];

        amountStr = amount;

        if ((!userId && !providedUserToken) || !amountStr) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        let sessionToken = providedUserToken;
        let sessionKey = '';
        let bridgedId = userId;

        // ... (identity resolution logic remains)
        if (sessionToken) {
            const actualTokenUserId = await getUserIdFromToken(sessionToken);
            if (actualTokenUserId) {
                if (userId && actualTokenUserId !== userId) {
                    updateUserCircleId(userId, actualTokenUserId).catch(() => { });
                }
                bridgedId = actualTokenUserId;
            }
        }

        if (!bridgedId && userId) {
            const bridgedUser = await getOrCreateCircleUser(userId);
            bridgedId = bridgedUser.userId;
        }

        if (!bridgedId) {
            return NextResponse.json({ error: 'Identity Missing' }, { status: 400 });
        }

        // ... (finding funded wallet remains)
        let walletResult = await findFundedWallet(sessionToken, amountStr);
        const { wallet, balances } = walletResult;

        if (!wallet) return NextResponse.json({ error: 'No wallet found' }, { status: 400 });

        const amountInUsdc = parseFloat(amountStr).toFixed(6); // USDC uses 6 decimals
        const functionSignature = 'createTasksBatch(uint256,uint256,uint256,string,uint256,bytes32)';

        console.log(`[Circle API] Executing ${functionSignature} | Value: ${amountInUsdc}`);

        let challengeId;
        try {
            challengeId = await createCircleContractCall(
                sessionToken,
                wallet.id,
                CONTRACTS.TaskEscrow.address,
                functionSignature,
                args,
                amountInUsdc
            );
        } catch (callError: any) {
            // Retry logic
            const session = await createCircleSession(bridgedId);
            sessionToken = session.userToken;
            sessionKey = session.encryptionKey;
            challengeId = await createCircleContractCall(
                sessionToken,
                wallet.id,
                CONTRACTS.TaskEscrow.address,
                functionSignature,
                args,
                amountInUsdc
            );
        }

        return NextResponse.json({
            userToken: sessionToken,
            encryptionKey: sessionKey,
            challengeId: challengeId,
            appId: process.env.CIRCLE_APP_ID || process.env.NEXT_PUBLIC_CIRCLE_APP_ID,
            userId: bridgedId
        });

    } catch (error: any) {
        const errorData = error.response?.data || error.message;
        const msg = error.response?.data?.message || error.message || "Unknown server error";
        console.error('[ArcWorker Server] Create Campaign Critical Error:', JSON.stringify(errorData, null, 2));

        return NextResponse.json({
            error: msg,
            message: msg,
            details: errorData,
            raw: error.response?.data,
            diagnostics: {
                args: args,
                amount: amountStr,
                contract: CONTRACTS.TaskEscrow.address
            }
        }, { status: 500 });
    }
}
