import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: {
        serialNumbers: {
          orderBy: { createdAt: 'desc' },
        },
        movements: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await db.product.update({
      where: { id },
      data: {
        name: body.name,
        brand: body.brand || null,
        model: body.model || null,
        category: body.category,
        cpu: body.cpu || null,
        generation: body.generation || null,
        ram: body.ram || null,
        ramType: body.ramType || null,
        storage: body.storage || null,
        storageType: body.storageType || null,
        gpu: body.gpu || null,
        displaySize: body.displaySize || null,
        condition: body.condition,
        hsn: body.hsn,
        gstPercent: parseFloat(body.gstPercent) || 18,
        purchasePrice: parseFloat(body.purchasePrice) || 0,
        sellingPrice: parseFloat(body.sellingPrice) || 0,
        minStock: parseInt(body.minStock) || 1,
        warranty: body.warranty || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
