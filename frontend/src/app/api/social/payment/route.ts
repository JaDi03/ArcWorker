import { NextResponse } from 'next/server';
import { createSocialPayment } from '@/utils/db';

export async function POST(request: Request) {
    try {
        const { txHash, fromAddress, toAddress, amount, symbol, memo } = await request.json();

        if (!fromAddress || !toAddress || !amount || !memo) {
            return NextResponse.json({ error: 'Missing required social fields' }, { status: 400 });
        }

        const socialPayment = await createSocialPayment({
            txHash: txHash || `offchain-${crypto.randomUUID()}`,
            fromAddress,
            toAddress,
            amount,
            symbol: symbol || 'USDC',
            memo
        });

        return NextResponse.json({ success: true, socialPayment });

    } catch (error: any) {
        console.error('[Social Payment API] Error:', error.message);
        return NextResponse.json({ error: 'Failed to record social payment' }, { status: 500 });
    }
}
