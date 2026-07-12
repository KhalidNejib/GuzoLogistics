import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Wallet,
  ArrowUpRight,
  TrendingUp,
  CircleDollarSign,
  HelpCircle,
  PiggyBank,
  Loader2,
  HandCoins,
  CheckCircle,
  XCircle,
  Eye,
  Smartphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { useMerchantProfile } from '@/hooks/useMerchantProfile';
import { toast } from 'sonner';
import FinanceHistoryTable from './FinanceHistoryTable';
import { useSocket } from '@/hooks/useSocket';

import { getApiUrl } from '@/lib/utils';
const API_URL = getApiUrl();

export default function FinanceSection() {
  const { getToken } = useAuth();
  const { profile, isLoading, refetch } = useMerchantProfile();
  const [requesting, setRequesting] = useState(false);
  const [history, setHistory] = useState<{ transactions: any[], payouts: any[] }>({ transactions: [], payouts: [] });
  const [pendingSettlements, setPendingSettlements] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingSettlements, setLoadingSettlements] = useState(true);
  const { socket } = useSocket();
  const settlementHistoryRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      // Fetch History
      const historyRes = await fetch(`${API_URL}/api/v1/merchant/finance/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data);
      }

      // Fetch Pending Settlements (Repayment IDs)
      const settleRes = await fetch(`${API_URL}/api/v1/merchant/finance/pending-settlements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (settleRes.ok) {
        const data = await settleRes.json();
        setPendingSettlements(data);
      }
    } catch (err) {
      console.error('Failed to fetch finance data', err);
    } finally {
      setLoadingHistory(false);
      setLoadingSettlements(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [getToken, profile?.finance?.balance]);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('new_settlement_request', (data: any) => {
      toast.info(`New settlement request: ETB ${data.amount} from ${data.riderName}`, {
        description: `Ref: ${data.referenceId}`,
        duration: 10000,
        action: {
          label: 'View',
          onClick: () => {
            fetchData();
            // Scroll to settlement history section smoothly
            setTimeout(() => {
              settlementHistoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
          }
        }
      });

      // 🔌 Real-time state injection: Don't wait for refresh!
      setPendingSettlements(prev => {
        // Prevent duplicates
        if (prev.some(s => s._id === data.id)) return prev;
        
        const newRequest = {
          _id: data.id,
          amount: data.amount,
          referenceId: data.referenceId,
          proofImageUrl: data.proofImageUrl,
          createdAt: new Date().toISOString(),
          user: { fullName: data.riderName } // Map socket field to DB field structure
        };
        return [newRequest, ...prev];
      });
    });

    return () => {
      socket.off('new_settlement_request');
    };
  }, [socket]);

  const handleVerifySettlement = async (id: string, status: 'COMPLETED' | 'FAILED') => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/finance/verify-settlement/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        toast.success(status === 'COMPLETED' ? 'Settlement confirmed!' : 'Settlement rejected.');
        fetchData();
        refetch();
      } else {
        toast.error('Verification failed.');
      }
    } catch {
      toast.error('Network error.');
    }
  };

  const finance = {
    totalRevenue: profile?.finance?.totalRevenue || 0,
    balance: profile?.finance?.balance || 0,
    codBalance: profile?.finance?.codBalance || 0,
  };

  const handlePayout = async () => {
    if (finance.balance < 100) {
      toast.error('Minimum payout amount is ETB 100');
      return;
    }
    if (!window.confirm(`Request a payout of ETB ${finance.balance.toLocaleString()}?`)) return;
    try {
      setRequesting(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/finance/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: finance.balance })
      });

      if (res.ok) {
        toast.success('Payout request sent!');
        refetch();
      }
    } catch {
      toast.error('Network error requesting payout');
    } finally {
      setRequesting(false);
    }
  };

  const cards = [
    {
      title: 'Settled Wallet',
      value: `ETB ${finance.balance.toLocaleString()}`,
      sub: 'Available for Payout',
      icon: Wallet,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      action: { label: 'Withdraw', onClick: handlePayout, loading: requesting, icon: HandCoins }
    },
    {
      title: 'Current Debt (with Fleet)',
      value: `ETB ${finance.codBalance.toLocaleString()}`,
      sub: 'Held by pilots',
      icon: CircleDollarSign,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Gross Revenue',
      value: `ETB ${finance.totalRevenue.toLocaleString()}`,
      sub: 'Total Sales Volume',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading
          ? [...Array(3)].map((_, i) => (
            <Card key={i} className="border-border/40  shadow-sm"><CardContent className="pt-6"><Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-8 w-32" /></CardContent></Card>
          ))
          : cards.map((card) => (
            <Card key={card.title} className="group border-border/40 shadow-sm hover:shadow-md transition-all overflow-hidden relative rounded-3xl">
              <CardContent className="pt-6 pb-5 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${card.bg}`}><card.icon className={`w-6 h-6 ${card.color}`} /></div>
                  {card.action && (
                    <button
                      onClick={card.action.onClick}
                      disabled={card.action.loading || finance.balance <= 0}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {card.action.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <card.action.icon className="w-4 h-4" />}
                      {card.action.label}
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.title}</p>
                  <h3 className={`text-2xl font-black tracking-tight ${card.color}`}>{card.value}</h3>
                  <p className="text-xs font-bold text-slate-500">{card.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PENDING SETTLEMENTS LIST */}
        <Card className="lg:col-span-1 border-border/40 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border/40">
             <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-tighter">
                <Smartphone className="w-4 h-4 text-blue-500" />
                Pending Verification
             </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSettlements ? (
               <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>
            ) : pendingSettlements.length === 0 ? (
               <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                     <CheckCircle className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">All pilots are settled.</p>
               </div>
            ) : (
               <div className="divide-y divide-border/40 max-h-[400px] overflow-y-auto">
                  {pendingSettlements.map((s) => (
                     <div key={s._id} className="p-4 hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                             <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{s.user?.fullName}</p>
                             <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">Pilot Settlement</p>
                           </div>
                           <div className="text-right">
                             <p className="text-sm font-black text-emerald-600">ETB {s.amount.toLocaleString()}</p>
                             <p className="text-[10px] font-bold text-slate-400">{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                           </div>
                        </div>

                        {/* Ref ID */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/20 p-2 rounded-xl border border-blue-100/50 mb-3">
                           <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 leading-none">Telebirr Ref ID</p>
                           <p className="text-xs font-black text-blue-700 dark:text-blue-300 select-all">{s.referenceId}</p>
                        </div>

                        {/* Proof Screenshot */}
                        {s.proofImageUrl && (
                          <div className="mb-3 relative group/proof overflow-hidden rounded-xl border-2 border-emerald-200 dark:border-emerald-800">
                            <img
                              src={s.proofImageUrl}
                              alt="Telebirr payment proof"
                              className="w-full h-28 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover/proof:bg-black/20 transition-all flex items-center justify-center">
                              <a
                                href={s.proofImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="opacity-0 group-hover/proof:opacity-100 bg-black/70 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                Full Screenshot
                              </a>
                            </div>
                            <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">✓ Proof Attached</div>
                          </div>
                        )}

                        {!s.proofImageUrl && (
                          <div className="mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 p-2 rounded-xl">
                            <p className="text-[9px] font-bold text-amber-500">⚠ No proof screenshot attached</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                           <button 
                             onClick={() => handleVerifySettlement(s._id, 'COMPLETED')}
                             className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/10"
                           >
                              <CheckCircle className="w-3 h-3" /> Approve
                           </button>
                           <button 
                             onClick={() => handleVerifySettlement(s._id, 'FAILED')}
                             className="flex-1 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all"
                           >
                             <XCircle className="w-3 h-3" /> Reject
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            )}
            <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 border-t border-border/40">
               <p className="text-[9px] font-bold text-slate-400 leading-tight">
                  <HelpCircle className="w-3 h-3 inline mr-1" />
                  Verify the Telebirr ID in your app before clicking approve.
               </p>
            </div>
          </CardContent>
        </Card>

        {/* FINANCE HISTORY TABLE */}
        <div className="lg:col-span-2" ref={settlementHistoryRef}>
          {loadingHistory ? (
            <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-950 rounded-3xl border border-border/40 min-h-[300px]">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <FinanceHistoryTable transactions={history.transactions} payouts={history.payouts} />
          )}
        </div>
      </div>
    </div>
  );
}
