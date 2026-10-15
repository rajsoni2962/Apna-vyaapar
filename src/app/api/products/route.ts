import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { cpu: { contains: search } },
        { ram: { contains: search } },
        { storage: { contains: search } },
      ];
    }

    if (category && category !== 'All') {
      whereClause.category = category;
    }

    if (brand && brand !== 'All') {
      whereClause.brand = brand;
    }

    const products = await db.product.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        serialNumbers: {
          where: { status: 'In Stock' },
          select: { id: true, serialNumber: true, status: true },
        },
        _count: {
          select: {
            serialNumbers: true,
            invoiceItems: true,
            purchaseItems: true,
          },
        },
      },
    });

    const filtered = lowStockOnly
      ? products.filter((p) => p.currentStock <= p.minStock)
      : products;

    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      brand,
      model,
      category,
      cpu,
      generation,
      ram,
      ramType,
      storage,
      storageType,
      gpu,
      displaySize,
      condition,
      hsn,
      gstPercent,
      purchasePrice,
      sellingPrice,
      minStock,
      initialStock,
      warranty,
      notes,
      serialNumbers, // optional array of serial strings
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }

    const initStock = parseInt(initialStock) || 0;
    const pPrice = parseFloat(purchasePrice) || 0;
    const sPrice = parseFloat(sellingPrice) || 0;

    const newProduct = await db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          brand: brand || null,
          model: model || null,
          category: category || 'Laptop',
          cpu: cpu || null,
          generation: generation || null,
          ram: ram || null,
          ramType: ramType || null,
          storage: storage || null,
          storageType: storageType || null,
          gpu: gpu || null,
          displaySize: displaySize || null,
          condition: condition || 'Refurbished Grade A',
          hsn: hsn || '8471',
          gstPercent: parseFloat(gstPercent) || 18,
          purchasePrice: pPrice,
          sellingPrice: sPrice,
          minStock: parseInt(minStock) || 1,
          currentStock: initStock,
          warranty: warranty || '6 Months',
          notes: notes || null,
        },
      });

      if (initStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: 'PURCHASE',
            referenceType: 'INITIAL_STOCK',
            referenceNumber: 'MANUAL_INIT',
            quantityChange: initStock,
            balanceAfter: initStock,
            unitPrice: pPrice,
            notes: 'Opening stock on product creation',
          },
        });

        // If serial numbers provided
        if (Array.isArray(serialNumbers) && serialNumbers.length > 0) {
          for (const sn of serialNumbers) {
            if (sn && sn.trim()) {
              await tx.serialNumber.create({
                data: {
                  serialNumber: sn.trim(),
                  productId: product.id,
                  purchasePrice: pPrice,
                  sellingPrice: sPrice,
                  status: 'In Stock',
                },
              });
            }
          }
        }
      }

      return product;
    });

    return NextResponse.json({ success: true, data: newProduct });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
