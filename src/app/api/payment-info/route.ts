import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, amount, sender, trxId, time } = body;

    // Basic validation
    if (!provider || !amount || !sender || !trxId) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, amount, sender, or trxId' },
        { status: 400 }
      );
    }

    const newPayment = await prisma.paymentInfo.create({
      data: {
        provider,
        amount: Number(amount),
        sender,
        trxId,
        // If time is provided use it, otherwise fallback to current time
        time: time ? new Date(time) : new Date(),
      },
    });

    return NextResponse.json(
      { message: 'Payment info created successfully', data: newPayment },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating payment info:', error);

    // Check for unique constraint violation on trxId (Prisma code P2002)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A payment with this transaction ID already exists.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
