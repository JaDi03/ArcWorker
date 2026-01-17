import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as Blob | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Create a unique filename
        const extension = file.type.split('/')[1] || 'png';
        const filename = `${crypto.randomUUID()}.${extension}`;

        // Upload to Vercel Blob
        const blob = await put(filename, file, {
            access: 'public',
        });

        console.log(`[Upload] File uploaded to Vercel Blob: ${blob.url}`);

        // Return the public URL from Vercel Blob
        return NextResponse.json({ url: blob.url });

    } catch (error: any) {
        console.error('Upload Error:', error);

        // Fallback to local storage for development
        if (process.env.NODE_ENV === 'development') {
            try {
                const { writeFile, mkdir } = await import('fs/promises');
                const { join } = await import('path');

                const formData = await request.formData();
                const file = formData.get('file') as Blob | null;

                if (!file) {
                    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
                }

                const buffer = Buffer.from(await file.arrayBuffer());
                const extension = file.type.split('/')[1] || 'png';
                const filename = `${crypto.randomUUID()}.${extension}`;
                const uploadDir = join(process.cwd(), 'public', 'uploads');

                await mkdir(uploadDir, { recursive: true });
                await writeFile(join(uploadDir, filename), buffer);

                console.log(`[Upload] File saved locally: /uploads/${filename}`);
                return NextResponse.json({ url: `/uploads/${filename}` });
            } catch (localError: any) {
                console.error('Local Upload Fallback Error:', localError);
            }
        }

        return NextResponse.json({
            error: 'Failed to upload file',
            details: error.message
        }, { status: 500 });
    }
}
