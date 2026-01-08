import { NextResponse } from 'next/server';
import { getOrCreateCircleUser, createCircleSession, getCircleWallet } from '@/arcworker-sdk/wallet/server';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // 1. Get or Create Circle User
        await getOrCreateCircleUser(userId);

        // 2. Create Session Token (User Token) and Encryption Key
        const { userToken, encryptionKey } = await createCircleSession(userId);

        // 3. Try to get existing wallet address
        let address = null;
        try {
            const wallet = await getCircleWallet(userToken);
            if (wallet) address = wallet.address;
        } catch (e: any) {
            // New user likely has no wallet yet
        }

        return NextResponse.json({
            userToken,
            encryptionKey,
            address,
            appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID
        });
    } catch (error: any) {
        const errorDetail = error.response?.data || { message: error.message };
        console.error('Circle Auth Error:', errorDetail);
        return NextResponse.json({
            error: 'Failed to authenticate with Circle',
            details: errorDetail
        }, { status: 500 });
    }
}
