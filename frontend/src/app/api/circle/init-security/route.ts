import { NextResponse } from 'next/server';
import { getCircleWallet } from '@/arcworker-sdk/wallet/server';
import axios from 'axios';
import crypto from 'crypto';

/**
 * Force security initialization for Circle OTP users
 * This creates a challenge that will activate the OTP flow
 */
export async function POST(request: Request) {
    try {
        const { userToken } = await request.json();

        if (!userToken) {
            return NextResponse.json({ error: 'User Token is required' }, { status: 400 });
        }

        // Get the wallet first
        const wallet = await getCircleWallet(userToken);

        if (!wallet) {
            return NextResponse.json({
                error: 'No wallet found. Please initialize your wallet first.'
            }, { status: 404 });
        }

        // Create a dummy transaction to trigger OTP initialization
        // This uses Circle's "sign message" which requires security setup
        const circleClient = axios.create({
            baseURL: 'https://api.circle.com/v1/w3s',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`
            }
        });

        const message = `Initialize security for ArcWorker - ${new Date().toISOString()}`;
        const messageHex = Buffer.from(message, 'utf8').toString('hex');

        console.log('[Init Security] Creating sign message challenge for wallet:', wallet.id);

        const response = await circleClient.post('/user/sign/message', {
            idempotencyKey: crypto.randomUUID(),
            walletId: wallet.id,
            message: `0x${messageHex}`
        }, {
            headers: { 'X-User-Token': userToken }
        });

        const challengeId = response.data.data?.challengeId;

        if (!challengeId) {
            throw new Error('Circle did not return a challenge ID');
        }

        console.log('[Init Security] Challenge created successfully:', challengeId);

        return NextResponse.json({
            challengeId,
            userToken,
            appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID,
            message: 'Security initialization challenge created. Please complete the OTP verification.'
        });

    } catch (error: any) {
        const errorData = error.response?.data || error.message;
        const msg = error.response?.data?.message || error.message || "Unknown error";

        console.error('[Init Security] Error:', JSON.stringify(errorData, null, 2));

        // If already initialized, that's actually good
        if (msg.includes('already') || msg.includes('initialized')) {
            return NextResponse.json({
                success: true,
                message: 'Security already initialized'
            });
        }

        return NextResponse.json({
            error: msg,
            details: errorData
        }, { status: 500 });
    }
}
