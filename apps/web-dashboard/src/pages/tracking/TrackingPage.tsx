import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Map as MapIcon, Loader2, Wifi, WifiOff, Search, Navigation } from 'lucide-react';
import LogisticsMap from '@/components/dashboard/LogisticsMap';
import { useSocket } from '@/hooks/useSocket';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { toast } from 'sonner';

export default function TrackingPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { socket, status } = useSocket();
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!socket || !orderId) return;

    // Join the specific order room
    socket.emit('join_order', orderId);

    socket.on('rider_moved', (data: { orderId: string; lat: number; lng: number }) => {
      if (data.orderId === orderId) {
        setRiderLocation([data.lng, data.lat]);
      }
    });

    return () => {
      socket.off('rider_moved');
    };
  }, [socket, orderId]);

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Live Fleet Tracking</h2>
          <p className="text-muted-foreground">
            {orderId
              ? `Monitoring Order #${orderId.slice(-6).toUpperCase()}`
              : 'Monitor your active deliveries across Addis Ababa'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 font-bold gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all hidden md:flex"
            onClick={() => {
              // We'd ideally fetch the token here. For now we'll notify.
              toast.info('Feature Hint', {
                description:
                  'To share a public link, use the "Copy Link" button in the Order History page.',
              });
            }}
          >
            <Navigation className="h-4 w-4" /> Share Live Link
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-zinc-900 rounded-full border border-border shadow-inner">
            <div
              className={`h-2 w-2 rounded-full ${
                status === 'connected'
                  ? 'bg-green-500 animate-pulse'
                  : status === 'connecting'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              {status === 'connected' ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {status}
            </span>
          </div>
        </div>
      </div>

      <Card className="flex-1 border-border/40 shadow-sm overflow-hidden relative">
        {!orderId && (
          <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-bold">No Active Tracking Selected</h3>
              <p className="text-muted-foreground">
                Select an order from the dashboard or history to view its real-time location on the
                map.
              </p>
            </div>
          </div>
        )}
        <CardContent className="p-0 h-full w-full bg-slate-50">
          <LogisticsMap riderLocation={riderLocation} />
        </CardContent>
      </Card>
    </div>
  );
}
