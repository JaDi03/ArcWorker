import { NextResponse } from 'next/server';
import { createCircleContractCall, getCircleWallet } from '@/arcworker-sdk/wallet/server';
import { CONTRACTS } from '@/utils/contracts';

export async function POST(request: Request) {
    try {
        let { userToken, username } = await request.json();
        username = username?.toLowerCase();

        if (!userToken || !username) {
            return NextResponse.json({ error: 'Missing userToken or username' }, { status: 400 });
        }

        const wallet = await getCircleWallet(userToken);
        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        // Register Name on UserRegistry Contract
        const challengeId = await createCircleContractCall(
            userToken,
            wallet.id,
            CONTRACTS.UserRegistry.address,
            "register(string)",
            [username]
        );

        return NextResponse.json({ challengeId });

    } catch (error: any) {
        const errorData = error.response?.data || { message: error.message };
        const status = error.response?.status || 500;
        console.error('[On-Chain Register] Error:', JSON.stringify(errorData, null, 2));
        return NextResponse.json({
            error: 'Circle API Error',
            details: errorData
        }, { status: status });
    }
}
