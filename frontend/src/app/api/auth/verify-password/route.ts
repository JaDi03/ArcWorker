import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/data/users.json');

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        if (!fs.existsSync(DB_PATH)) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const users = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());

        if (!user || user.password !== password) {
            return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
