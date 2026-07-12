import { useState, useMemo } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ChevronRight, 
  PieChart, 
  TrendingUp, 
  UserCheck, 
  Calendar, 
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Printer,
  ShieldCheck
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Separator,
  Badge,
} from '@/components/ui';
import { toast } from 'sonner';

interface ReportCenterProps {
  orders: any[];
  riders?: any[];
}

// Returns the current fiscal quarter label (e.g. "Q3 Operational")
function getCurrentQuarterLabel(): string {
  const month = new Date().getMonth(); // 0-indexed
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} Operational`;
}

export default function ReportCenter({ orders, riders = [] }: ReportCenterProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // ── COMPUTED METRICS ───────────────────────────────────────────
  const metrics = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'DELIVERED');
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED');
    const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
    const closedOrders = completedOrders.length + cancelledOrders.length;

    // Success rate: completed / (completed + cancelled) — excludes still-active
    const successRate = closedOrders > 0 ? (completedOrders.length / closedOrders) * 100 : 0;

    // ── Average Delivery Latency ──────────────────────────────────
    // Use avgDeliveryTimeMs from rider leaderboard data when available.
    // Fall back to computing from order.createdAt → order.updatedAt on delivered orders.
    let avgLatencyMinutes: number | null = null;

    const riderTimings = riders
      .map(r => r.avgDeliveryTimeMs)
      .filter((ms): ms is number => typeof ms === 'number' && ms > 0);

    if (riderTimings.length > 0) {
      const avgMs = riderTimings.reduce((a, b) => a + b, 0) / riderTimings.length;
      avgLatencyMinutes = Math.round(avgMs / 60_000);
    } else {
      // Fallback: compute from delivered orders with both createdAt + updatedAt
      const orderDurations = completedOrders
        .filter(o => o.createdAt && o.updatedAt && o.updatedAt !== o.createdAt)
        .map(o => new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime())
        .filter(ms => ms > 0 && ms < 24 * 60 * 60 * 1000); // sanity: < 24h

      if (orderDurations.length > 0) {
        const avgMs = orderDurations.reduce((a, b) => a + b, 0) / orderDurations.length;
        avgLatencyMinutes = Math.round(avgMs / 60_000);
      }
    }

    // Benchmark: <30m = great, <45m = good, <60m = ok, >60m = slow
    const latencyBenchmark = avgLatencyMinutes === null 
      ? 'No data' 
      : avgLatencyMinutes < 30 ? '🏆 Excellent'
      : avgLatencyMinutes < 45 ? '✅ Optimal'
      : avgLatencyMinutes < 60 ? '🔶 Acceptable'
      : '🔴 Above Target';

    const latencyBarWidth = avgLatencyMinutes === null 
      ? 0 
      : Math.min(100, Math.max(0, 100 - (avgLatencyMinutes / 90) * 100)); // 90m = 0%, 0m = 100%

    // ── Fleet Status ──────────────────────────────────────────────
    const approvedRiders = riders.filter(r => r.onboardingStatus === 'APPROVED');
    const activeRiders = approvedRiders.filter(r => !r.disabled);
    const totalRiders = approvedRiders.length;

    // Fleet load: active orders / total approved rider count
    const fleetLoadPct = totalRiders > 0 ? Math.min(100, Math.round((activeOrders.length / totalRiders) * 100)) : 0;
    const fleetStatusLabel = activeRiders.length === 0 
      ? 'Offline' 
      : activeRiders.length < totalRiders / 2 
      ? 'Reduced' 
      : 'Active';

    // ── Compliance: riders with Fayda ID + License on file ────────
    const ridersWithDocs = approvedRiders.filter(r => 
      (r.faydaIdPhotoUrl || r.idPhotoUrl) && r.licensePhotoUrl
    ).length;
    const compliancePct = totalRiders > 0 ? ((ridersWithDocs / totalRiders) * 100).toFixed(1) : '0.0';

    // ── Projected Growth ─────────────────────────────────────────
    // Compare revenue this month vs last month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const lastMonthEnd = thisMonthStart;

    const thisMonthRevenue = completedOrders
      .filter(o => new Date(o.updatedAt || o.createdAt).getTime() >= thisMonthStart)
      .reduce((s, o) => s + (o.priceInfo?.amount || 0), 0);

    const lastMonthRevenue = completedOrders
      .filter(o => {
        const t = new Date(o.updatedAt || o.createdAt).getTime();
        return t >= lastMonthStart && t < lastMonthEnd;
      })
      .reduce((s, o) => s + (o.priceInfo?.amount || 0), 0);

    let growthPct: number | null = null;
    if (lastMonthRevenue > 0) {
      growthPct = Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
    }

    const growthLabel = growthPct === null
      ? 'Insufficient data for projection'
      : growthPct > 0
      ? `↑ ${growthPct}% month-over-month revenue growth — fleet is scaling well.`
      : growthPct === 0
      ? 'Revenue is stable compared to last month.'
      : `↓ ${Math.abs(growthPct)}% decline vs last month — review mission volume.`;

    const nextQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 2 > 4 ? 1 : Math.floor(new Date().getMonth() / 3) + 2}`;

    return {
      completedOrders,
      cancelledOrders,
      activeOrders,
      successRate,
      avgLatencyMinutes,
      latencyBenchmark,
      latencyBarWidth,
      fleetStatusLabel,
      activeRiders: activeRiders.length,
      totalRiders,
      fleetLoadPct,
      compliancePct,
      ridersWithDocs,
      growthLabel,
      nextQuarter,
      growthPct,
    };
  }, [orders, riders]);

  // ── EXPORT ENGINE ──────────────────────────────────────────────
  const exportToCSV = (data: any[], fileName: string) => {
    setIsExporting(fileName);
    try {
      if (data.length === 0) {
        toast.error('No data available for export');
        return;
      }

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(obj => 
        Object.values(obj).map(val => {
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
          return val;
        }).join(',')
      );
      
      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Export Successful', { description: `${fileName} spreadsheet generated.` });
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setIsExporting(null);
    }
  };

  const handleOrderExport = () => {
    const exportData = orders.map(o => ({
      ID: o._id.slice(-8).toUpperCase(),
      Status: o.status,
      Customer: o.customerInfo?.name || 'N/A',
      Pickup: o.pickupInfo?.address || 'N/A',
      Dropoff: o.dropoffInfo?.address || 'N/A',
      Fare: o.priceInfo?.amount || 0,
      Date: new Date(o.createdAt).toLocaleString()
    }));
    exportToCSV(exportData, 'Logistics_Missions');
  };

  const handleFinancialExport = () => {
    const exportData = metrics.completedOrders.map(o => ({
      Reference: o._id.slice(-8).toUpperCase(),
      Method: o.paymentInfo?.method || o.paymentMethod || 'CASH',
      Revenue: o.priceInfo?.amount || 0,
      Date: new Date(o.updatedAt || o.createdAt).toLocaleString()
    }));
    exportToCSV(exportData, 'Financial_Yield_Logs');
  };

  const handleRiderExport = () => {
    const exportData = riders.map(r => ({
      Name: r.fullName || 'N/A',
      Missions: r.totalDeliveries || 0,
      Revenue: r.totalRevenue || 0,
      AvgLatency_mins: r.avgDeliveryTimeMs ? Math.round(r.avgDeliveryTimeMs / 60_000) : 'N/A',
      CashHeld: r.cashHeld || 0,
      Status: r.disabled ? 'Suspended' : 'Active',
      DocsOnFile: ((r.faydaIdPhotoUrl || r.idPhotoUrl) && r.licensePhotoUrl) ? 'Yes' : 'Incomplete',
    }));
    exportToCSV(exportData, 'Pilot_Performance_Report');
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* 🚀 AUDIT & EXPORT HUB */}
      <Card className="md:col-span-1 border-border/40 shadow-sm overflow-hidden flex flex-col">
        <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border/40 py-5">
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Download className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-lg font-bold">Audit Center</CardTitle>
           </div>
           <CardDescription>Export tactical data for offline verification.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4 flex-1">
           <div className="space-y-1">
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 gap-3 font-bold border-slate-100 hover:bg-slate-50 transition-all rounded-xl shadow-xs"
                onClick={handleOrderExport}
                disabled={isExporting !== null}
              >
                 <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                 Missions History (.CSV)
                 <ChevronRight className="ml-auto w-4 h-4 text-slate-300" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 gap-3 font-bold border-slate-100 hover:bg-slate-50 transition-all rounded-xl shadow-xs"
                onClick={handleFinancialExport}
                disabled={isExporting !== null}
              >
                 <FileText className="w-4 h-4 text-blue-500" />
                 Yield Analytics (.CSV)
                 <ChevronRight className="ml-auto w-4 h-4 text-slate-300" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 gap-3 font-bold border-slate-100 hover:bg-slate-50 transition-all rounded-xl shadow-xs"
                onClick={handleRiderExport}
                disabled={isExporting !== null}
              >
                 <UserCheck className="w-4 h-4 text-indigo-500" />
                 Pilot Lifecycle (.CSV)
                 <ChevronRight className="ml-auto w-4 h-4 text-slate-300" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 gap-3 font-bold border-slate-100 hover:bg-slate-50 transition-all rounded-xl shadow-xs"
                onClick={() => toast.info('Advanced PDF rendering...', { description: 'Generating high-fidelity tactical report.' })}
              >
                 <Printer className="w-4 h-4 text-orange-500" />
                 Print Shift Summary
                 <ChevronRight className="ml-auto w-4 h-4 text-slate-300" />
              </Button>
           </div>

           <div className="pt-4 mt-auto">
              <div className="rounded-xl border border-slate-100 p-4 bg-muted/20">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-relaxed mb-3">Compliance Ready</p>
                 <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-600">
                      {metrics.ridersWithDocs} of {metrics.totalRiders} pilots fully verified
                    </span>
                 </div>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* 📈 CORPORATE WELL-BEING */}
      <Card className="md:col-span-2 border-border/40 shadow-sm overflow-hidden">
         <CardHeader className="py-5 border-b border-border/40 bg-slate-50/50 dark:bg-zinc-900/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" /> Corporate Health Monitor
              </CardTitle>
              <CardDescription>Visualizing operational growth and risk levels.</CardDescription>
            </div>
            <Badge variant="secondary" className="font-black text-[10px] uppercase tracking-widest px-3 py-1 bg-indigo-100 text-indigo-700 border-indigo-200">
               {getCurrentQuarterLabel()}
            </Badge>
         </CardHeader>
         <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {/* Stat 1: Success Rate */}
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <PieChart className="w-5 h-5 text-emerald-600" />
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Success Rate</p>
                        <h4 className="text-2xl font-black text-slate-900">{metrics.successRate.toFixed(1)}%</h4>
                     </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                     <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-1000 origin-left"
                        style={{ width: `${metrics.successRate}%` }}
                     />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold italic">
                    Calculated from {metrics.completedOrders.length} completed missions
                  </p>
               </div>

               {/* Stat 2: Avg Latency */}
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-600" />
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Avg Latency</p>
                        <h4 className="text-2xl font-black text-slate-900">
                          {metrics.avgLatencyMinutes !== null ? `${metrics.avgLatencyMinutes}m` : '—'}
                        </h4>
                     </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                     <span className="text-slate-400 uppercase tracking-widest">Efficiency</span>
                     <span className="text-orange-600 flex items-center gap-1">
                        {metrics.latencyBenchmark} <ArrowUpRight className="w-3 h-3" />
                     </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                     <div 
                       className="bg-orange-400 h-full rounded-full transition-all duration-1000"
                       style={{ width: `${metrics.latencyBarWidth}%` }} 
                     />
                  </div>
               </div>

               {/* Stat 3: Fleet Status */}
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-indigo-600" />
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Fleet Status</p>
                        <h4 className="text-2xl font-black text-slate-900">{metrics.fleetStatusLabel}</h4>
                     </div>
                  </div>
                  <div className="space-y-2">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500">
                          Missions vs Capacity ({metrics.activeOrders.length} active / {metrics.totalRiders} pilots)
                        </span>
                        <span className="text-[10px] font-black text-indigo-600">{metrics.fleetLoadPct}% Load</span>
                     </div>
                     <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${metrics.fleetLoadPct}%` }}
                        />
                     </div>
                  </div>
               </div>
            </div>

            <Separator className="my-8 opacity-40" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Yield Outlook */}
               <div className="group p-5 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/10 transition-all">
                  <div className="flex items-center justify-between mb-4">
                     <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                        <Calendar className="w-4 h-4 text-slate-500 group-hover:text-indigo-600" />
                     </div>
                     <span className="text-[10px] font-black text-slate-300 group-hover:text-indigo-300 tracking-[2px] uppercase">Yield Outlook</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1 uppercase tracking-tight">
                    Projected {metrics.nextQuarter} Growth
                  </h5>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-[280px]">
                    {metrics.growthLabel}
                  </p>
               </div>

               {/* Compliance / Risk */}
               <div className="group p-5 rounded-2xl border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/10 transition-all">
                  <div className="flex items-center justify-between mb-4">
                     <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                        <ShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-emerald-600" />
                     </div>
                     <span className="text-[10px] font-black text-slate-300 group-hover:text-emerald-300 tracking-[2px] uppercase">Compliance</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1 uppercase tracking-tight">Risk Integrity Level</h5>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-[280px]">
                    Fleet integrity is at {metrics.compliancePct}%. {metrics.ridersWithDocs} of {metrics.totalRiders} active pilot{metrics.totalRiders !== 1 ? 's have' : ' has'} verified primary documentation on file.
                  </p>
               </div>
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
