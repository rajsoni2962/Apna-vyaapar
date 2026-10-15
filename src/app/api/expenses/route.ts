import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';

    const expenses = await db.expense.findMany({
      where: category && category !== 'All' ? { category } : undefined,
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((acc, e) => acc + e.amount, 0);

    return NextResponse.json({ success: true, data: expenses, total });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, description, amount, date, paymentMethod, notes } = body;

    const amt = parseFloat(amount);
    if (!description || !amt || amt <= 0) {
      return NextResponse.json(
        { success: false, error: 'Description and positive amount are required.' },
        { status: 400 }
      );
    }

    const expense = await db.expense.create({
      data: {
        category: category || 'Miscellaneous',
        description,
        amount: amt,
        date: date ? new Date(date) : new Date(),
        paymentMethod: paymentMethod || 'Cash',
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, data: expense });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Expense deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
