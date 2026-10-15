import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const suppliers = await db.supplier.findMany({
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
          select: { purchases: true, payments: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: suppliers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, address, gstin, state, stateCode, openingBalance, notes } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Supplier name is required.' },
        { status: 400 }
      );
    }

    const openBal = parseFloat(openingBalance) || 0;

    const newSupplier = await db.supplier.create({
      data: {
        name,
        phone: phone || null,
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

    return NextResponse.json({ success: true, data: newSupplier });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
