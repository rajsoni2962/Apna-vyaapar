import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const productType = searchParams.get('productType') || '';
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { cpu: { contains: search, mode: 'insensitive' } },
        { ram: { contains: search, mode: 'insensitive' } },
        { storage: { contains: search, mode: 'insensitive' } },
        { hsn: { contains: search, mode: 'insensitive' } },
        {
          serialNumbers: {
            some: {
              serialNumber: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    if (category && category !== 'All') {
      whereClause.category = category;
    }

    if (brand && brand !== 'All') {
      whereClause.brand = brand;
    }

    if (productType && productType !== 'All') {
      whereClause.productType = productType;
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

    // Services never trigger low-stock alerts
    const filtered = lowStockOnly
      ? products.filter((p) => p.productType !== 'SERVICE' && p.currentStock <= p.minStock)
      : products;

    return NextResponse.json({ success: true, data: filtered });
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
      name,
      productType, // 'PHYSICAL' or 'SERVICE'
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

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Product/Service name is required' }, { status: 400 });
    }

    const isService = productType === 'SERVICE' || category?.toLowerCase() === 'service';
    const finalProductType = isService ? 'SERVICE' : 'PHYSICAL';
    const initStock = isService ? 0 : parseInt(initialStock) || 0;
    const pPrice = parseFloat(purchasePrice) || 0;
    const sPrice = parseFloat(sellingPrice) || 0;

    const newProduct = await db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: name.trim(),
          productType: finalProductType,
          brand: isService ? null : (brand || null),
          model: isService ? null : (model || null),
          category: category || (isService ? 'Service' : 'Laptop'),
          cpu: isService ? null : (cpu || null),
          generation: isService ? null : (generation || null),
          ram: isService ? null : (ram || null),
          ramType: isService ? null : (ramType || null),
          storage: isService ? null : (storage || null),
          storageType: isService ? null : (storageType || null),
          gpu: isService ? null : (gpu || null),
          displaySize: isService ? null : (displaySize || null),
          condition: isService ? 'Service' : (condition || 'Refurbished Grade A'),
          hsn: hsn || (isService ? '9987' : '8471'),
          gstPercent: parseFloat(gstPercent) !== undefined ? parseFloat(gstPercent) : 18,
          purchasePrice: pPrice,
          sellingPrice: sPrice,
          minStock: isService ? 0 : (parseInt(minStock) || 1),
          currentStock: initStock,
          warranty: warranty || (isService ? '30 Days Service Warranty' : '6 Months'),
          notes: notes || null,
        },
      });

      // Only track physical product initial stock movement and serial numbers
      if (!isService && initStock > 0) {
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

        if (Array.isArray(serialNumbers) && serialNumbers.length > 0) {
          for (const sn of serialNumbers) {
            if (sn && typeof sn === 'string' && sn.trim()) {
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
