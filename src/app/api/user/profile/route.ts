import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, verifyPassword, hashPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const user = await db.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Include quick activity metrics
    const [totalInvoices, totalCustomers, totalProducts] = await Promise.all([
      db.invoice.count({ where: { isDeleted: false } }),
      db.customer.count(),
      db.product.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        stats: {
          totalInvoices,
          totalCustomers,
          totalProducts,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const { name, email, phone, bio, avatarUrl, currentPassword, newPassword } = body;

    const existingUser = await db.user.findUnique({
      where: { id: auth.user.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Verify current password if changing password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to change password' },
          { status: 400 }
        );
      }
      const isMatch = verifyPassword(currentPassword, existingUser.password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Current password does not match' },
          { status: 400 }
        );
      }
    }

    const updated = await db.user.update({
      where: { id: existingUser.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(newPassword && { password: hashPassword(newPassword) }),
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        role: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'User profile updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user profile' },
      { status: 500 }
    );
  }
}
