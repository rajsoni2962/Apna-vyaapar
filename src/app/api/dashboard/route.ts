import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today'; // 'today', 'this_week', 'this_month', 'all_time'

    const now = new Date();
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (range === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'all_time') {
      startDate = new Date('2020-01-01');
    }

    // 1. Total Sales in period
    const salesInvoices = await db.invoice.findMany({
      where: {
        status: 'Confirmed',
        date: { gte: startDate },
      },
      include: { items: true },
    });
    const periodSalesTotal = salesInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
    const periodSalesReceived = salesInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);

    // 2. Total Purchases in period
    const purchaseBills = await db.purchase.findMany({
      where: {
        status: 'Confirmed',
        date: { gte: startDate },
      },
      include: { items: true },
    });
    const periodPurchasesTotal = purchaseBills.reduce((acc, po) => acc + po.grandTotal, 0);

    // 3. Current Stock Value and Count
    const products = await db.product.findMany();
    const currentStockValue = products.reduce((acc, p) => acc + p.currentStock * p.purchasePrice, 0);
    const totalStockUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
    const lowStockItems = products.filter((p) => p.currentStock <= p.minStock);

    // 4. Receivables (Customer Outstanding)
    const customers = await db.customer.findMany();
    const totalReceivables = customers.reduce((acc, c) => acc + Math.max(0, c.currentBalance), 0);

    // 5. Payables (Supplier Outstanding)
    const suppliers = await db.supplier.findMany();
    const totalPayables = suppliers.reduce((acc, s) => acc + Math.max(0, s.currentBalance), 0);

    // 6. Recent Sales (last 6)
    const recentSales = await db.invoice.findMany({
      take: 6,
      orderBy: { date: 'desc' },
      include: { customer: true, items: true },
    });

    // 7. Recent Purchases (last 6)
    const recentPurchases = await db.purchase.findMany({
      take: 6,
      orderBy: { date: 'desc' },
      include: { supplier: true, items: true },
    });

    // 8. Recent Payments (last 6)
    const recentPayments = await db.payment.findMany({
      take: 6,
      orderBy: { date: 'desc' },
      include: { customer: true, supplier: true },
    });

    // 9. Period Expenses
    const expenses = await db.expense.findMany({
      where: { date: { gte: startDate } },
    });
    const periodExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        period: range,
        salesTotal: periodSalesTotal,
        salesReceived: periodSalesReceived,
        purchasesTotal: periodPurchasesTotal,
        currentStockValue,
        totalStockUnits,
        totalProductsCount: products.length,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 5),
        totalReceivables,
        totalPayables,
        periodExpenses,
        recentSales,
        recentPurchases,
        recentPayments,
      },
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
