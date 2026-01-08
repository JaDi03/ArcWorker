import { NextResponse } from 'next/server';
import { getSocialPayments } from '@/utils/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Missing address' }, { status: 400 });
        }

        const memos = await getSocialPayments(address);
        return NextResponse.json({ memos });

    } catch (error: any) {
        console.error('[Memos API] Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch memos' }, { status: 500 });
    }
}
