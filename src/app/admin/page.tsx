'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders } from '@/lib/authToken';

interface UserWithUsage {
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

interface DailyStats {
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

interface OverallStats {
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

interface UserDetail {
  user: {
    userId: string;
    email?: string;
    displayName?: string;
    status: string;
    isAdmin: boolean;
    createdAt?: number;
    lastActive?: number;
    blockedAt?: number;
    blockedReason?: string;
    blockedBy?: string;
  };
  usageHistory: Array<{
    date: string;
    predict?: { calls: number; tokens?: number };
    speak?: { calls: number; characters?: number };
    categorize?: { calls: number };
    transcribe?: { calls: number };
    'clone-voice'?: { calls: number };
    totalEstimatedCost?: number;
  }>;
  rateLimits: Record<string, unknown>;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<OverallStats | null>(null);
  const [users, setUsers] = useState<UserWithUsage[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');

  // Fetch stats and users
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();

      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
      ]);

      if (statsRes.status === 403 || usersRes.status === 403) {
        setError('Access denied. Admin privileges required.');
        return;
      }

      if (!statsRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();

      setStats(statsData);
      setUsers(usersData.users || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user details
  const fetchUserDetail = async (userId: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/users/${userId}`, { headers });

      if (!res.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await res.json();
      setSelectedUser(data);
    } catch (err) {
      console.error('Error fetching user details:', err);
    }
  };

  // User action (block, unblock, etc.)
  const performUserAction = async (userId: string, action: string, reason?: string) => {
    try {
      setActionLoading(userId);
      const headers = await getAuthHeaders();

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action, reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }

      // Refresh data
      await fetchData();
      if (selectedUser?.user.userId === userId) {
        await fetchUserDetail(userId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading before making any decisions
    if (authLoading) return;

    // If no user after auth has loaded, redirect to home
    if (!user) {
      router.push('/');
      return;
    }

    // User is logged in, fetch admin data
    fetchData();
  }, [user, authLoading, router, fetchData]);

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = searchQuery === '' ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.userId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString();
  };
  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">ALS Communicator Management</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchData}
              className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"
            >
              Refresh
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-3 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-sm"
            >
              Back to App
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Users ({users.length})
            </button>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-400">{stats.totalUsers}</div>
                <div className="text-gray-400 text-sm">Total Users</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-400">{stats.activeUsers}</div>
                <div className="text-gray-400 text-sm">Active Users</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-yellow-400">{stats.suspendedUsers}</div>
                <div className="text-gray-400 text-sm">Suspended</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-red-400">{stats.blockedUsers}</div>
                <div className="text-gray-400 text-sm">Blocked</div>
              </div>
            </div>

            {/* Cost Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-400">{formatCost(stats.todayTotalCost)}</div>
                <div className="text-gray-400 text-sm">Today&apos;s Cost</div>
                <div className="text-gray-500 text-xs mt-1">{stats.todayTotalCalls} API calls</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-400">{formatCost(stats.monthTotalCost)}</div>
                <div className="text-gray-400 text-sm">30-Day Cost</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-400">
                  {formatCost(stats.monthTotalCost / 30)}
                </div>
                <div className="text-gray-400 text-sm">Avg Daily Cost</div>
              </div>
            </div>

            {/* Daily Usage Chart */}
            <div className="bg-gray-800 rounded-lg p-4 mb-8">
              <h2 className="text-lg font-semibold mb-4">Daily Usage (Last 14 Days)</h2>
              <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {stats.dailyStats.slice(0, 14).reverse().map((day) => {
                    const maxCalls = Math.max(...stats.dailyStats.slice(0, 14).map(d => d.totalCalls), 1);
                    const height = Math.max((day.totalCalls / maxCalls) * 100, 4);
                    return (
                      <div key={day.date} className="flex flex-col items-center gap-1 w-12">
                        <div className="text-xs text-gray-500">{day.totalCalls}</div>
                        <div
                          className="w-8 bg-blue-500 rounded-t transition-all"
                          style={{ height: `${height}px` }}
                          title={`${day.date}: ${day.totalCalls} calls, ${formatCost(day.totalCost)}`}
                        />
                        <div className="text-xs text-gray-500">
                          {new Date(day.date).getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Top Users by Cost (30 Days)</h2>
              <div className="space-y-2">
                {stats.topUsers.map((u, idx) => (
                  <div
                    key={u.userId}
                    className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700"
                    onClick={() => {
                      fetchUserDetail(u.userId);
                      setActiveTab('users');
                    }}
                  >
                    <div className="w-6 text-gray-500 font-mono">{idx + 1}</div>
                    <div className="flex-1">
                      <div className="font-medium">{u.displayName}</div>
                      <div className="text-gray-400 text-sm">{u.totalCalls} calls</div>
                    </div>
                    <div className="text-emerald-400 font-mono">{formatCost(u.totalCost)}</div>
                  </div>
                ))}
                {stats.topUsers.length === 0 && (
                  <div className="text-gray-500 text-center py-4">No usage data yet</div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User List */}
            <div className="lg:col-span-2">
              {/* Search and Filter */}
              <div className="flex gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              {/* Users Table */}
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">30d Cost</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Today</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.userId}
                        className={`hover:bg-gray-700/50 cursor-pointer ${
                          selectedUser?.user.userId === u.userId ? 'bg-blue-900/30' : ''
                        }`}
                        onClick={() => fetchUserDetail(u.userId)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {u.displayName || u.email?.split('@')[0] || u.userId.slice(0, 8)}
                            {u.isAdmin && (
                              <span className="ml-2 text-xs bg-purple-600 px-1.5 py-0.5 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 text-xs">{u.email || u.userId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              u.status === 'active'
                                ? 'bg-green-900 text-green-300'
                                : u.status === 'suspended'
                                ? 'bg-yellow-900 text-yellow-300'
                                : 'bg-red-900 text-red-300'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatCost(u.totalCost || 0)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm">
                            {(u.todayUsage?.predictCalls || 0) +
                              (u.todayUsage?.speakCalls || 0) +
                              (u.todayUsage?.categorizeCalls || 0) +
                              (u.todayUsage?.transcribeCalls || 0)}{' '}
                            calls
                          </div>
                          <div className="text-gray-500 text-xs">
                            {formatCost(u.todayUsage?.totalEstimatedCost || 0)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User Detail Panel */}
            <div className="bg-gray-800 rounded-lg p-4">
              {selectedUser ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedUser.user.displayName || 'Unknown User'}
                      </h3>
                      <div className="text-gray-400 text-sm">{selectedUser.user.email}</div>
                      <div className="text-gray-500 text-xs font-mono">
                        {selectedUser.user.userId}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedUser.user.status === 'active'
                          ? 'bg-green-900 text-green-300'
                          : selectedUser.user.status === 'suspended'
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-red-900 text-red-300'
                      }`}
                    >
                      {selectedUser.user.status}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created</span>
                      <span>{formatDate(selectedUser.user.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Active</span>
                      <span>{formatDateTime(selectedUser.user.lastActive)}</span>
                    </div>
                    {selectedUser.user.blockedAt && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Blocked At</span>
                          <span className="text-red-400">
                            {formatDateTime(selectedUser.user.blockedAt)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Reason</span>
                          <span className="text-red-400">
                            {selectedUser.user.blockedReason || 'No reason provided'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 mb-6">
                    <h4 className="text-sm font-medium text-gray-400">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.user.status !== 'blocked' ? (
                        <button
                          onClick={() => {
                            const reason = prompt('Block reason:');
                            if (reason !== null) {
                              performUserAction(selectedUser.user.userId, 'block', reason);
                            }
                          }}
                          disabled={actionLoading === selectedUser.user.userId}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50"
                        >
                          Block User
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            performUserAction(selectedUser.user.userId, 'unblock')
                          }
                          disabled={actionLoading === selectedUser.user.userId}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50"
                        >
                          Unblock User
                        </button>
                      )}
                      {selectedUser.user.status === 'active' && (
                        <button
                          onClick={() => {
                            const reason = prompt('Suspend reason:');
                            if (reason !== null) {
                              performUserAction(selectedUser.user.userId, 'suspend', reason);
                            }
                          }}
                          disabled={actionLoading === selectedUser.user.userId}
                          className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-sm disabled:opacity-50"
                        >
                          Suspend (24h)
                        </button>
                      )}
                      {!selectedUser.user.isAdmin ? (
                        <button
                          onClick={() =>
                            performUserAction(selectedUser.user.userId, 'makeAdmin')
                          }
                          disabled={actionLoading === selectedUser.user.userId}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm disabled:opacity-50"
                        >
                          Make Admin
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            performUserAction(selectedUser.user.userId, 'removeAdmin')
                          }
                          disabled={actionLoading === selectedUser.user.userId}
                          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm disabled:opacity-50"
                        >
                          Remove Admin
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Usage History */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">
                      Recent Usage (Last 7 Days)
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedUser.usageHistory.slice(0, 7).map((usage) => (
                        <div
                          key={usage.date}
                          className="p-2 bg-gray-700/50 rounded text-sm"
                        >
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{usage.date}</span>
                            <span className="text-emerald-400 font-mono">
                              {formatCost(usage.totalEstimatedCost || 0)}
                            </span>
                          </div>
                          <div className="text-gray-400 text-xs flex flex-wrap gap-2">
                            {usage.predict?.calls && (
                              <span>Predict: {usage.predict.calls}</span>
                            )}
                            {usage.speak?.calls && (
                              <span>Speak: {usage.speak.calls}</span>
                            )}
                            {usage.categorize?.calls && (
                              <span>Cat: {usage.categorize.calls}</span>
                            )}
                            {usage.transcribe?.calls && (
                              <span>Trans: {usage.transcribe.calls}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {selectedUser.usageHistory.length === 0 && (
                        <div className="text-gray-500 text-center py-4">
                          No usage data
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-2">👤</div>
                  <p>Select a user to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
