import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId') || '';

    const movements = await db.stockMovement.findMany({
      where: productId ? { productId } : undefined,
      orderBy: { date: 'desc' },
      include: { product: true },
      take: 100,
    });

    return NextResponse.json({ success: true, data: movements });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await request.json();
    const { productId, quantityChange, reason, unitPrice } = body;

    const change = parseInt(quantityChange);
    if (!productId || isNaN(change) || change === 0) {
      return NextResponse.json(
        { success: false, error: 'Product and a non-zero quantity change are required.' },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');

      const newBalance = product.currentStock + change;
      if (newBalance < 0) {
        throw new Error(`Cannot decrease stock below 0. Current stock is ${product.currentStock}.`);
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newBalance },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          date: new Date(),
          type: 'ADJUSTMENT',
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceNumber: `ADJ-${Date.now().toString().slice(-4)}`,
          quantityChange: change,
          balanceAfter: newBalance,
          unitPrice: parseFloat(unitPrice) || product.purchasePrice,
          notes: reason || 'Manual inventory adjustment',
        },
      });

      return { product: updated, movement };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
