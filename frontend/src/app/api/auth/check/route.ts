import { NextResponse } from 'next/server';
import { getUserByEmailOrUsername } from '@/utils/db';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { email } = body;

        console.log(`[Auth Check] Request received for: ${email}`);

        if (!email) {
            return NextResponse.json({ exists: false, role: null, message: 'No identifier provided' });
        }

        const user = await getUserByEmailOrUsername(email);

        console.log(`[Auth Check] Lookup result for ${email}:`, user ? 'Found' : 'Not Found');
        if (user) console.log(`[Auth Check] User Role: ${user.role}`);

        return NextResponse.json({
            exists: !!user,
            role: user?.role || null
        });

    } catch (error: any) {
        console.error("[Auth Check] CRITICAL ERROR:", error.message);
        return NextResponse.json({
            error: 'Internal check failure',
            details: error.message
        }, { status: 500 });
    }
}
