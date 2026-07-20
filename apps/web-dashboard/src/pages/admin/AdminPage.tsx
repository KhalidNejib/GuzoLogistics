import * as React from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Shield, CheckCircle, XCircle, Ban, Search, RefreshCw, Users, Clock, AlertTriangle } from 'lucide-react';
import { getApiUrl } from '@/lib/utils';
import { toast } from 'sonner';

const API_URL = getApiUrl();

interface MerchantUser {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  isApproved: boolean;
  disabled: boolean;
  onboardingCompleted: boolean;
  businessName?: string;
  phoneNumber?: string;
  serviceCity?: string;
  createdAt: string;
}

function StatusBadge({ user }: { user: MerchantUser }) {
  if (user.disabled) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
      <Ban className="w-3 h-3" /> Suspended
    </span>
  );
  if (!user.onboardingCompleted) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
      <Clock className="w-3 h-3" /> Onboarding
    </span>
  );
  if (!user.isApproved) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <AlertTriangle className="w-3 h-3" /> Pending
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <CheckCircle className="w-3 h-3" /> Active
    </span>
  );
}

export default function AdminPage() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [users, setUsers] = React.useState<MerchantUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('MERCHANT');
  const [statusFilter, setStatusFilter] = React.useState('');

  const isAdmin = (clerkUser?.publicMetadata?.role as string)?.toUpperCase() === 'ADMIN';

  const fetchUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`${API_URL}/api/v1/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setUsers(data.users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [getToken, roleFilter, statusFilter, search]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApprove = async (userId: string, approve: boolean) => {
    try {
      setActionLoading(userId + '-approve');
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/admin/users/${userId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: approve }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(approve ? '✅ Merchant approved — they now have full access.' : '⚠️ Approval revoked.');
      fetchUsers();
    } catch {
      toast.error('Action failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisable = async (userId: string, disable: boolean) => {
    try {
      setActionLoading(userId + '-disable');
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/admin/users/${userId}/disable`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: disable }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(disable ? '🚫 Account suspended.' : '✅ Account reactivated.');
      fetchUsers();
    } catch {
      toast.error('Action failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = users.filter(u => u.onboardingCompleted && !u.isApproved && !u.disabled).length;
  const activeCount = users.filter(u => u.isApproved && !u.disabled).length;
  const suspendedCount = users.filter(u => u.disabled).length;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mt-2">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            Admin Control Panel
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and verify registered users and merchants.</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Pending Approval', value: pendingCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Active', value: activeCount, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Suspended', value: suspendedCount, icon: Ban, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-background border border-border/40 rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-background border border-border/40 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
        >
          <option value="">All Roles</option>
          <option value="MERCHANT">Merchants</option>
          <option value="RIDER">Riders</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="active">Active</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-background border border-border/40 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users className="w-12 h-12 text-muted-foreground/20" />
            <p className="text-muted-foreground text-sm">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Business</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Joined</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-foreground">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                        {u.phoneNumber && u.phoneNumber !== '+251000000000' && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{u.phoneNumber}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="font-medium text-foreground">{u.businessName || '—'}</p>
                      {u.serviceCity && <p className="text-xs text-muted-foreground mt-0.5">{u.serviceCity}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        u.role === 'MERCHANT' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge user={u} />
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {/* Approve / Revoke */}
                        {u.role === 'MERCHANT' && u.onboardingCompleted && !u.disabled && (
                          u.isApproved ? (
                            <button
                              onClick={() => handleApprove(u._id, false)}
                              disabled={actionLoading === u._id + '-approve'}
                              title="Revoke Approval"
                              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApprove(u._id, true)}
                              disabled={actionLoading === u._id + '-approve'}
                              title="Approve Merchant"
                              className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )
                        )}

                        {/* Suspend / Reactivate */}
                        {u.role !== 'ADMIN' && (
                          u.disabled ? (
                            <button
                              onClick={() => handleDisable(u._id, false)}
                              disabled={actionLoading === u._id + '-disable'}
                              title="Reactivate Account"
                              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-40"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDisable(u._id, true)}
                              disabled={actionLoading === u._id + '-disable'}
                              title="Suspend Account"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
