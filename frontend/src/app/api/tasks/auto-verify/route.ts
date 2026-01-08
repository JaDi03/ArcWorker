import { NextResponse } from 'next/server';
import { platformAutoVerify } from '@/utils/platform-admin';

export async function POST(request: Request) {
    try {
        const { taskId } = await request.json();

        if (!taskId) {
            return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
        }

        console.log(`[API] Received auto-verify request for task ${taskId}`);

        // We don't await this to keep the API response fast for the UI
        platformAutoVerify(taskId).catch(err => {
            console.error(`[API] Background auto-verify error:`, err);
        });

        return NextResponse.json({ success: true, message: 'Auto-verification triggered' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
