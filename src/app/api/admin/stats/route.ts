import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isAdmin } from '@/lib/apiAuth';
import { getAdminDb } from '@/lib/firebaseAdmin';

export interface DailyStats {
  date: string;
  totalCalls: number;
  predictCalls: number;
  speakCalls: number;
  categorizeCalls: number;
  transcribeCalls: number;
  cloneVoiceCalls: number;
  totalCost: number;
  activeUsers: number;
}

export interface OverallStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  suspendedUsers: number;
  todayTotalCalls: number;
  todayTotalCost: number;
  monthTotalCost: number;
  dailyStats: DailyStats[];
  topUsers: Array<{
    userId: string;
    displayName: string;
    totalCost: number;
    totalCalls: number;
  }>;
}

// GET /api/admin/stats - Get overall statistics
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get date ranges
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Get all users
    const usersSnapshot = await db.collection('users').get();

    let totalUsers = 0;
    let activeUsers = 0;
    let blockedUsers = 0;
    let suspendedUsers = 0;

    // Count user statuses
    usersSnapshot.docs.forEach(doc => {
      totalUsers++;
      const status = doc.data()?.status || 'active';
      if (status === 'active') activeUsers++;
      else if (status === 'blocked') blockedUsers++;
      else if (status === 'suspended') suspendedUsers++;
    });

    // Aggregate daily stats and top users
    const dailyStatsMap: Record<string, DailyStats> = {};
    const userCosts: Record<string, { userId: string; displayName: string; totalCost: number; totalCalls: number }> = {};

    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStatsMap[dateStr] = {
        date: dateStr,
        totalCalls: 0,
        predictCalls: 0,
        speakCalls: 0,
        categorizeCalls: 0,
        transcribeCalls: 0,
        cloneVoiceCalls: 0,
        totalCost: 0,
        activeUsers: 0,
      };
    }

    // Aggregate usage from all users
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const displayName = userData?.patientProfile?.name || userData?.email?.split('@')[0] || userId.slice(0, 8);

      // Initialize user cost tracking
      if (!userCosts[userId]) {
        userCosts[userId] = {
          userId,
          displayName,
          totalCost: 0,
          totalCalls: 0,
        };
      }

      try {
        const usageSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('usage')
          .where('date', '>=', thirtyDaysAgoStr)
          .get();

        usageSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const date = data.date || doc.id;

          // Skip if date is not in our range
          if (!dailyStatsMap[date]) return;

          const predictCalls = data.predict?.calls || 0;
          const speakCalls = data.speak?.calls || 0;
          const categorizeCalls = data.categorize?.calls || 0;
          const transcribeCalls = data.transcribe?.calls || 0;
          const cloneVoiceCalls = data['clone-voice']?.calls || 0;
          const cost = data.totalEstimatedCost || 0;
          const totalCalls = predictCalls + speakCalls + categorizeCalls + transcribeCalls + cloneVoiceCalls;

          // Update daily stats
          dailyStatsMap[date].predictCalls += predictCalls;
          dailyStatsMap[date].speakCalls += speakCalls;
          dailyStatsMap[date].categorizeCalls += categorizeCalls;
          dailyStatsMap[date].transcribeCalls += transcribeCalls;
          dailyStatsMap[date].cloneVoiceCalls += cloneVoiceCalls;
          dailyStatsMap[date].totalCalls += totalCalls;
          dailyStatsMap[date].totalCost += cost;
          if (totalCalls > 0) {
            dailyStatsMap[date].activeUsers++;
          }

          // Update user totals
          userCosts[userId].totalCost += cost;
          userCosts[userId].totalCalls += totalCalls;
        });
      } catch (err) {
        console.error(`Error fetching usage for user ${userId}:`, err);
      }
    }

    // Convert to sorted arrays
    const dailyStats = Object.values(dailyStatsMap).sort((a, b) => b.date.localeCompare(a.date));
    const topUsers = Object.values(userCosts)
      .filter(u => u.totalCalls > 0)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    // Calculate totals
    const todayStats = dailyStatsMap[today] || { totalCalls: 0, totalCost: 0 };
    const monthTotalCost = dailyStats.reduce((sum, day) => sum + day.totalCost, 0);

    const stats: OverallStats = {
      totalUsers,
      activeUsers,
      blockedUsers,
      suspendedUsers,
      todayTotalCalls: todayStats.totalCalls,
      todayTotalCost: todayStats.totalCost,
      monthTotalCost,
      dailyStats,
      topUsers,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
