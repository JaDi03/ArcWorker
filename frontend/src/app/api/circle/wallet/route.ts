import { NextResponse } from 'next/server';
import { initializeCircleWallet, getCircleWallet, getUserIdFromToken } from '@/arcworker-sdk/wallet/server';

export async function POST(request: Request) {
    try {
        const { userToken } = await request.json();

        if (!userToken) {
            return NextResponse.json({ error: 'User Token is required' }, { status: 400 });
        }

        const userId = await getUserIdFromToken(userToken);

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
        console.error('Circle Wallet Error:', errorDetail);
        return NextResponse.json({
            error: 'Failed to initialize Circle wallet',
            details: errorDetail
        }, { status: 500 });
    }
}
