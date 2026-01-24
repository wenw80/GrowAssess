import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const filter = searchParams.get('filter'); // 'my' or 'all'
    const currentUserId = await getCurrentUserId();

    const where: {
      OR?: Array<{ name: { contains: string } } | { email: { contains: string } } | { position: { contains: string } }>;
      status?: string;
      userId?: string;
    } = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { position: { contains: search } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (filter === 'my' && currentUserId) {
      where.userId = currentUserId;
    }

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          include: {
            test: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, email, phone, position, status, notes } = data;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const currentUserId = await getCurrentUserId();

    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        phone,
        position,
        status: status || 'active',
        notes,
        userId: currentUserId,
      },
    });

    return NextResponse.json(candidate, { status: 201 });
  } catch (error) {
    console.error('Error creating candidate:', error);
    return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 });
  }
}
