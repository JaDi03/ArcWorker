import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/data/users.json');

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const username = searchParams.get('username');

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        if (!fs.existsSync(DB_PATH)) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const users = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            username: user.username,
            walletAddress: user.walletAddress
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
