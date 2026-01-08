import { NextResponse } from 'next/server';
import { createCircleSocialSession } from '@/arcworker-sdk/wallet/server';

export async function POST(request: Request) {
    try {
        const { provider, userId, deviceId } = await request.json();

        if (!provider || !deviceId) {
            return NextResponse.json({ error: 'Provider and DeviceId are required' }, { status: 400 });
        }

        // Create Social Session (Google, Apple, etc.)
        const data = await createCircleSocialSession(provider, userId, deviceId);

        return NextResponse.json({
            ...data,
            appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID
        });
    } catch (error: any) {
        const errorDetail = error.response?.data || { message: error.message };
        console.error('Circle Social Auth Error:', errorDetail);
        return NextResponse.json({
            error: 'Failed to start social authentication',
            details: errorDetail
        }, { status: 500 });
    }
}
