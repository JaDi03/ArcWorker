import { NextResponse } from 'next/server';
import { createCircleContractCall, getCircleWallet, createCircleSession, getOrCreateCircleUser } from '@/arcworker-sdk/wallet/server';
import { CONTRACTS } from '@/utils/contracts';
import { platformAutoVerify } from '@/utils/platform-admin';

export async function POST(request: Request) {
    try {
        const { userId, taskId, answer, userToken: providedUserToken, encryptionKey: providedEncryptionKey } = await request.json();

        if (!userId || !taskId || !answer) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Use provided token or get encryption key from storage
        let userToken = providedUserToken;
        let encryptionKey = providedEncryptionKey;

        if (!userToken) {
            return NextResponse.json({
                error: 'No session token provided. Please log in again.'
            }, { status: 401 });
        }

        // If no encryption key provided, that's okay - Circle will handle it for OTP users
        if (!encryptionKey) {
            console.log(`[API] No encryption key provided, Circle will handle authentication`);
            encryptionKey = ''; // Empty string for OTP users
        }

        // 2. Get the wallet ID (needed for the contract call)
        let wallet;
        try {
            wallet = await getCircleWallet(userToken);
        } catch (e: any) {
            const errorMsg = e.response?.data?.message || e.message;
            if (errorMsg.includes('expired') || errorMsg.includes('invalid')) {
                return NextResponse.json({
                    error: 'Session expired. Please refresh the page and try again.'
                }, { status: 401 });
            }
            throw e;
        }

        if (!wallet) {
            return NextResponse.json({ error: 'Circle wallet not found' }, { status: 404 });
        }

        // 3. Initiate contract call: submitTask(taskId, answer)
        console.log('[API] About to call createCircleContractCall with:', {
            walletId: wallet.id,
            contractAddress: CONTRACTS.TaskEscrow.address,
            functionSig: 'submitTask(uint256,string)',
            params: [taskId.toString(), answer]
        });

        const challengeId = await createCircleContractCall(
            userToken,
            wallet.id,
            CONTRACTS.TaskEscrow.address,
            'submitTask(uint256,string)',
            [taskId.toString(), answer]
        );

        // 4. Platform Auto-Verify Logic
        // MOVED: We now trigger this from the frontend AFTER the user signs the challenge.
        // This prevents the "race condition" where we checked for a tx that hadn't been broadcast yet.

        return NextResponse.json({ challengeId, userToken, appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID, encryptionKey });
    } catch (error: any) {
        console.error('Circle Submit Error:', error.response?.data || error.message);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        console.error('Error response:', JSON.stringify(error.response, null, 2));
        return NextResponse.json({
            error: 'Failed to initiate gasless submission',
            details: error.response?.data || error.message,
            fullError: error.toString()
        }, { status: 500 });
    }
}
