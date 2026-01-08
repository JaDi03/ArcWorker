import { NextResponse } from 'next/server';
import { createSecurityQuestionsChallenge } from '@/arcworker-sdk/wallet/server';

export async function POST(request: Request) {
    try {
        const { userToken } = await request.json();

        if (!userToken) {
            return NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
        }

        console.log(`[API] Creating Security Questions Challenge...`);

        // Create Challenge
        const challengeId = await createSecurityQuestionsChallenge(userToken);

        return NextResponse.json({
            challengeId
        });

    } catch (error: any) {
        console.error('[API] Security Questions Error:', error.response?.data || error.message);
        return NextResponse.json(
            { error: error.message || 'Failed to create security questions challenge' },
            { status: 500 }
        );
    }
}
