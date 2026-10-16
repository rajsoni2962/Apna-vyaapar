import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;

    if (auth.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only admins can view user accounts' },
        { status: 403 }
      );
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        bio: true,
        businessProfileId: true,
        businessProfile: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;

    if (auth.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only admins can create user accounts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, name, password, email, phone, role, businessProfileId } = body;

    if (!username?.trim() || !name?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username, display name, and password are required' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if username already taken
    const existing = await db.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Username "${cleanUsername}" is already taken.` },
        { status: 400 }
      );
    }

    const newUser = await db.user.create({
      data: {
        username: cleanUsername,
        name: name.trim(),
        password: password.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        role: role === 'admin' ? 'admin' : 'staff',
        businessProfileId: businessProfileId || null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        businessProfileId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: newUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
