import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

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
    const auth = await requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const body = await request.json();

    const isService = body.productType === 'SERVICE' || body.category?.toLowerCase() === 'service';
    const finalProductType = isService ? 'SERVICE' : (body.productType || 'PHYSICAL');

    const updateData: any = {
      name: body.name?.trim(),
      productType: finalProductType,
      brand: isService ? null : (body.brand || null),
      model: isService ? null : (body.model || null),
      category: body.category || (isService ? 'Service' : 'Laptop'),
      cpu: isService ? null : (body.cpu || null),
      generation: isService ? null : (body.generation || null),
      ram: isService ? null : (body.ram || null),
      ramType: isService ? null : (body.ramType || null),
      storage: isService ? null : (body.storage || null),
      storageType: isService ? null : (body.storageType || null),
      gpu: isService ? null : (body.gpu || null),
      displaySize: isService ? null : (body.displaySize || null),
      condition: isService ? 'Service' : (body.condition || 'Refurbished Grade A'),
      hsn: body.hsn || (isService ? '9987' : '8471'),
      gstPercent: parseFloat(body.gstPercent) !== undefined ? parseFloat(body.gstPercent) : 18,
      purchasePrice: parseFloat(body.purchasePrice) || 0,
      sellingPrice: parseFloat(body.sellingPrice) || 0,
      minStock: isService ? 0 : (parseInt(body.minStock) || 1),
      warranty: body.warranty || (isService ? '30 Days Service Warranty' : '6 Months'),
      notes: body.notes || null,
    };

    if (isService) {
      updateData.currentStock = 0;
    }

    const updated = await db.product.update({
      where: { id },
      data: updateData,
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
    const auth = await requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;

    // Check if product is referenced in sales invoices, purchases, or serial numbers
    const [invoiceItemCount, purchaseItemCount, serialCount] = await Promise.all([
      db.invoiceItem.count({ where: { productId: id } }),
      db.purchaseItem.count({ where: { productId: id } }),
      db.serialNumber.count({ where: { productId: id } }),
    ]);

    if (invoiceItemCount > 0 || purchaseItemCount > 0 || serialCount > 0) {
      // Soft-delete to preserve legal audit & invoice history without foreign key violations
      await db.product.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: auth.user.username || 'admin',
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Product archived and removed from stock list (historical sales records preserved).',
      });
    }

    // If completely unreferenced, perform clean database deletion
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    console.error('Product DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
