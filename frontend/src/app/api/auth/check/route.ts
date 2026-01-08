import { NextResponse } from 'next/server';
import { getUserByEmailOrUsername } from '@/utils/db';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const user = await getUserByEmailOrUsername(email);

        return NextResponse.json({ exists: !!user });

    } catch (error: any) {
        console.error("[Auth Check] Error:", error.message);
        return NextResponse.json({ error: 'Check failed' }, { status: 500 });
    }
}
