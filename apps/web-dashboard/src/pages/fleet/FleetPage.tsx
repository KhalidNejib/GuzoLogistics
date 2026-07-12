import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Package,
  Clock,
  Truck,
  ShieldCheck,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  Phone,
} from 'lucide-react';
import { useMerchantProfile } from '@/hooks/useMerchantProfile';
import { Badge } from '@/components/ui/badge';

// Components & Hooks
import { useFleetManagement, RiderStat } from './useFleetManagement';
import { RiderDossier } from './components/RiderDossier';
import { SettlementTerminal } from './components/SettlementTerminal';

const API_URL = `http://${window.location.hostname}:5000`;

export default function FleetPage() {
  const { getToken } = useAuth();
  const { profile: merchantProfile } = useMerchantProfile();
  const { 
    riders, 
    pendingPilots, 
    loading, 
    message, 
    setMessage, 
    approvePilot, 
    settleCash, 
    updateRiderName,
    togglePilotActive,
    deletePilot
  } = useFleetManagement();

  const [showPending, setShowPending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [settleRider, setSettleRider] = useState<RiderStat | null>(null);
  const [settleLoading, setSettleLoading] = useState(false);
  const [dossierRider, setDossierRider] = useState<any | null>(null);
  const [showDossier, setShowDossier] = useState(false);

  const filteredRiders = riders.filter(r =>
    r.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.riderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGenerateKey = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          businessName: merchantProfile?.businessName || 'Elite Merchant',
          onboardingCompleted: true
        })
      });

      if (res.ok) {
        setMessage({ text: 'Fleet Key Generated Successfully!', type: 'success' });
        window.location.reload();
      }
    } catch (err) {}
  };

  const handleEditConfirm = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    const success = await updateRiderName(id, editName);
    if (success) {
      setEditingId(null);
    }
  };

  return (
    <div className="mx-auto py-4 md:py-8 animate-fade-in space-y-4 md:space-y-6">
      {/* Header section with Stats Overview */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-950 p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Truck className="w-7 h-7 md:w-8 md:h-8 text-blue-600" />
            Fleet Command
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm font-medium text-slate-500">Managing verified pilots • Invite Key:</p>
            {merchantProfile?.fleetKey === 'RE-ONBOARD' || (!merchantProfile?.fleetKey && riders.length === 0) ? (
              <button
                onClick={handleGenerateKey}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                Generate Fleet Key
              </button>
            ) : (
              <span
                onClick={() => {
                  const key = merchantProfile?.fleetKey || (riders.length > 0 ? (riders[0] as any).fleetKey : '');
                  if (key && key !== 'RE-ONBOARD') {
                    navigator.clipboard.writeText(key);
                    alert('Fleet Key Copied!');
                  }
                }}
                className="cursor-pointer hover:bg-blue-100 transition-colors text-blue-600 font-black tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-800"
              >
                {merchantProfile?.fleetKey || (riders.length > 0 ? (riders[0] as any).fleetKey : 'GENERATING...')}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {pendingPilots.length > 0 && (
            <button
              onClick={() => setShowPending(!showPending)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border transition-all ${showPending ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-zinc-900 text-amber-600 border-amber-200 animate-pulse'
                }`}
            >
              <ShieldCheck className="w-4 h-4" />
              {pendingPilots.length} Pending Approval
            </button>
          )}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search pilots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      {/* Main Grid: Pending (if shown) & Verified Riders */}
      <div className="grid grid-cols-1 gap-6">
        {showPending && (
          <div className="space-y-4">
            <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2 px-2">
              <ShieldCheck className="w-4 h-4" /> New Applications Awaiting Review
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {pendingPilots.map((pilot) => (
                <div key={pilot.user._id} className="bg-white dark:bg-zinc-950 p-6 rounded-[32px] border-2 border-amber-100 dark:border-amber-900/30 shadow-xl shadow-amber-500/5 relative overflow-hidden group">
                  <div className="flex gap-4 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 overflow-hidden shrink-0 border-2 border-white dark:border-zinc-900 shadow-md">
                      {pilot.profilePhotoUrl ? (
                         <img src={pilot.profilePhotoUrl} className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full flex items-center justify-center text-amber-600 text-xl font-black">{(pilot.user?.fullName || 'P').charAt(0)}</div>}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white leading-tight">{pilot.user?.fullName || 'Anonymous Pilot'}</h3>
                      {/* Phone number — prominent for merchant review */}
                      <a
                        href={`tel:${pilot.user?.phoneNumber}`}
                        className="flex items-center gap-1.5 mt-1 group/phone"
                      >
                        <Phone className="w-3 h-3 text-emerald-500" />
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 group-hover/phone:underline">
                          {pilot.user?.phoneNumber || 'No Phone on File'}
                        </span>
                      </a>
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-none text-[8px] font-black uppercase tracking-widest">{pilot.vehicleType || 'Motorcycle'}</Badge>
                        {pilot.licensePlate && (
                          <Badge className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-none text-[8px] font-black uppercase tracking-widest">{pilot.licensePlate}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={() => { 
                        const dossierData = { 
                          ...pilot, 
                          fullName: pilot.user?.fullName || 'Unknown', 
                          profilePhotoUrl: pilot.profilePhotoUrl, 
                          phoneNumber: pilot.user?.phoneNumber, 
                          riderId: pilot.user?._id || pilot._id 
                        };
                        setDossierRider(dossierData); 
                        setShowDossier(true); 
                      }}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      View Dossier
                    </button>
                    <button
                      onClick={() => approvePilot(pilot.user._id, 'APPROVED')}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
            <Package className="w-4 h-4" /> Active Fleet Deployment
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-50 dark:bg-zinc-900 rounded-[32px] animate-pulse" />)}
            </div>
          ) : filteredRiders.length === 0 ? (
            <div className="bg-white dark:bg-zinc-950 p-12 rounded-[40px] border border-dashed border-slate-200 dark:border-zinc-800 text-center animate-pulse">
              <Truck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">No pilots found in registry.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredRiders.map((rider) => (
                <div key={rider.riderId} className="bg-white dark:bg-zinc-950 p-6 rounded-[32px] border border-slate-100 dark:border-zinc-900 shadow-sm hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900/30 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 overflow-hidden ring-4 ring-white dark:ring-zinc-900 shadow-sm">
                        {rider.profilePhotoUrl ? (
                           <img src={rider.profilePhotoUrl} className="w-full h-full object-cover" />
                        ) : <div className="w-full h-full flex items-center justify-center text-blue-600 text-xl font-black">{rider.fullName?.charAt(0)}</div>}
                      </div>
                      <div className="min-w-0">
                        {editingId === rider.riderId ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => handleEditConfirm(rider.riderId)}
                              onKeyDown={(e) => e.key === 'Enter' && handleEditConfirm(rider.riderId)}
                              className="w-32 bg-slate-100 dark:bg-zinc-900 border-none rounded px-2 py-0.5 text-sm font-black outline-none ring-2 ring-blue-500"
                            />
                          </div>
                        ) : (
                          <h3 className="font-black text-slate-900 dark:text-white truncate flex items-center gap-1.5 group/name">
                            {rider.fullName}
                            <Edit2
                              onClick={() => { setEditingId(rider.riderId); setEditName(rider.fullName); }}
                              className="w-3 h-3 text-slate-300 opacity-0 group-hover/name:opacity-100 cursor-pointer"
                            />
                            {rider.disabled && (
                              <Badge className="bg-red-500 hover:bg-red-600 text-white text-[8px] font-black uppercase tracking-widest border-none ml-1">Deactivated</Badge>
                            )}
                          </h3>
                        )}
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-tighter">ID: {rider.riderId.slice(-8).toUpperCase()}</p>
                      </div>
                    </div>
                    {rider.cashHeld > 0 && (
                      <button
                        onClick={() => setSettleRider(rider)}
                        className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 p-2 rounded-xl text-amber-600 transition-colors"
                      >
                        <ShieldCheck className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Package className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Missions</span>
                      </div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{rider.totalDeliveries}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/20">
                      <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Avg Time</span>
                      </div>
                      <p className="text-sm font-black text-blue-700 dark:text-blue-400">
                        {rider.avgDeliveryTimeMs ? `${Math.round(rider.avgDeliveryTimeMs / 60000)}m` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 dark:border-zinc-900 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Commission Pot</span>
                      <p className="text-sm font-black text-emerald-600">ETB {rider.totalRevenue.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => { setDossierRider(rider); setShowDossier(true); }}
                      className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Dossier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showDossier && (
        <RiderDossier 
          rider={dossierRider} 
          onClose={() => { setShowDossier(false); setDossierRider(null); }} 
          onToggleActive={async (id) => {
            const success = await togglePilotActive(id);
            if (success) {
              setDossierRider((prev: any) => prev ? { ...prev, disabled: !prev.disabled } : null);
            }
          }}
          onDelete={async (id) => {
            if (window.confirm("Are you sure you want to permanently remove this pilot from the fleet? User connection credentials will be revoked immediately.")) {
              const success = await deletePilot(id);
              if (success) {
                setShowDossier(false);
                setDossierRider(null);
              }
            }
          }}
        />
      )}

      <SettlementTerminal 
        rider={settleRider}
        loading={settleLoading}
        onSettle={async () => {
            if (!settleRider) return;
            setSettleLoading(true);
            const success = await settleCash(settleRider.riderId);
            if (success) {
                setMessage({ text: 'Settlement Finalized.', type: 'success' });
                setSettleRider(null);
            }
            setSettleLoading(false);
        }}
        onClose={() => setSettleRider(null)}
      />
    </div>
  );
}
