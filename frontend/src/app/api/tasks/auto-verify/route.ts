import { NextResponse } from 'next/server';
import { platformAutoVerify } from '@/utils/platform-admin';

export async function POST(request: Request) {
    try {
        const { taskId } = await request.json();

        if (!taskId) {
            return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
        }

        console.log(`[API] Received auto-verify request for task ${taskId}`);

        // DEBUG MODE: Await result to show error to user
        const result = await platformAutoVerify(taskId);

        // result is now always an object { success: boolean, reason?: string, txHash?: string }
        // or null if catch block in platform-admin.ts returned null (which I changed to object too, but covering bases)

        if (!result || typeof result !== 'object') {
            return NextResponse.json({ error: 'Verification returned invalid response' }, { status: 500 });
        }

        if (result.success) {
            return new NextResponse(JSON.stringify({
                success: true,
                message: 'Auto-verification approved!',
                txHash: result.txHash
            }, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new NextResponse(JSON.stringify({
                error: result.reason || 'Unknown verification failure'
            }, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error: any) {
        console.error("Auto-verify API Error:", error);
        return new NextResponse(JSON.stringify({ error: error.message || "Unknown server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
