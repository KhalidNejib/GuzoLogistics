/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  TrendingUp,
  Clock,
  ShieldCheck,
  Wifi,
  WifiOff,
  Loader2,
  Search,
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
import LogisticsMap from '@/components/dashboard/LogisticsMap';
import CreateOrderForm from '@/components/dashboard/CreateOrderForm';
import { useSocket } from '@/hooks/useSocket';
import { useFetchOrders } from '@/hooks/useFetchOrders';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type OrderStatus = 'IDLE' | 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { socket, status, joinOrder } = useSocket();
  const { orders, refetch, isLoading } = useFetchOrders();

  const [activeOrder, setActiveOrder] = useState<string | null>(() =>
    localStorage.getItem('activeOrderId')
  );
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    () => (localStorage.getItem('activeOrderStatus') as OrderStatus) || 'IDLE'
  );
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (activeOrder) {
      localStorage.setItem('activeOrderId', activeOrder);
      localStorage.setItem('activeOrderStatus', orderStatus);
    } else {
      localStorage.removeItem('activeOrderId');
      localStorage.removeItem('activeOrderStatus');
    }
  }, [activeOrder, orderStatus]);

  useEffect(() => {
    if (orders?.length > 0) {
      const active = orders.find((o: any) =>
        ['PENDING', 'ACCEPTED', 'PICKED_UP'].includes(o.status)
      );
      if (active) {
        setActiveOrder(active._id);
        setOrderStatus(active.status);
        joinOrder(active._id);
      }
    }
  }, [orders, joinOrder]);

  useEffect(() => {
    if (!socket) return;
    socket.on('rider_moved', (data: { orderId: string; lat: number; lng: number }) => {
      if (data.orderId === activeOrder) {
        setRiderLocation([data.lng, data.lat]);
        if (orderStatus === 'PENDING') setOrderStatus('ACCEPTED');
      }
    });
    socket.on('order_status_changed', (data: { orderId: string; status: OrderStatus }) => {
      if (data.orderId === activeOrder) setOrderStatus(data.status);
    });
    return () => {
      socket.off('rider_moved');
      socket.off('order_status_changed');
    };
  }, [socket, activeOrder, orderStatus]);

  const getStatusConfig = () => {
    if (orderStatus === 'PENDING')
      return {
        label: 'Finding Rider',
        color: 'bg-blue-500',
        icon: <Search className="w-3 h-3 animate-pulse" />,
      };
    if (orderStatus === 'ACCEPTED')
      return {
        label: 'Rider En Route',
        color: 'bg-emerald-500',
        icon: <Wifi className="w-3 h-3 animate-pulse" />,
      };
    switch (status) {
      case 'connected':
        return { label: 'Live', color: 'bg-green-500', icon: <Wifi className="w-3 h-3" /> };
      case 'connecting':
        return {
          label: 'Connecting',
          color: 'bg-yellow-500',
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
        };
      case 'error':
        return { label: 'Offline', color: 'bg-red-500', icon: <WifiOff className="w-3 h-3" /> };
      default:
        return {
          label: 'Disconnected',
          color: 'bg-slate-500',
          icon: <WifiOff className="w-3 h-3" />,
        };
    }
  };

  // Prepare chart data (last 7 days)
  const chartData = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    const count =
      orders?.filter((o) => new Date(o.createdAt).toDateString() === d.toDateString()).length || 0;
    return { name: dateStr, orders: count };
  });

  const stats = [
    {
      title: 'Total Orders',
      value: orders?.length.toLocaleString() || '0',
      icon: Package,
      trend: 'Lifetime',
      color: 'from-blue-500/10 to-blue-500/5',
      text: 'text-blue-600',
    },
    {
      title: 'Active Deliveries',
      value:
        orders
          ?.filter((o: any) => !['DELIVERED', 'CANCELLED'].includes(o.status))
          .length.toString() || '0',
      icon: Clock,
      trend: 'Real-time',
      color: 'from-amber-500/10 to-amber-500/5',
      text: 'text-amber-600',
    },
    {
      title: 'Completed Today',
      value:
        orders
          ?.filter(
            (o: any) =>
              o.status === 'DELIVERED' &&
              new Date(o.updatedAt || o.createdAt).toDateString() === new Date().toDateString()
          )
          .length.toString() || '0',
      icon: ShieldCheck,
      trend: 'Today',
      color: 'from-emerald-500/10 to-emerald-500/5',
      text: 'text-emerald-600',
    },
    {
      title: 'Revenue',
      value: `ETB ${orders?.reduce((sum: number, o: any) => sum + (o.priceInfo?.amount || 0), 0).toLocaleString() || '0'}`,
      icon: TrendingUp,
      trend: 'Total',
      color: 'from-violet-500/10 to-violet-500/5',
      text: 'text-violet-600',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Merchant Dashboard
          </h2>
          <p className="text-muted-foreground text-sm">
            Real-time delivery management and analytics.
          </p>
        </div>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button className="font-bold shadow-xl shadow-primary/20 h-12 px-6 transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Package className="mr-2 h-5 w-5" /> Dispatch New Order
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-[600px] overflow-y-auto">
            <SheetHeader className="pb-6">
              <SheetTitle className="text-2xl font-bold">Create New Delivery</SheetTitle>
              <SheetDescription>
                Fill in the details below to dispatch a new delivery order.
              </SheetDescription>
            </SheetHeader>
            <CreateOrderForm
              onSuccess={() => {
                setIsSheetOpen(false);
                refetch();
              }}
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? [...Array(4)].map((_, i) => (
              <Card key={i} className="border-border/40 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => (
              <Card
                key={stat.title}
                className="border-border/40 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity`}
                />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.text}`} />
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                  <p className="text-[10px] font-bold text-muted-foreground mt-1 flex items-center gap-1">
                    <span className={stat.text}>{stat.trend}</span> status
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 border-border/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Delivery Volume
            </CardTitle>
            <p className="text-xs text-muted-foreground">Order trends over the last 7 days</p>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Live Status Sidebar */}
        <Card className="border-border/40 shadow-sm bg-slate-50/50 dark:bg-zinc-900/50 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-0 overflow-hidden">
            <div className="divide-y divide-border/40">
              {isLoading
                ? [...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))
                : orders?.slice(0, 6).map((order: any) => (
                    <div
                      key={order._id}
                      className="p-4 hover:bg-white dark:hover:bg-zinc-800 transition-colors group"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground group-hover:text-primary transition-colors">
                          #{order._id.slice(-8).toUpperCase()}
                        </span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            order.status === 'DELIVERED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold truncate pr-4">
                        {order.deliveryAddress.addressText}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        ETB {order.priceInfo.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Section */}
      <Card className="border-border/40 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
          <div>
            <CardTitle className="text-lg font-bold">Fleet Overview</CardTitle>
            <p className="text-xs text-muted-foreground">
              Real-time status of all active deliveries
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border border-border shadow-inner">
            <div
              className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[400px]">
          <LogisticsMap />
        </CardContent>
      </Card>
    </div>
  );
}
