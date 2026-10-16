import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const productId = searchParams.get('productId') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { serialNumber: { contains: search } },
        { product: { name: { contains: search } } },
        { customer: { name: { contains: search } } },
        { supplier: { name: { contains: search } } },
      ];
    }
    if (status && status !== 'All') {
      where.status = status;
    }
    if (productId) {
      where.productId = productId;
    }

    const serials = await db.serialNumber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        customer: true,
        supplier: true,
        salesInvoice: true,
      },
    });

    return NextResponse.json({ success: true, data: serials });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await request.json();
    const {
      serialNumber,
      productId,
      supplierId,
      purchasePrice,
      sellingPrice,
      status,
      notes,
    } = body;

    if (!serialNumber || !productId) {
      return NextResponse.json(
        { success: false, error: 'Serial number and product are required.' },
        { status: 400 }
      );
    }

    const existing = await db.serialNumber.findUnique({
      where: { serialNumber },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Serial Number '${serialNumber}' already exists in database.` },
        { status: 400 }
      );
    }

    const created = await db.$transaction(async (tx) => {
      const sn = await tx.serialNumber.create({
        data: {
          serialNumber: serialNumber.trim(),
          productId,
          supplierId: supplierId || null,
          purchasePrice: parseFloat(purchasePrice) || 0,
          sellingPrice: parseFloat(sellingPrice) || 0,
          status: status || 'In Stock',
          notes: notes || null,
        },
      });

      // If status is In Stock, increment product count
      if ((status || 'In Stock') === 'In Stock') {
        const prod = await tx.product.update({
          where: { id: productId },
          data: { currentStock: { increment: 1 } },
        });

        await tx.stockMovement.create({
          data: {
            productId,
            type: 'ADJUSTMENT',
            referenceType: 'MANUAL_SERIAL_ADD',
            referenceNumber: sn.serialNumber,
            quantityChange: 1,
            balanceAfter: prod.currentStock,
            unitPrice: parseFloat(purchasePrice) || 0,
            notes: `Added individual serial number ${sn.serialNumber}`,
          },
        });
      }

      return sn;
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, notes, sellingPrice, warrantyStart, warrantyEnd } = body;

    const updated = await db.serialNumber.update({
      where: { id },
      data: {
        status: status || undefined,
        notes: notes !== undefined ? notes : undefined,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
        warrantyStart: warrantyStart ? new Date(warrantyStart) : undefined,
        warrantyEnd: warrantyEnd ? new Date(warrantyEnd) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
