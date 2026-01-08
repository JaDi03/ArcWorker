import { NextResponse } from 'next/server';
import { createCircleContractCall, createCircleSession, getCircleWallet, getOrCreateCircleUser } from '@/arcworker-sdk/wallet/server';
import { CONTRACTS } from '@/utils/contracts';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        let { userId, amount, userToken, encryptionKey } = body;

        console.log(`[API] Withdraw Request for User ${userId}, Amount: ${amount}`);

        // 0. Ensure user exists
        if (userId) {
            await getOrCreateCircleUser(userId);
        }

        // 1. Ensure Valid Session (FIRST)
        if (!userToken || !encryptionKey) {
            console.log(`[API] Missing credentials. Refreshing session for ${userId}`);
            const session = await createCircleSession(userId);
            userToken = session.userToken;
            encryptionKey = session.encryptionKey;
        }

        // 2. Ensure Wallet ID exists (using valid User Token)
        let walletId: string;
        try {
            const wallet = await getCircleWallet(userToken);
            if (!wallet || !wallet.id) {
                throw new Error(`No wallet found for user ${userId}`);
            }
            walletId = wallet.id;
        } catch (e: any) {
            console.error("[API] Failed to get wallet details using token:", e.message);
            // One retry with fresh session?
            console.log("[API] Retrying with fresh session...");
            const session = await createCircleSession(userId);
            userToken = session.userToken;
            encryptionKey = session.encryptionKey;
            const wallet = await getCircleWallet(userToken);
            if (!wallet || !wallet.id) throw new Error("Wallet not found after retry");
            walletId = wallet.id;
        }

        console.log(`[API] Withdraw - WalletID: ${walletId}, UserToken: ${userToken ? 'Present' : 'Missing'}`);

        // 3. Execute Contract Call: withdrawSavings(uint256 amount)
        try {
            const challengeId = await createCircleContractCall(
                userToken,
                walletId,
                CONTRACTS.TaskEscrow.address,
                'withdrawSavings(uint256)',
                [amount], // Args
                undefined
            );

            return NextResponse.json({
                challengeId,
                userToken,
                encryptionKey,
                appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID
            });
        } catch (innerError: any) {
            console.error("[API] Circle Contract Call Failed:", JSON.stringify(innerError?.response?.data || innerError.message, null, 2));
            throw innerError; // Re-throw to be caught by outer block
        }

    } catch (error: any) {
        console.error("Withdraw Error Full:", error);
        return NextResponse.json({
            error: error.message || "Withdrawal failed",
            details: error?.response?.data || "No details"
        }, { status: 500 });
    }
}
