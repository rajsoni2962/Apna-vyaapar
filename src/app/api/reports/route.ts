import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'sales'; // sales, purchases, stock, profit, customer_outstanding, supplier_outstanding, gst
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    if (reportType === 'sales') {
      const invoices = await db.invoice.findMany({
        where: {
          status: 'Confirmed',
          ...(from || to ? { date: dateFilter } : {}),
        },
        orderBy: { date: 'desc' },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      const totalSales = invoices.reduce((acc, i) => acc + i.grandTotal, 0);
      const totalTaxable = invoices.reduce((acc, i) => acc + i.taxableAmount, 0);
      const totalGst = invoices.reduce((acc, i) => acc + i.cgst + i.sgst + i.igst, 0);
      const totalReceived = invoices.reduce((acc, i) => acc + i.paidAmount, 0);
      const totalBalance = invoices.reduce((acc, i) => acc + i.balanceDue, 0);

      return NextResponse.json({
        success: true,
        data: {
          invoices,
          summary: {
            totalSales,
            totalTaxable,
            totalGst,
            totalReceived,
            totalBalance,
            count: invoices.length,
          },
        },
      });
    }

    if (reportType === 'purchases') {
      const purchases = await db.purchase.findMany({
        where: {
          status: 'Confirmed',
          ...(from || to ? { date: dateFilter } : {}),
        },
        orderBy: { date: 'desc' },
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      });

      const totalPurchases = purchases.reduce((acc, p) => acc + p.grandTotal, 0);
      const totalTaxable = purchases.reduce((acc, p) => acc + p.taxableAmount, 0);
      const totalPaid = purchases.reduce((acc, p) => acc + p.paidAmount, 0);
      const totalPayable = purchases.reduce((acc, p) => acc + p.balanceDue, 0);

      return NextResponse.json({
        success: true,
        data: {
          purchases,
          summary: {
            totalPurchases,
            totalTaxable,
            totalPaid,
            totalPayable,
            count: purchases.length,
          },
        },
      });
    }

    if (reportType === 'stock') {
      const products = await db.product.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { serialNumbers: true } },
        },
      });

      const totalStockUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
      const totalPurchaseValue = products.reduce((acc, p) => acc + p.currentStock * p.purchasePrice, 0);
      const totalSalesValue = products.reduce((acc, p) => acc + p.currentStock * p.sellingPrice, 0);
      const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;

      return NextResponse.json({
        success: true,
        data: {
          products,
          summary: {
            totalStockUnits,
            totalPurchaseValue,
            totalSalesValue,
            potentialMargin: totalSalesValue - totalPurchaseValue,
            lowStockCount,
          },
        },
      });
    }

    if (reportType === 'profit') {
      // Analyze profit per invoice and item
      const invoices = await db.invoice.findMany({
        where: {
          status: 'Confirmed',
          ...(from || to ? { date: dateFilter } : {}),
        },
        include: {
          items: { include: { product: true } },
        },
      });

      let totalRevenue = 0;
      let totalCost = 0;

      const itemsProfit = [];
      for (const inv of invoices) {
        for (const it of inv.items) {
          const cost = (it.product?.purchasePrice || 0) * it.quantity;
          const revenue = it.total;
          const grossProfit = revenue - cost;
          totalRevenue += revenue;
          totalCost += cost;

          itemsProfit.push({
            invoiceNumber: inv.invoiceNumber,
            date: inv.date,
            productName: it.product?.name || it.description,
            quantity: it.quantity,
            sellingPrice: it.rate,
            purchaseCost: it.product?.purchasePrice || 0,
            revenue,
            cost,
            profit: grossProfit,
            marginPercent: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
          });
        }
      }

      // Period expenses
      const expenses = await db.expense.findMany({
        where: from || to ? { date: dateFilter } : undefined,
      });
      const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
      const grossProfit = totalRevenue - totalCost;
      const netProfit = grossProfit - totalExpenses;

      return NextResponse.json({
        success: true,
        data: {
          itemsProfit,
          summary: {
            totalRevenue,
            totalCost,
            grossProfit,
            totalExpenses,
            netProfit,
            marginPercent: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          },
        },
      });
    }

    if (reportType === 'customer_outstanding') {
      const customers = await db.customer.findMany({
        where: { currentBalance: { gt: 0 } },
        orderBy: { currentBalance: 'desc' },
        include: {
          invoices: {
            where: { balanceDue: { gt: 0 } },
            select: { id: true, invoiceNumber: true, date: true, grandTotal: true, balanceDue: true },
          },
        },
      });

      const totalOutstanding = customers.reduce((acc, c) => acc + c.currentBalance, 0);

      return NextResponse.json({
        success: true,
        data: {
          customers,
          summary: { totalOutstanding, count: customers.length },
        },
      });
    }

    if (reportType === 'supplier_outstanding') {
      const suppliers = await db.supplier.findMany({
        where: { currentBalance: { gt: 0 } },
        orderBy: { currentBalance: 'desc' },
        include: {
          purchases: {
            where: { balanceDue: { gt: 0 } },
            select: { id: true, supplierInvoiceNumber: true, purchaseNumber: true, date: true, grandTotal: true, balanceDue: true },
          },
        },
      });

      const totalPayable = suppliers.reduce((acc, s) => acc + s.currentBalance, 0);

      return NextResponse.json({
        success: true,
        data: {
          suppliers,
          summary: { totalPayable, count: suppliers.length },
        },
      });
    }

    if (reportType === 'gst') {
      const invoices = await db.invoice.findMany({
        where: {
          status: 'Confirmed',
          ...(from || to ? { date: dateFilter } : {}),
        },
        include: { items: true },
      });

      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      let totalInvoiceValue = 0;

      const hsnSummary: Record<string, { hsn: string; count: number; taxable: number; gst: number; total: number }> = {};

      for (const inv of invoices) {
        totalTaxable += inv.taxableAmount;
        totalCgst += inv.cgst;
        totalSgst += inv.sgst;
        totalIgst += inv.igst;
        totalInvoiceValue += inv.grandTotal;

        for (const it of inv.items) {
          const h = it.hsn || '8471';
          if (!hsnSummary[h]) {
            hsnSummary[h] = { hsn: h, count: 0, taxable: 0, gst: 0, total: 0 };
          }
          hsnSummary[h].count += it.quantity;
          hsnSummary[h].taxable += it.taxableAmount;
          hsnSummary[h].gst += it.gstAmount;
          hsnSummary[h].total += it.total;
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalTaxable,
            totalCgst,
            totalSgst,
            totalIgst,
            totalGst: totalCgst + totalSgst + totalIgst,
            totalInvoiceValue,
          },
          hsnTable: Object.values(hsnSummary),
          invoices: invoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            date: inv.date,
            taxableAmount: inv.taxableAmount,
            cgst: inv.cgst,
            sgst: inv.sgst,
            igst: inv.igst,
            grandTotal: inv.grandTotal,
          })),
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid report type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
