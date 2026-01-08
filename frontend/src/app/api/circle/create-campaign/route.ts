import { NextResponse } from 'next/server';
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
        const { userId, userToken: providedUserToken, args: passedArgs, amount } = await request.json();
        args = passedArgs;
        amountStr = amount;

        if ((!userId && !providedUserToken) || !args || !amountStr) {
            return NextResponse.json({ error: 'Missing required parameters (userId or userToken, args, amount)' }, { status: 400 });
        }

        let sessionToken = providedUserToken;
        let sessionKey = '';

        let bridgedId = userId;

        // 0. Token-First Identity Resolution
        // If a session token is provided, trust Circle's own identity resolution for that token.
        // This is crucial for OTP users whose primary ID is a UUID, not their email.
        if (sessionToken) {
            const actualTokenUserId = await getUserIdFromToken(sessionToken);
            if (actualTokenUserId) {
                console.log(`[Circle API] Trusting identity from provided session token: ${actualTokenUserId} (Attempted: ${userId || 'unknown'})`);

                // If we also have a username/email from the request, update our records to associate it with this UUID
                if (userId && actualTokenUserId !== userId) {
                    updateUserCircleId(userId, actualTokenUserId).catch(() => { });
                }

                bridgedId = actualTokenUserId;
            }
        }

        // 1. Fallback: Ensure user exists and get bridged identity if no token ID was found
        if (!bridgedId && userId) {
            const bridgedUser = await getOrCreateCircleUser(userId);
            bridgedId = bridgedUser.userId;
        }

        if (!bridgedId) {
            return NextResponse.json({ error: 'Identity Missing', message: 'Could not resolve a valid Circle identity.' }, { status: 400 });
        }

        // 2. Discover Funded Wallet
        let walletResult;
        try {
            console.log(`[Circle API] Scanning for funded wallet for user context...`);
            walletResult = await findFundedWallet(sessionToken, amountStr);
        } catch (scanError: any) {
            const errorMsg = scanError.response?.data?.message || "";
            if (errorMsg.includes("userToken had expired") && bridgedId) {
                console.log(`[Circle API] Session expired detected. Auto-refreshing for ${bridgedId}...`);
                const session = await createCircleSession(bridgedId);
                sessionToken = session.userToken;
                sessionKey = session.encryptionKey;
                walletResult = await findFundedWallet(sessionToken, amountStr);
            } else {
                throw scanError;
            }
        }

        const { wallet, balances } = walletResult;

        if (!wallet) {
            return NextResponse.json({
                error: 'Identity Error',
                message: 'No programmable wallet found for this user in Circle. Please ensure your wallet is initialized.',
                status: 400
            }, { status: 400 });
        }

        // 3. Balance Guard
        // En ARC Testnet, el token nativo es USDC (18 decimales). 
        // Circle identifica el token de gas con isNative: true.
        const gasToken = balances.find((b: any) => b.token?.isNative);
        const currentBalance = gasToken ? parseFloat(gasToken.amount) : 0;
        const required = parseFloat(amountStr);

        console.log(`[Circle API] Red: ARC Testnet | Wallet: ${wallet.address} | Balance Nativo (USDC): ${currentBalance}`);

        if (currentBalance < required) {
            return NextResponse.json({
                error: `Insufficient Funds`,
                message: `Your wallet needs more USDC to create this campaign and cover gas on ARC.`,
                walletAddress: wallet.address,
                requiredAmount: amountStr,
                currentBalance: currentBalance,
                status: 400
            }, { status: 400 });
        }

        // --- AMOUNT FORMAT FOR CIRCLE ---
        // Circle Web3 Services expects the amount in USDC (e.g., "1.575"), NOT atomic units.
        // Arc Testnet uses USDC as native gas token, so we pass the human-readable amount.
        const amountInUsdc = parseFloat(amountStr).toFixed(6); // Keep 6 decimals precision

        // 4. Execute Contract Call
        console.log(`[Circle API] Executing createTasksBatch at: ${CONTRACTS.TaskEscrow.address} | Total Value (USDC): ${amountInUsdc}`);
        const challengeId = await createCircleContractCall(
            sessionToken,
            wallet.id,
            CONTRACTS.TaskEscrow.address,
            'createTasksBatch(uint256,uint256,uint256,string)',
            args,
            amountInUsdc
        );

        return NextResponse.json({
            userToken: sessionToken,
            encryptionKey: sessionKey,
            challengeId: challengeId,
            appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID,
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
