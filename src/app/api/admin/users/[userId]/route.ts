import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isAdmin } from '@/lib/apiAuth';
import { getAdminDb } from '@/lib/firebaseAdmin';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET /api/admin/users/[userId] - Get detailed user info
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;

    // Verify auth
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const adminStatus = await isAdmin(authResult.user.userId);
    if (!adminStatus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();

    // Get usage history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const usageSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('usage')
      .where('date', '>=', thirtyDaysAgoStr)
      .orderBy('date', 'desc')
      .get();

    const usageHistory = usageSnapshot.docs.map(doc => ({
      date: doc.id,
      ...doc.data(),
    }));

    // Get rate limit status
    const rateLimitSnapshot = await db
      .collection('rateLimit')
      .doc(userId)
      .collection('endpoints')
      .get();

    const rateLimits: Record<string, unknown> = {};
    rateLimitSnapshot.docs.forEach(doc => {
      rateLimits[doc.id] = doc.data();
    });

    return NextResponse.json({
      user: {
        userId,
        email: userData?.email,
        displayName: userData?.patientProfile?.name,
        status: userData?.status || 'active',
        isAdmin: userData?.isAdmin || false,
        createdAt: userData?.createdAt,
        lastActive: userData?.updatedAt,
        blockedAt: userData?.blockedAt,
        blockedReason: userData?.blockedReason,
        blockedBy: userData?.blockedBy,
      },
      usageHistory,
      rateLimits,
    });
  } catch (error) {
    console.error('Admin user detail API error:', error);
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
  }
}

// PATCH /api/admin/users/[userId] - Update user status (block/unblock/suspend)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;

    // Verify auth
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const adminStatus = await isAdmin(authResult.user.userId);
    if (!adminStatus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json();
    const { action, reason } = body;

    // Prevent self-blocking
    if (userId === authResult.user.userId && (action === 'block' || action === 'suspend')) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    switch (action) {
      case 'block':
        updateData.status = 'blocked';
        updateData.blockedAt = Date.now();
        updateData.blockedReason = reason || 'Blocked by administrator';
        updateData.blockedBy = authResult.user.userId;
        break;

      case 'suspend':
        updateData.status = 'suspended';
        updateData.suspendedAt = Date.now();
        updateData.suspendedReason = reason || 'Suspended by administrator';
        updateData.suspendedBy = authResult.user.userId;
        // Suspend for 24 hours by default
        updateData.suspendedUntil = Date.now() + 24 * 60 * 60 * 1000;
        break;

      case 'unblock':
      case 'activate':
        updateData.status = 'active';
        updateData.blockedAt = null;
        updateData.blockedReason = null;
        updateData.blockedBy = null;
        updateData.suspendedAt = null;
        updateData.suspendedReason = null;
        updateData.suspendedBy = null;
        updateData.suspendedUntil = null;
        break;

      case 'makeAdmin':
        updateData.isAdmin = true;
        break;

      case 'removeAdmin':
        // Prevent removing last admin
        const adminsSnapshot = await db.collection('users').where('isAdmin', '==', true).get();
        if (adminsSnapshot.size <= 1) {
          return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
        }
        updateData.isAdmin = false;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await userRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: `User ${action} successfully`,
      userId,
      newStatus: updateData.status || userDoc.data()?.status,
    });
  } catch (error) {
    console.error('Admin user update API error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
