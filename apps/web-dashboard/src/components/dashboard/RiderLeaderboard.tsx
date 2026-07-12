import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { getApiUrl } from '@/lib/utils';
import { Trophy, Medal, Zap, Star } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';

interface LeaderboardEntry {
  riderId: string;
  fullName: string;
  totalDeliveries: number;
  totalRevenue: number;
  avgTimeMinutes: number;
}

export default function RiderLeaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchLeaderboard = useCallback(async () => {
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${getApiUrl()}/api/v1/merchant/rider-leaderboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const stats = await res.json();
        setData(stats);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // ── ⚡ LIVE UPDATE ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    
    // Refresh ranking on mission completion
    socket.on('order_status_changed', fetchLeaderboard);
    socket.on('order_created', fetchLeaderboard);

    return () => {
      socket.off('order_status_changed', fetchLeaderboard);
      socket.off('order_created', fetchLeaderboard);
    };
  }, [socket, fetchLeaderboard]);

  if (loading) return (
    <Card className="border-border/40 shadow-sm animate-pulse">
      <CardHeader><div className="h-6 w-32 bg-slate-200 rounded" /></CardHeader>
      <CardContent><div className="h-40 bg-slate-100 rounded" /></CardContent>
    </Card>
  );

  return (
    <Card className="border-border/40 shadow-sm overflow-hidden bg-white dark:bg-zinc-950">
      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/40">
        <CardTitle className="text-lg font-black flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Elite Riders
        </CardTitle>
        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-2 py-1 bg-slate-100 rounded">Top Performance</span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/40">
          {data.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground">
                <Medal className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-tight">No delivery data yet</p>
             </div>
          ) : data.map((rider, index) => (
            <div key={rider.riderId} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                  index === 0 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-500/20' :
                  index === 1 ? 'bg-slate-100 text-slate-600 ring-2 ring-slate-400/20' :
                  index === 2 ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-400/20' :
                  'bg-slate-50 text-slate-400'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white capitalize">{rider.fullName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 fill-emerald-600" /> {rider.totalDeliveries} Done
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {rider.avgTimeMinutes}m avg
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-900">ETB {rider.totalRevenue.toLocaleString()}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Earnings</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
