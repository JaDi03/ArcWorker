import { NextResponse } from 'next/server';

export async function GET() {
    const key = process.env.CIRCLE_API_KEY || '';
    const isSandbox = key.includes('TEST');
    const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '';

    return NextResponse.json({
        environment: isSandbox ? 'SANDBOX' : 'PRODUCTION',
        appId: appId,
        keyPrefix: key.substring(0, 10) + '...',
        timestamp: new Date().toISOString()
    });
}
