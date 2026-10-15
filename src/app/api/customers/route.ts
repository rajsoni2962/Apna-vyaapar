import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const customers = await db.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
              { gstin: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { invoices: true, payments: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: customers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, address, gstin, state, stateCode, openingBalance, notes } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Customer name and phone number are required.' },
        { status: 400 }
      );
    }

    const openBal = parseFloat(openingBalance) || 0;

    const newCustomer = await db.customer.create({
      data: {
        name,
        phone,
        email: email || null,
        address: address || null,
        gstin: gstin || null,
        state: state || 'Gujarat',
        stateCode: stateCode || '24',
        openingBalance: openBal,
        currentBalance: openBal,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, data: newCustomer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
