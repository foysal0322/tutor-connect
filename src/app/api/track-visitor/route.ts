import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { path } = await req.json();
    
    // Get IP and User-Agent from headers
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown IP';
    const userAgent = req.headers.get('user-agent') || 'Unknown Agent';

    await prisma.visitorLog.create({
      data: {
        ip,
        userAgent,
        path: path || '/',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking visitor:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
