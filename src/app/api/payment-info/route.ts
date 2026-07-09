import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.text().catch(() => '');

    const newPayment = await prisma.paymentInfo.create({
      data: {
        data: data || '',
      },
    });

    return NextResponse.json(
      { message: 'Payment info created successfully', data: newPayment },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating payment info:', error);

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const payments = await prisma.paymentInfo.findMany({
      orderBy: {
        time: 'desc'
      }
    });
    
    return NextResponse.json({ data: payments }, { status: 200 });
  } catch (error) {
    console.error('Error fetching payment info:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
