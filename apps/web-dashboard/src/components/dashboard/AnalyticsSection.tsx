/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { TrendingUp, Package, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { getApiUrl } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';

const API_URL = getApiUrl();

const RANGES = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg p-3">
      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'revenue' ? `ETB ${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsSection() {
  const { getToken } = useAuth();
  const [range, setRange] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { socket } = useSocket();

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [getToken, range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── ⚡ LIVE PULSE ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // When an order is delivered or cancelled, refresh analytics
    const handlePulse = () => {
      fetchAnalytics();
    };

    socket.on('order_status_changed', handlePulse);
    socket.on('order_created', handlePulse);

    return () => {
      socket.off('order_status_changed', handlePulse);
      socket.off('order_created', handlePulse);
    };
  }, [socket, fetchAnalytics]);

  // Format daily data for charts
  const dailyChart = (data?.daily || []).map((d: any) => ({
    name: new Date(d._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    orders: d.totalOrders,
    revenue: Math.round(d.totalRevenue || 0),
    delivered: d.delivered,
    cancelled: d.cancelled,
  }));

  const summary = data?.summary;
  const pieData = summary
    ? [
        { name: 'Delivered', value: summary.delivered },
        {
          name: 'Pending/Active',
          value: Math.max(0, summary.totalOrders - summary.delivered - summary.cancelled),
        },
        { name: 'Cancelled', value: summary.cancelled },
      ].filter((d) => d.value > 0)
    : [];

  const kpis = summary
    ? [
        {
          label: 'Total Orders',
          value: summary.totalOrders,
          icon: Package,
          color: 'text-blue-600',
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          change: null,
        },
        {
          label: 'Revenue',
          value: `ETB ${(summary.totalRevenue || 0).toLocaleString()}`,
          icon: TrendingUp,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          change: null,
        },
        {
          label: 'Success Rate',
          value: `${summary.successRate}%`,
          icon: CheckCircle2,
          color: summary.successRate >= 80 ? 'text-emerald-600' : 'text-amber-600',
          bg:
            summary.successRate >= 80
              ? 'bg-emerald-50 dark:bg-emerald-950/30'
              : 'bg-amber-50 dark:bg-amber-950/30',
          change: null,
        },
        {
          label: 'Avg Delivery',
          value: summary.avgDeliveryMinutes ? `${summary.avgDeliveryMinutes} min` : '—',
          icon: Clock,
          color: 'text-violet-600',
          bg: 'bg-violet-50 dark:bg-violet-950/30',
          change: null,
        },
        {
          label: 'Cancelled',
          value: summary.cancelled,
          icon: XCircle,
          color: 'text-red-500',
          bg: 'bg-red-50 dark:bg-red-950/30',
          change: null,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Business Analytics
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real performance data from your server
          </p>
        </div>
        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                range === r.value
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-bold">
            Failed to load analytics. Make sure the server is running.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {loading
          ? [...Array(5)].map((_, i) => (
              <Card key={i} className="border-border/40">
                <CardContent className="pt-5 pb-4">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-7 w-20" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => (
              <Card
                key={kpi.label}
                className="border-border/40 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-5 pb-4">
                  <div
                    className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}
                  >
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className={`text-2xl font-black mt-1 ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Orders + Revenue Area Chart */}
        <Card className="lg:col-span-2 border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Orders & Revenue — Last {range} Days
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] pt-2">
            {loading ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : dailyChart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Package className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs font-bold">No data in this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChart}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700 }}
                    dy={8}
                  />
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', fontWeight: 700 }}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue (ETB)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    dot={false}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorOrders)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Delivery Status Donut */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Delivery Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] flex flex-col items-center justify-center">
            {loading ? (
              <Skeleton className="w-40 h-40 rounded-full" />
            ) : pieData.length === 0 ? (
              <div className="text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mb-2 opacity-30 mx-auto" />
                <p className="text-xs font-bold">No orders yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_: any, index: number) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, n: any) => [v, n]}
                      contentStyle={{
                        borderRadius: '10px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-1">
                  {pieData.map((d: any, i: number) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i] }}
                      />
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        {d.name} ({d.value})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Delivery Bar Chart */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-violet-600" />
            Daily Delivered vs Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] pt-2">
          {loading ? (
            <Skeleton className="w-full h-full rounded-xl" />
          ) : dailyChart.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">
              No data in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  dy={8}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px', fontWeight: 700 }}
                />
                <Bar dataKey="delivered" name="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
