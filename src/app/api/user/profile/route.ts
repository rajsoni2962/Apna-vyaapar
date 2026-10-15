import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    let user = await db.user.findFirst({
      where: { role: 'admin' },
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
      user = await db.user.create({
        data: {
          username: 'admin',
          name: 'Raj Soni',
          email: 'rajsoni2962@gmail.com',
          phone: '9662278994',
          bio: 'Proprietor & Lead Systems Specialist at Ashirwad Technologies.',
          role: 'admin',
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
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // Include quick activity metrics
    const [totalInvoices, totalCustomers, totalProducts] = await Promise.all([
      db.invoice.count(),
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
    const body = await req.json();
    const { name, email, phone, bio, avatarUrl, currentPassword, newPassword } = body;

    const existingUser = await db.user.findFirst({
      where: { role: 'admin' },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Verify current password if changing password
    if (newPassword) {
      if (currentPassword && existingUser.password !== currentPassword) {
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
        ...(newPassword && { password: newPassword }),
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
