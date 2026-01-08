import { NextResponse } from 'next/server';
import { getCircleWallet, getCircleBalances } from '@/arcworker-sdk/wallet/server';

export async function POST(request: Request) {
    try {
        const { userToken } = await request.json();

        if (!userToken) {
            return NextResponse.json({ error: 'User Token is required' }, { status: 400 });
        }

        // 1. Get Wallet
        const wallet = await getCircleWallet(userToken);
        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        // 2. Get Balances
        const balances = await getCircleBalances(userToken, wallet.id);

        return NextResponse.json({ address: wallet.address, balances });

    } catch (error: any) {
        const errorDetail = error.response?.data || { message: error.message };
        const status = error.response?.status || 500;
        console.error('Circle Balance Error:', JSON.stringify(errorDetail, null, 2));
        return NextResponse.json({
            error: 'Circle API Error',
            details: errorDetail
        }, { status: status });
    }
}
