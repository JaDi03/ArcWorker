import { NextResponse } from 'next/server';
import { createCircleEmailSession } from '@/arcworker-sdk/wallet/server';

export async function POST(request: Request) {
    try {
        const { email, deviceId } = await request.json();

        if (!email || !deviceId) {
            return NextResponse.json({ error: 'Email and DeviceId are required' }, { status: 400 });
        }

        // Create Email-OTP Session
        const data = await createCircleEmailSession(email, deviceId);

        return NextResponse.json({
            ...data,
            appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID
        });
    } catch (error: any) {
        const errorDetail = error.response?.data || { message: error.message };
        console.error('Circle Email Auth Error:', errorDetail);
        return NextResponse.json({
            error: 'Failed to start email authentication',
            details: errorDetail
        }, { status: 500 });
    }
}
