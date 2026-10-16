import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;

    if (auth.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, role, password, businessProfileId } = body;

    const data: any = {
      name: name !== undefined ? name.trim() : undefined,
      email: email !== undefined ? email.trim() : undefined,
      phone: phone !== undefined ? phone.trim() : undefined,
      role: role !== undefined ? (role === 'admin' ? 'admin' : 'staff') : undefined,
      businessProfileId: businessProfileId !== undefined ? businessProfileId : undefined,
    };

    if (password && password.trim()) {
      data.password = password.trim();
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        businessProfileId: true,
        updatedAt: true,
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
    const auth = await requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;

    if (auth.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const { id } = await params;

    if (auth.user.id === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own active administrator account' },
        { status: 400 }
      );
    }

    // Ensure at least one admin remains
    const adminCount = await db.user.count({ where: { role: 'admin' } });
    const targetUser = await db.user.findUnique({ where: { id } });

    if (targetUser?.role === 'admin' && adminCount <= 1) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the only remaining admin account' },
        { status: 400 }
      );
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'User account removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
