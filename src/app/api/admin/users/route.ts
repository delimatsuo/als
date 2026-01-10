import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isAdmin } from '@/lib/apiAuth';
import { getAdminDb } from '@/lib/firebaseAdmin';

export interface UserWithUsage {
  userId: string;
  email?: string;
  displayName?: string;
  status: 'active' | 'suspended' | 'blocked';
  isAdmin: boolean;
  createdAt?: number;
  lastActive?: number;
  todayUsage?: {
    predictCalls?: number;
    speakCalls?: number;
    categorizeCalls?: number;
    transcribeCalls?: number;
    totalEstimatedCost?: number;
  };
  totalCost?: number;
}

// GET /api/admin/users - List all users with usage stats
export async function GET(request: NextRequest) {
  try {
    // Verify auth
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const adminStatus = await isAdmin(authResult.user.userId);
    if (!adminStatus) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get today's date for usage lookup
    const today = new Date().toISOString().split('T')[0];

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users: UserWithUsage[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      // Get today's usage
      let todayUsage = {};
      let totalCost = 0;

      try {
        const usageDoc = await db
          .collection('users')
          .doc(userDoc.id)
          .collection('usage')
          .doc(today)
          .get();

        if (usageDoc.exists) {
          const usageData = usageDoc.data();
          todayUsage = {
            predictCalls: usageData?.predict?.calls || 0,
            speakCalls: usageData?.speak?.calls || 0,
            categorizeCalls: usageData?.categorize?.calls || 0,
            transcribeCalls: usageData?.transcribe?.calls || 0,
            totalEstimatedCost: usageData?.totalEstimatedCost || 0,
          };
        }

        // Get total cost (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const usageSnapshot = await db
          .collection('users')
          .doc(userDoc.id)
          .collection('usage')
          .where('date', '>=', thirtyDaysAgoStr)
          .get();

        usageSnapshot.docs.forEach(doc => {
          totalCost += doc.data()?.totalEstimatedCost || 0;
        });
      } catch (err) {
        console.error(`Error fetching usage for user ${userDoc.id}:`, err);
      }

      users.push({
        userId: userDoc.id,
        email: userData.email || userData.patientProfile?.name,
        displayName: userData.patientProfile?.name || userData.email?.split('@')[0],
        status: userData.status || 'active',
        isAdmin: userData.isAdmin || false,
        createdAt: userData.createdAt,
        lastActive: userData.updatedAt,
        todayUsage,
        totalCost,
      });
    }

    // Sort by total cost (descending) to show highest users first
    users.sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
