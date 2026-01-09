import { NextResponse } from 'next/server';
import { initializeCircleWallet, getCircleWallet, getUserIdFromToken } from '@/arcworker-sdk/wallet/server';

export async function POST(request: Request) {
    try {
        const { userToken } = await request.json();

        if (!userToken) {
            return NextResponse.json({ error: 'User Token is required' }, { status: 400 });
        }

        const userId = await getUserIdFromToken(userToken);

        if (!userId) {
            return NextResponse.json({
                error: 'Session expired or invalid token',
                message: 'Please log out and log in again to refresh your Circle session.'
            }, { status: 401 });
        }

        // Try to initialize wallet and get Challenge ID for PIN setup
        try {
            const challengeId = await initializeCircleWallet(userToken);
            console.log("[Circle Wallet API] Initialization challenge created successfully.");
            return NextResponse.json({ challengeId, userId });
        } catch (error: any) {
            const errorData = error.response?.data;

            if (errorData?.code === 155106 || errorData?.code === 155107 ||
                errorData?.message?.includes("already been initialized") ||
                errorData?.message?.includes("already set pin")) {

                console.log("[Circle Wallet API] User already initialized, fetching existing wallet.");

                // Get existing wallet address
                const wallet = await getCircleWallet(userToken);

                if (wallet?.address) {
                    return NextResponse.json({ challengeId: null, address: wallet.address, userId });
                } else {
                    throw new Error("Wallet initialized but address not found");
                }
            }

            // For any other error, throw it
            throw error;
        }
    } catch (error: any) {
        const errorDetail = error.response?.data || { message: error.message };
        console.error('[Circle Wallet API] Critical Failure:', errorDetail);

        return NextResponse.json({
            error: 'Failed to balance Circle wallet session',
            message: error.message || 'Unknown Error',
            details: errorDetail,
            diagnostics: {
                hasApiKey: !!process.env.CIRCLE_API_KEY,
                hasAppId: !!process.env.NEXT_PUBLIC_CIRCLE_APP_ID,
                env: process.env.NODE_ENV
            }
        }, { status: 500 });
    }
}
