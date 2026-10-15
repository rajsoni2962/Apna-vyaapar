import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const deletedInvoices = await db.invoice.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: 'desc' },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
      },
    });

    const now = new Date();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const formatted = deletedInvoices.map((inv) => {
      const deletedAt = inv.deletedAt || inv.updatedAt;
      const expiresAt = new Date(new Date(deletedAt).getTime() + SEVEN_DAYS_MS);
      const remainingMs = expiresAt.getTime() - now.getTime();
      const isExpired = remainingMs <= 0;

      let timeRemaining = 'Expired';
      if (!isExpired) {
        const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        timeRemaining = `Expires in ${days} days, ${hours} hours`;
      }

      return {
        ...inv,
        expiresAt,
        isExpired,
        timeRemaining,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
