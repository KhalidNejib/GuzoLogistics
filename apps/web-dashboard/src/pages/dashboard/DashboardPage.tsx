/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Package,
  Clock,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
} from '@/components/ui';
import CreateOrderForm from '@/components/dashboard/CreateOrderForm';
import { useSocket } from '@/hooks/useSocket';
import { useFetchOrders } from '@/hooks/useFetchOrders';
import { toast } from 'sonner';
import RiderLeaderboard from '@/components/dashboard/RiderLeaderboard';
import AnalyticsSection from '@/components/dashboard/AnalyticsSection';
import FinanceSection from '@/components/dashboard/FinanceSection';
import FleetRadar from '@/components/dashboard/FleetRadar';
import SafetySection from '@/components/dashboard/SafetySection';
import ReportCenter from '@/components/dashboard/ReportCenter';
import { getApiUrl } from '@/lib/utils';
const API_URL = getApiUrl();

export default function DashboardPage() {
  const { getToken } = useAuth();
  const { socket, joinOrder } = useSocket();
  const { orders, isLoading, refetch } = useFetchOrders();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [riders, setRiders] = useState<any[]>([]);

  // Fetch rider roster for health monitor metrics
  const fetchRiders = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/v1/merchant/rider-leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setRiders(await res.json());
    } catch { /* silent */ }
  }, [getToken]);

  useEffect(() => { fetchRiders(); }, [fetchRiders]);

  // ── Socket Listeners ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onStatusUpdate = (data: { orderId: string; status: string }) => {
      // 🚀 BRAIN SYNC: Update the entire data model
      refetch();
      
      const playSound = (url: string, vol = 0.5) => {
        try { const a = new Audio(url); a.volume = vol; a.play().catch(() => {}); } catch {}
      };

      if (data.status === 'DELIVERED') {
        playSound('https://cdn.freesound.org/previews/171/171671_2437358-lq.mp3', 0.6);
        toast.success(`Mission Success!`, { description: `Order #${data.orderId.slice(-6).toUpperCase()} is officially delivered.` });
      } else if (['ARRIVED_PICKUP', 'ARRIVED_DELIVERY'].includes(data.status)) {
        playSound('https://cdn.freesound.org/previews/387/387232_1474271-lq.mp3', 0.5);
      } else if (['ACCEPTED', 'PICKED_UP'].includes(data.status)) {
        playSound('https://cdn.freesound.org/previews/242/242502_4414120-lq.mp3', 0.4);
      }
    };

    const onNewOrder = (data: any) => {
      refetch();
      try { const a = new Audio('https://cdn.freesound.org/previews/536/536420_1648170-lq.mp3'); a.volume = 0.7; a.play().catch(() => {}); } catch {}
      toast.success('New Mission Dispatch!', { description: `Order #${data._id?.slice(-6).toUpperCase()} created.`, duration: 10000 });
    };

    // 📸 POD Live Alert
    const onPhotoReady = (data: { orderId: string }) => {
      refetch();
      toast.info('Proof Uploaded', { description: `Rider attached POD photo for #${data.orderId.slice(-6).toUpperCase()}` });
    };

    socket.on('order_status_changed', onStatusUpdate);
    socket.on('order_created', onNewOrder);
    socket.on('order_photo_ready', onPhotoReady);
    socket.on('notification', (data: { title: string; body: string }) => {
      toast.info(data.title, { description: data.body, duration: 8000 });
    });

    return () => {
      socket.off('order_status_changed', onStatusUpdate);
      socket.off('order_created', onNewOrder);
      socket.off('order_photo_ready', onPhotoReady);
      socket.off('notification');
    };
  }, [socket, refetch]);

  // ── Room Joining ──────────────────────────────────────────────────────
  const joinedRooms = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!socket || !orders) return;
    orders.forEach((order: any) => {
      if (!['DELIVERED', 'CANCELLED'].includes(order.status) && !joinedRooms.current.has(order._id)) {
        joinOrder(order._id);
        joinedRooms.current.add(order._id);
      }
    });
  }, [orders, socket, joinOrder]);

  const stats = [
    { title: 'Total Orders', value: orders?.length.toLocaleString() || '0', icon: Package, trend: 'Lifetime', color: 'from-blue-500/10 to-blue-500/5', text: 'text-blue-600' },
    { title: 'Active Deliveries', value: orders?.filter((o: any) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length.toString() || '0', icon: Clock, trend: 'Real-time', color: 'from-amber-500/10 to-amber-500/5', text: 'text-amber-600' },
    { title: 'Completed Today', value: orders?.filter((o: any) => o.status === 'DELIVERED' && new Date(o.updatedAt || o.createdAt).toDateString() === new Date().toDateString()).length.toString() || '0', icon: ShieldCheck, trend: 'Today', color: 'from-emerald-500/10 to-emerald-500/5', text: 'text-emerald-600' },
    { title: 'Revenue', value: `ETB ${orders?.filter((o: any) => o.status === 'DELIVERED').reduce((s: number, o: any) => s + (o.priceInfo?.amount || 0), 0).toLocaleString() || '0'}`, icon: TrendingUp, trend: 'Completed', color: 'from-violet-500/10 to-violet-500/5', text: 'text-violet-600' },
  ];

  return (
    <div className="space-y-4 md:space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Merchant Dashboard
          </h2>
          <p className="text-muted-foreground text-sm">Real-time delivery management and analytics.</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="h-10 md:h-12 px-3 md:px-4 border-border/60 hover:bg-muted/50 hover:text-primary transition-all font-bold group shadow-sm">
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-primary' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </Button>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button className="flex-1 md:flex-none font-bold shadow-xl shadow-primary/20 h-10 md:h-14 px-4 md:px-6 bg-linear-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl text-white">
                <Package className="mr-2 h-5 w-5" /> Dispatch New Order
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-[600px] overflow-y-auto">
              <SheetHeader className="pb-6">
                <SheetTitle className="text-2xl font-bold">Create New Delivery</SheetTitle>
                <SheetDescription>Fill in the details below to dispatch a new delivery order.</SheetDescription>
              </SheetHeader>
              <CreateOrderForm onSuccess={() => { setIsSheetOpen(false); refetch(); }} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* FINANCE SECTION */}
      <FinanceSection />

      {/* KPI CARDS */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? [...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/40 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-3 w-32" /></CardContent>
            </Card>))
          : stats.map((stat) => (
            <Card key={stat.title} className="border-border/40 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className={`absolute inset-0 bg-linear-to-br ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.text}`} />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                <p className="text-[10px] font-bold text-muted-foreground mt-1"><span className={stat.text}>{stat.trend}</span> status</p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* 🚨 SAFETY COMMAND CENTER */}
      <SafetySection />

      {/* 📊 BUSINESS INTELLIGENCE & EXPORT */}
      <ReportCenter orders={orders || []} riders={riders} />

      {/* ANALYTICS */}
      <AnalyticsSection />

      {/* MAP & LEADERBOARD GRID */}
      <div className="space-y-6">
        <FleetRadar />
        <RiderLeaderboard />
      </div>
    </div>
  );
}
