import React from 'react';
import { 
  ShieldCheck, 
  Wallet 
} from 'lucide-react';

interface SettlementTerminalProps {
  rider: any;
  loading: boolean;
  onSettle: () => void;
  onClose: () => void;
}

export function SettlementTerminal({ rider, loading, onSettle, onClose }: SettlementTerminalProps) {
  if (!rider) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
       <div 
         className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
         onClick={onClose}
         role="button"
         tabIndex={0}
         aria-label="Close settlement dialog"
         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
       />
       <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-[40px] shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white relative">
             <div className="absolute top-0 right-0 p-8 opacity-20">
                <Wallet className="w-24 h-24 rotate-12" />
             </div>
             <div className="relative flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xl border border-white/10">
                   <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Settlement Terminal</p>
                    <h2 className="text-2xl font-black">{rider.fullName}</h2>
                </div>
             </div>
          </div>

          <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Physical Cash Held</p>
                     <p className="text-2xl font-black text-amber-600">ETB {rider.cashHeld.toLocaleString()}</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/20">
                     <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Digital Credits</p>
                     <p className="text-2xl font-black text-indigo-600">ETB {rider.balance.toLocaleString()}</p>
                  </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30 p-5 rounded-3xl flex items-start gap-4">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                      <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">Audit Verification Required</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium leading-relaxed">
                         By confirming, you verify that you have physically collected <strong>ETB {rider.cashHeld.toLocaleString()}</strong> from the pilot. The pilot's debt registry will be reset to zero.
                      </p>
                  </div>
              </div>

              <div className="flex gap-3 pt-4">
                  <button 
                    onClick={onClose}
                    className="flex-1 bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={onSettle}
                    disabled={loading}
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing Settlement...' : 'Verify & Finalize'}
                  </button>
              </div>
          </div>
       </div>
    </div>
  );
}
