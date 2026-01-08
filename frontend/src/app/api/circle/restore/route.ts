import { NextResponse } from 'next/server';
import { restoreUser } from '@/arcworker-sdk/wallet/server';

export async function POST(request: Request) {
    try {
        const { userToken } = await request.json();

        if (!userToken) {
            return NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
        }

        console.log(`[API] Initiating User Restoration...`);

        // Execute Restore
        const challengeId = await restoreUser(userToken);

        return NextResponse.json({
            challengeId
        });

    } catch (error: any) {
        const upstreamError = error.response?.data;
        console.error('[API] Restore Error:', upstreamError || error.message);

        return NextResponse.json(
            {
                error: 'Restoration Failed',
                details: upstreamError || error.message
            },
            { status: 500 }
        );
    }
}
