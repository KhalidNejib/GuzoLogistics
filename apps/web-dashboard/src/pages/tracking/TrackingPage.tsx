import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Map as MapIcon, Wifi, WifiOff, Search, Navigation, Phone, Eye, EyeOff } from 'lucide-react';
import LogisticsMap from '@/components/dashboard/LogisticsMap';
import { useSocket } from '@/hooks/useSocket';
import { useFetchOrders } from '@/hooks/useFetchOrders';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TrackingPage() {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId');
  const { socket, status, joinOrder } = useSocket();
  const { orders, refetch } = useFetchOrders();

  // Fleet & Focus State
  const [activeOrder, setActiveOrder] = useState<string | undefined>(initialOrderId || undefined);
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);
  const [fleet, setFleet] = useState<Record<string, [number, number]>>({});
  const [telemetry, setTelemetry] = useState<Record<string, { battery?: number; speed?: number; riderName?: string; riderPhone?: string }>>({});
  const [search, setSearch] = useState('');
  const [showDelivered] = useState(false);
  const [isFocusedView, setIsFocusedView] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      joinOrder('global');
      if (activeOrder) joinOrder(activeOrder);
    };
    const onRiderMove = (data: any) => {
      setFleet(prev => ({ ...prev, [data.orderId]: [data.lat, data.lng] as [number, number] }));
      setTelemetry(prev => ({
        ...prev,
        [data.orderId]: { ...prev[data.orderId], ...data },
      }));
      if (data.orderId === activeOrder) setRiderLocation([data.lat, data.lng]);
    };
    const onStatusUpdate = (data: any) => {
      refetch();
      if (data.status === 'DELIVERED') {
        toast.success(`Mission Success!`, { description: `Order delivered successfully.` });
      }
    };
    socket.on('connect', onConnect);
    socket.on('rider_moved', onRiderMove);
    socket.on('order_status_changed', onStatusUpdate);
    if (socket.connected) onConnect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('rider_moved', onRiderMove);
      socket.off('order_status_changed', onStatusUpdate);
    };
  }, [socket, activeOrder, joinOrder, refetch]);

  // Sync Focus Mode
  useEffect(() => {
    if (!activeOrder) setIsFocusedView(false);
  }, [activeOrder]);

  const handleOrderClick = (orderId: string) => {
    setActiveOrder(orderId);
    joinOrder(orderId);
    if (window.innerWidth < 1024) setIsFocusedView(true);
  };

  const visibleOrders = (orders || []).filter((o: any) => {
    const matchesStatus = showDelivered ? true : o.status !== 'DELIVERED';
    const matchesSearch = !search || o._id.toLowerCase().includes(search.toLowerCase()) || (o.deliveryAddress?.addressText || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeOrders = (orders || []).filter((o: any) => o.status !== 'DELIVERED');
  const activeOrderObj = orders?.find((o: any) => o._id === activeOrder);
  const activeRiderPhone = telemetry[activeOrder || '']?.riderPhone;

  return (
    <div className="min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* 🔝 HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isFocusedView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFocusedView(false)}
              className="h-9 px-3 rounded-xl border-slate-200 hover:bg-slate-100 transition-all font-black text-[10px] uppercase tracking-wider group"
            >
              <Navigation className="w-3.5 h-3.5 -rotate-90 mr-1.5 transition-transform group-hover:-translate-x-1" /> Back to Fleet
            </Button>
          )}
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {isFocusedView ? 'Rider Tactical View' : 'Live Fleet Command Center'}
            </h2>
            <p className="text-muted-foreground text-sm font-medium">
              {isFocusedView ? `Tracking Mission #${activeOrder?.slice(-8).toUpperCase()}` : 'Monitor all active deliveries in real-time.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isFocusedView && activeOrderObj && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 font-bold gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all hidden md:flex"
              onClick={() => {
                if (activeOrderObj?.trackingUrlToken) {
                  const url = `${window.location.origin}/track/${activeOrderObj.trackingUrlToken}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Link copied!');
                }
              }}
            >
              <Navigation className="h-4 w-4" /> Share Link
            </Button>
          )}
          {activeRiderPhone && (
            <a
              href={`tel:${activeRiderPhone}`}
              className="hidden md:flex h-9 px-4 items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all shadow-sm"
            >
              <Phone className="h-3.5 w-3.5" /> Call Rider
            </a>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-zinc-900 rounded-full border border-border shadow-inner">
            <div className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              {status === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3 text-rose-500" />}
              {status}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFocusedView(!isFocusedView)}
            className="h-10 px-4 rounded-xl border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center gap-2 shadow-sm"
          >
            {isFocusedView ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {isFocusedView ? 'Exit Zen Mode' : 'Zen Command'}
          </Button>
        </div>
      </div>

      {/* 🚀 SPLIT VIEW LAYOUT */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-0">
        {!isFocusedView && (
          <Card className="lg:col-span-4 h-[300px] lg:h-full border-border/40 shadow-sm flex flex-col overflow-hidden bg-slate-50/50 dark:bg-zinc-900/50 shrink-0">
            <CardHeader className="py-3 border-b border-border/40 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-primary" /> Active Missions
                </CardTitle>
                <div className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-bold">
                  {activeOrders.length} Active
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search order, address..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-lg"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-y-auto">
              <div className="divide-y divide-border/40">
                {visibleOrders.map((order: any) => (
                  <div
                    key={order._id}
                    onClick={() => handleOrderClick(order._id)}
                    className={`p-4 cursor-pointer transition-all border-l-4 ${activeOrder === order._id ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-transparent hover:bg-white dark:hover:bg-zinc-900'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground group-hover:text-primary">#{order._id.slice(-8).toUpperCase()}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{order.status}</span>
                    </div>
                    <p className="text-xs font-bold truncate">{order.deliveryAddress.addressText}</p>
                    <div className="flex items-center justify-between mt-1">
                       <p className="text-[10px] text-muted-foreground">ETB {order.priceInfo.amount.toLocaleString()}</p>
                       <button onClick={(e) => { e.stopPropagation(); setIsFocusedView(true); handleOrderClick(order._id); }} className="text-[9px] font-black text-blue-600 uppercase tracking-tighter hover:underline">Track Full-Screen</button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={cn("lg:h-full border-border/40 shadow-sm overflow-hidden relative flex flex-col", isFocusedView ? "lg:col-span-12" : "lg:col-span-8")}>
          {activeOrderObj && (
             <div className="w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 p-4 shadow-sm z-10 shrink-0">
               <div className="max-w-3xl mx-auto flex items-center justify-between relative">
                 <div className="absolute left-[5%] right-[5%] top-4 -translate-y-1/2 h-1 bg-slate-200 dark:bg-zinc-800 rounded-full z-0" />
                 <div 
                   className="absolute left-[5%] top-4 -translate-y-1/2 h-1 bg-blue-500 rounded-full z-0 transition-all duration-700 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                   style={{ width: `${Math.max(0, ['PENDING', 'ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DELIVERY', 'DELIVERED'].indexOf(activeOrderObj.status) / 6 * 90)}%` }}
                 />
                 {['PENDING', 'ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DELIVERY', 'DELIVERED'].map((stage, index, arr) => {
                   const currentIndex = arr.indexOf(activeOrderObj.status);
                   const isCompleted = index < currentIndex;
                   const isActive = index === currentIndex;
                   
                   const displayNames: Record<string, string> = {
                     ARRIVED_PICKUP: 'Arrived @ Pickup',
                     ARRIVED_DELIVERY: 'Arrived @ Dropoff',
                     PICKED_UP: 'Collected',
                     IN_TRANSIT: 'In Transit'
                   };
 
                   return (
                     <div key={stage} className="flex flex-col items-center gap-2 z-10 w-16">
                       <div className={`w-7 h-7 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-sm transition-colors ${isActive ? 'bg-blue-600 text-white ring-4 ring-blue-600/20' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-400'}`}>
                         {isCompleted ? '✓' : isActive ? '●' : '○'}
                       </div>
                       <span className={`text-[7px] font-black uppercase tracking-tight text-center leading-none ${isActive ? 'text-blue-700 dark:text-blue-400' : isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                         {displayNames[stage] || stage.replace('_', ' ')}
                       </span>
                     </div>
                   )
                 })}
               </div>
             </div>
          )}
          <CardContent className="p-0 h-full w-full bg-slate-50 flex-1">
            <LogisticsMap activeOrder={activeOrderObj} riderLocation={riderLocation} fleet={fleet} telemetry={telemetry} />
            {isFocusedView && (
               <button 
                 onClick={() => setIsFocusedView(false)}
                 className="absolute top-24 left-4 z-1000 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white px-4 py-2 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-zinc-800/80 active:scale-95 transition-all"
               >
                 <Navigation className="w-3.5 h-3.5 -rotate-90" /> Return to Hub
               </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
