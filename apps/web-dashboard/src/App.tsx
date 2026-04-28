import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  TrendingUp,
  Package,
  Clock,
  ShieldCheck,
  Wifi,
  WifiOff,
  Loader2,
  Search,
} from 'lucide-react';
import LogisticsMap from '@/components/dashboard/LogisticsMap';
import CreateOrderForm from '@/components/dashboard/CreateOrderForm';
import { useSocket } from '@/hooks/useSocket';
import { useFetchOrders } from '@/hooks/useFetchOrders';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui';

// Import Auth Pages
import SignInPage from '@/pages/auth/SignInPage';
import SignUpPage from '@/pages/auth/SignUpPage';

type OrderStatus = 'IDLE' | 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED';

function Dashboard() {
  const { socket, status, joinOrder } = useSocket();
  const { orders, refetch, isLoading: isOrdersLoading } = useFetchOrders();

  // Persistent state using localStorage
  const [activeOrder, setActiveOrder] = useState<string | null>(() => {
    return localStorage.getItem('activeOrderId');
  });
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(() => {
    return (localStorage.getItem('activeOrderStatus') as OrderStatus) || 'IDLE';
  });
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    if (activeOrder) {
      localStorage.setItem('activeOrderId', activeOrder);
      localStorage.setItem('activeOrderStatus', orderStatus);
    } else {
      localStorage.removeItem('activeOrderId');
      localStorage.removeItem('activeOrderStatus');
    }
  }, [activeOrder, orderStatus]);

  // Load active order from backend on refresh (as a source of truth)
  useEffect(() => {
    if (orders && orders.length > 0) {
      // Find the most recent active order
      const active = orders.find((o) => ['PENDING', 'ACCEPTED', 'PICKED_UP'].includes(o.status));
      if (active) {
        setActiveOrder(active._id);
        setOrderStatus(active.status);
        joinOrder(active._id);
      } else if (orderStatus !== 'IDLE' && !activeOrder) {
        // If we thought we had an active order but the server says no, clear it
        // (Only if we aren't currently waiting for a fresh creation)
        // setActiveOrder(null);
        // setOrderStatus('IDLE');
      }
    }
  }, [orders, joinOrder]); // Removed activeOrder from deps to avoid clearing it during refresh loop

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on('rider_moved', (data: { orderId: string; lat: number; lng: number }) => {
      if (data.orderId === activeOrder) {
        setRiderLocation([data.lng, data.lat]);
        // If we are getting movement, it's safe to assume the rider is at least on the way
        if (orderStatus === 'PENDING') setOrderStatus('ACCEPTED');
      }
    });

    // Listen for status changes (We'll add this to backend soon)
    socket.on('order_status_changed', (data: { orderId: string; status: OrderStatus }) => {
      if (data.orderId === activeOrder) {
        setOrderStatus(data.status);
      }
    });

    return () => {
      socket.off('rider_moved');
      socket.off('order_status_changed');
    };
  }, [socket, activeOrder, orderStatus]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const getStatusConfig = () => {
    // If we have an active order, show its status instead of just "Live"
    if (orderStatus === 'PENDING') {
      return {
        label: 'Finding Rider',
        color: 'bg-blue-500',
        icon: <Search className="w-3 h-3 animate-pulse" />,
      };
    }
    if (orderStatus === 'ACCEPTED') {
      return {
        label: 'Rider En Route',
        color: 'bg-emerald-500',
        icon: <Wifi className="w-3 h-3 animate-pulse" />,
      };
    }

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

  const statusConfig = getStatusConfig();

  if (isOrdersLoading && !activeOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Syncing your deliveries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Merchant Dashboard</h2>
          <p className="text-muted-foreground">Real-time delivery management and tracking.</p>
        </div>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button className="font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
              <Package className="mr-2 h-4 w-4" /> Dispatch New Order
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
              onSuccess={(id: string) => {
                setActiveOrder(id);
                setOrderStatus('PENDING'); // Set searching state immediately
                joinOrder(id);
                setIsSheetOpen(false); // AUTO-CLOSE MODAL
                refetch(); // Update metrics immediately
              }}
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Total Orders',
            value: orders.length.toLocaleString(),
            icon: Package,
            trend: 'Lifetime',
          },
          {
            title: 'Active Deliveries',
            value: orders
              .filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status))
              .length.toString(),
            icon: Clock,
            trend: 'Real-time',
          },
          {
            title: 'Completed Today',
            value: orders
              .filter(
                (o) =>
                  o.status === 'DELIVERED' &&
                  new Date(o.updatedAt || o.createdAt).toDateString() === new Date().toDateString()
              )
              .length.toString(),
            icon: ShieldCheck,
            trend: 'Today',
          },
          {
            title: 'Revenue',
            value: `ETB ${orders.reduce((sum, o) => sum + (o.priceInfo?.amount || 0), 0).toLocaleString()}`,
            icon: TrendingUp,
            trend: 'Total',
          },
        ].map((stat) => (
          <Card
            key={stat.title}
            className="border-border/40 shadow-sm hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">{stat.trend}</span> status
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Live Fleet Tracking
                {activeOrder && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary animate-pulse">
                    TRACKING ACTIVE
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {activeOrder
                  ? `Order: #${activeOrder.slice(-6).toUpperCase()}`
                  : 'Real-time status of Addis Ababa deliveries'}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-zinc-900 rounded-full border border-border shadow-inner">
              <div
                className={`h-2 w-2 rounded-full ${statusConfig.color} ${statusConfig.label !== 'Disconnected' ? 'animate-pulse' : ''}`}
              />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 border-t border-border/40">
            <div className="h-[500px] w-full relative bg-slate-50">
              <LogisticsMap riderLocation={riderLocation} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Recent Shipments</CardTitle>
            <p className="text-xs text-muted-foreground">Your last 5 delivery requests</p>
          </CardHeader>
          <CardContent className="flex-1 px-0 py-0 overflow-hidden">
            <div className="divide-y divide-border/40">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order._id}
                  onClick={() => {
                    setActiveOrder(order._id);
                    setOrderStatus(order.status);
                    joinOrder(order._id);
                  }}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors ${activeOrder === order._id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-mono font-bold text-foreground">
                      #{order._id.slice(-6).toUpperCase()}
                    </span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        order.status === 'DELIVERED'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">
                    {order.deliveryAddress.addressText}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-bold text-primary">
                      ETB {order.priceInfo.amount}
                    </span>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No orders yet</p>
                </div>
              )}
            </div>
          </CardContent>
          {orders.length > 5 && (
            <div className="p-4 border-t border-border/40 text-center">
              <Button variant="ghost" className="text-xs w-full text-primary font-bold">
                VIEW ALL HISTORY
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />

        {/* PROTECTED DASHBOARD */}
        <Route
          path="/*"
          element={
            <>
              <SignedIn>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </SignedIn>
              <SignedOut>
                <Navigate to="/sign-in" replace />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
