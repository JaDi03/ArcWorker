import { NextResponse } from 'next/server';
import { setupTables } from '@/utils/db';

export async function GET() {
    try {
        if (!process.env.POSTGRES_URL) {
            return NextResponse.json({
                status: 'skipped',
                message: 'No POSTGRES_URL found. Running in local JSON mode or DB not configured in Vercel.'
            });
        }

        await setupTables();

        return NextResponse.json({
            status: 'success',
            message: 'Database tables initialized successfully'
        });
    } catch (error: any) {
        console.error('[DB] Initialization error:', error.message);
        return NextResponse.json({
            status: 'error',
            message: error.message
        }, { status: 500 });
    }
}
