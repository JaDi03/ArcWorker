import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as Blob | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Create a unique filename
        const extension = file.type.split('/')[1] || 'png';
        const filename = `${crypto.randomUUID()}.${extension}`;

        // Define path (relative to the project root)
        const uploadDir = join(process.cwd(), 'public', 'uploads');

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        const filePath = join(uploadDir, filename);

        // Write the file
        await writeFile(filePath, buffer);

        // Return the public URL
        const url = `/uploads/${filename}`;

        return NextResponse.json({ url });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({
            error: 'Failed to upload image',
            details: error.message
        }, { status: 500 });
    }
}
