import { db } from '@/lib/db';
import { ExtractedItem, ExtractedSupplier, DuplicateDetectionResult } from './types';

/**
 * Section 16: Product Matching
 * After extraction, compare products against inventory.
 * Uses: Product name, Brand, Model, SKU, HSN, CPU, RAM specs.
 * Returns items enriched with match metadata and best match suggestions.
 */
export async function matchProductsWithInventory(
  items: ExtractedItem[],
  supplierId?: string
): Promise<ExtractedItem[]> {
  const allProducts = await db.product.findMany();

  return items.map((item) => {
    const rawName = (item.item_name?.value || '').trim();
    const rawDesc = (item.full_description?.value || '').trim();
    const combinedText = `${rawName} ${rawDesc}`.toLowerCase();
    const itemHsn = (item.hsn_sac?.value || '').trim();
    const itemBrand = (item.brand?.value || '').toLowerCase();
    const itemModel = (item.model?.value || '').toLowerCase();

    let bestProduct: any = null;
    let highestScore = 0;

    for (const prod of allProducts) {
      let score = 0;
      const prodName = prod.name.toLowerCase();
      const prodBrand = (prod.brand || '').toLowerCase();
      const prodModel = (prod.model || '').toLowerCase();
      const prodHsn = (prod.hsn || '').toLowerCase();
      const prodCpu = (prod.cpu || '').toLowerCase();
      const prodRam = (prod.ram || '').toLowerCase();

      // 1. Exact Name match
      if (combinedText.includes(prodName) || prodName.includes(combinedText)) {
        score += 25;
      }

      // 2. Brand & Model match
      if (prodBrand && (combinedText.includes(prodBrand) || itemBrand.includes(prodBrand))) {
        score += 10;
      }
      if (prodModel && (combinedText.includes(prodModel) || itemModel.includes(prodModel))) {
        score += 15;
      }

      // 3. Hardware specifications match (CPU, RAM, Generation)
      if (prodCpu && combinedText.includes(prodCpu)) {
        score += 10;
      }
      if (prodRam && combinedText.includes(prodRam)) {
        score += 8;
      }

      // 4. Token overlap scoring
      const prodTokens = prodName.split(/[\s|/,\-_()]+/).filter((t) => t.length > 2);
      let matchedTokens = 0;
      for (const tok of prodTokens) {
        if (combinedText.includes(tok)) {
          matchedTokens++;
          score += 4;
        }
      }

      // 5. HSN match
      if (itemHsn && prodHsn && itemHsn === prodHsn) {
        score += 3;
      }

      if (score > highestScore && score >= 12) {
        highestScore = score;
        bestProduct = prod;
      }
    }

    return {
      ...item,
      isMatched: !!bestProduct,
      matchScore: highestScore,
      matchedProductId: bestProduct?.id,
      matchedProduct: bestProduct
        ? {
            id: bestProduct.id,
            name: bestProduct.name,
            brand: bestProduct.brand,
            model: bestProduct.model,
            currentStock: bestProduct.currentStock,
            purchasePrice: bestProduct.purchasePrice,
            sellingPrice: bestProduct.sellingPrice,
            hsn: bestProduct.hsn,
          }
        : null,
    };
  });
}

/**
 * Section 17: Supplier Matching and Learning
 * Match supplier by GSTIN, Legal Name, Business Name, or Phone.
 * Also checks and learns supplier invoice patterns.
 */
export async function matchSupplierWithLearning(supplier: ExtractedSupplier) {
  const allSuppliers = await db.supplier.findMany();
  const rawGstin = (supplier.gstin?.value || '').trim().toUpperCase();
  const rawName = (supplier.business_name?.value || supplier.legal_name?.value || '').trim().toLowerCase();
  const rawPhone = (supplier.phone?.value || '').replace(/\D/g, '');

  let matchedSupplier: any = null;

  // 1. Highest confidence: Exact GSTIN match
  if (rawGstin && rawGstin.length >= 10) {
    matchedSupplier = allSuppliers.find(
      (s) => s.gstin && s.gstin.trim().toUpperCase() === rawGstin
    );
  }

  // 2. Second confidence: Cleaned Name match
  if (!matchedSupplier && rawName.length > 2) {
    matchedSupplier = allSuppliers.find((s) => {
      const dbName = s.name.trim().toLowerCase();
      return rawName.includes(dbName) || dbName.includes(rawName);
    });
  }

  // 3. Third confidence: Phone match
  if (!matchedSupplier && rawPhone.length >= 10) {
    matchedSupplier = allSuppliers.find((s) => {
      const dbPhone = (s.phone || '').replace(/\D/g, '');
      return dbPhone && (dbPhone.includes(rawPhone) || rawPhone.includes(dbPhone));
    });
  }

  let learnedPatterns: any = null;
  if (matchedSupplier?.invoicePatterns) {
    try {
      learnedPatterns = JSON.parse(matchedSupplier.invoicePatterns);
    } catch {
      learnedPatterns = null;
    }
  }

  return {
    matchedSupplier: matchedSupplier
      ? {
          id: matchedSupplier.id,
          name: matchedSupplier.name,
          gstin: matchedSupplier.gstin,
          currentBalance: matchedSupplier.currentBalance,
          patterns: learnedPatterns,
        }
      : null,
    learnedPatterns,
  };
}

/**
 * Section 13: Duplicate Invoice Detection
 * Detects if a bill with this supplierInvoiceNumber has already been recorded in purchases.
 */
export async function detectDuplicateInvoice(
  supplierInvoiceNumber: string,
  supplierId?: string
): Promise<DuplicateDetectionResult> {
  if (!supplierInvoiceNumber || supplierInvoiceNumber.trim().length === 0) {
    return { isDuplicate: false };
  }

  const cleanNum = supplierInvoiceNumber.trim();
  const whereClause: any = {
    supplierInvoiceNumber: {
      equals: cleanNum,
    },
  };

  if (supplierId) {
    whereClause.supplierId = supplierId;
  }

  const existingPurchase = await db.purchase.findFirst({
    where: whereClause,
    include: {
      supplier: true,
    },
  });

  if (existingPurchase) {
    return {
      isDuplicate: true,
      existingPurchase: {
        id: existingPurchase.id,
        purchaseNumber: existingPurchase.purchaseNumber,
        date: existingPurchase.date.toISOString().split('T')[0],
        supplierName: existingPurchase.supplier.name,
        supplierInvoiceNumber: existingPurchase.supplierInvoiceNumber,
        grandTotal: existingPurchase.grandTotal,
      },
      warningMessage: `Potential Duplicate: Bill #${cleanNum} was already saved on ${
        existingPurchase.date.toISOString().split('T')[0]
      } under purchase ${existingPurchase.purchaseNumber} (₹${existingPurchase.grandTotal}) from ${
        existingPurchase.supplier.name
      }.`,
    };
  }

  return { isDuplicate: false };
}

/**
 * Section 17: Save learned supplier invoice pattern
 */
export async function updateSupplierInvoicePatterns(
  supplierId: string,
  newPatternData: {
    lastInvoicePrefix?: string;
    commonHsn?: string;
    defaultGstPercent?: number;
    termsKeywords?: string[];
  }
) {
  try {
    const existing = await db.supplier.findUnique({ where: { id: supplierId } });
    if (!existing) return;

    let patterns: any = {};
    if (existing.invoicePatterns) {
      try {
        patterns = JSON.parse(existing.invoicePatterns);
      } catch {
        patterns = {};
      }
    }

    const updated = {
      ...patterns,
      ...newPatternData,
      lastUpdated: new Date().toISOString(),
      invoiceCount: (patterns.invoiceCount || 0) + 1,
    };

    await db.supplier.update({
      where: { id: supplierId },
      data: {
        invoicePatterns: JSON.stringify(updated),
      },
    });
  } catch (err) {
    console.error('Failed to update supplier pattern:', err);
  }
}
