/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Truck, MapPin, ShieldCheck, Clock, Navigation } from 'lucide-react';
import LogisticsMap from '@/components/dashboard/LogisticsMap';
import { useSocket } from '@/hooks/useSocket';
import { Card, CardContent, Badge, Skeleton, Separator } from '@/components/ui';

export default function PublicTrackingPage() {
  const { token } = useParams();
  const { socket, status } = useSocket();
  const [order, setOrder] = useState<any>(null);
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/orders/track/${token}`);
        if (!response.ok) throw new Error('Tracking link invalid or expired.');
        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchOrder();
  }, [token]);

  useEffect(() => {
    if (!socket || !order) return;

    socket.emit('join_order', order._id);

    socket.on('rider_moved', (data: { orderId: string; lat: number; lng: number }) => {
      if (data.orderId === order._id) {
        setRiderLocation([data.lng, data.lat]);
      }
    });

    return () => {
      socket.off('rider_moved');
    };
  }, [socket, order]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="p-12 text-center space-y-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-bold text-lg">Initializing Live Tracking...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg border-destructive/20 shadow-xl">
          <CardContent className="p-12 text-center space-y-6">
            <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
              <ShieldCheck size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Access Denied</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-border/40 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl">
              <Truck className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight">Ethio Logistics</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">
                Live Tracking
              </p>
            </div>
          </div>
          <Badge
            className={`${
              status === 'connected'
                ? 'bg-emerald-500 shadow-emerald-500/20'
                : 'bg-red-500 shadow-red-500/20'
            } shadow-lg text-white font-black uppercase text-[10px] px-3 py-1 rounded-full animate-in fade-in zoom-in`}
          >
            {status === 'connected' ? '● System Live' : '○ Offline'}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 gap-4 overflow-hidden">
        {/* Sidebar Info */}
        <div className="w-full md:w-[400px] flex flex-col gap-4">
          <Card className="border-border/40 shadow-xl overflow-hidden rounded-3xl">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-white">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-primary-foreground/70 text-[10px] font-bold uppercase tracking-widest">
                      Order Reference
                    </p>
                    <h2 className="text-2xl font-black">#{order._id.slice(-8).toUpperCase()}</h2>
                  </div>
                  <Badge className="bg-white/20 text-white border-none backdrop-blur-md uppercase text-[10px] font-bold">
                    {order.status}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/10 mt-1">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white/60 uppercase">
                        Estimated Arrival
                      </p>
                      <p className="font-bold">25 - 35 Minutes</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Route */}
                <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 before:dashed">
                  <div className="relative">
                    <div className="absolute -left-[22px] top-1 w-4 h-4 rounded-full bg-emerald-500 ring-8 ring-emerald-500/10 border-2 border-white" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Pickup Location
                    </p>
                    <p className="text-sm font-bold mt-0.5">{order.pickupAddress.addressText}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[22px] top-1 w-4 h-4 rounded-full bg-red-500 ring-8 ring-red-500/10 border-2 border-white" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Your Address
                    </p>
                    <p className="text-sm font-bold mt-0.5">{order.deliveryAddress.addressText}</p>
                  </div>
                </div>

                <Separator />

                {/* Rider Info */}
                {order.rider ? (
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-border/40">
                    <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center border border-border shadow-sm text-xl font-bold">
                      {order.rider.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                        Your Rider
                      </p>
                      <p className="font-bold text-foreground">{order.rider.fullName}</p>
                      <p className="text-[10px] text-primary font-black uppercase mt-0.5">
                        ⭐ 4.9 Rating
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                    <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 animate-pulse">
                      <Navigation size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-amber-800">Assigning Rider...</p>
                      <p className="text-[10px] text-amber-600 font-medium">
                        Finding the best route for you
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Map */}
        <div className="flex-1 min-h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-border/40 relative">
          <LogisticsMap riderLocation={riderLocation} />

          {/* Map Overlay Badge */}
          <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 shadow-xl flex items-center gap-3">
            <div className="h-3 w-3 bg-primary rounded-full animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              GPS Signal: High Accuracy
            </span>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-muted-foreground text-[11px] font-medium tracking-tight">
        Powered by Ethio Logistics v1.0 • Secure Real-time Tracking
      </footer>
    </div>
  );
}
