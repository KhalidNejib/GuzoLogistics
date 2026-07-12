import React from 'react';
import { 
  ShieldCheck, 
  Truck, 
  Phone, 
  Package, 
  AlertCircle 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RiderDossierProps {
  rider: any;
  onClose: () => void;
  onToggleActive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function RiderDossier({ rider, onClose, onToggleActive, onDelete }: RiderDossierProps) {
  if (!rider) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white dark:bg-zinc-950 shadow-2xl border-l border-slate-200 dark:border-zinc-800 animate-in slide-in-from-right duration-500 overflow-y-auto">
       <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-6 border-b border-slate-100 dark:border-zinc-900 flex items-center justify-between">
          <div>
             <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Pilot Dossier</h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Registry • Level 4 Access</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
       </div>

       <div className="p-8 space-y-8">
          {/* Header: Portrait + Bio */}
          <div className="flex items-center gap-6">
             <div className="h-32 w-32 rounded-[40px] bg-blue-600 overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-900">
                {rider.profilePhotoUrl ? (
                  <img src={rider.profilePhotoUrl} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full flex items-center justify-center text-white text-4xl font-black">{rider.fullName?.charAt(0)}</div>}
             </div>
             <div className="space-y-2">
                {rider.disabled ? (
                  <Badge className="bg-red-500/20 text-red-500 border-none px-2 rounded-lg font-black text-[9px] uppercase tracking-widest">Deactivated</Badge>
                ) : (
                  <Badge className="bg-emerald-500/20 text-emerald-500 border-none px-2 rounded-lg font-black text-[9px] uppercase tracking-widest">Active Pilot</Badge>
                )}
                <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{rider.fullName}</h3>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                   <Phone className="w-3.5 h-3.5" /> {rider.phoneNumber || 'Unavailable'}
                </p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 dark:bg-zinc-900 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Missions Completed</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{rider.totalDeliveries || 0}</p>
             </div>
             <div className="bg-slate-50 dark:bg-zinc-900 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Revenue</p>
                <p className="text-2xl font-black text-emerald-600">ETB {(rider.totalRevenue || 0).toLocaleString()}</p>
             </div>
          </div>

          {/* Asset Section */}
          <div className="space-y-4">
             <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Truck className="w-3.5 h-3.5" /> Fleet Asset Proof
             </h4>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <p className="text-[10px] font-bold text-slate-500">Registered Vehicle</p>
                   <div className="aspect-video rounded-2xl bg-slate-100 dark:bg-zinc-900 overflow-hidden border border-slate-200 dark:border-zinc-800">
                      {rider.vehiclePhotoUrl ? (
                        <img src={rider.vehiclePhotoUrl} className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold italic">No Photo</div>}
                   </div>
                </div>
                <div className="space-y-2">
                   <p className="text-[10px] font-bold text-slate-500">Technical Specs</p>
                   <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 h-[100px] flex flex-col justify-center">
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{rider.vehicleMake} {rider.vehicleModel}</p>
                      <p className="text-xs font-bold text-slate-500 uppercase mt-1">{rider.licensePlate}</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Compliance Section */}
          <div className="space-y-4">
             <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Compliance Documents (Cloudinary Verified)
             </h4>
             <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                         <ShieldCheck size={16} />
                      </div>
                      <div>
                         <p className="text-xs font-black text-slate-900 dark:text-white">National ID / Fayda</p>
                         <p className="text-[10px] font-bold text-slate-400">Government Registry Copy</p>
                      </div>
                   </div>
                   {rider.faydaIdPhotoUrl ? (
                     <a 
                       href={rider.faydaIdPhotoUrl} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        View Document
                     </a>
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase">Not Uploaded</span>
                    )}
                </div>
                <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                         <Package size={16} />
                      </div>
                      <div>
                         <p className="text-xs font-black text-slate-900 dark:text-white">Driver License</p>
                         <p className="text-[10px] font-bold text-slate-400">Auth Code: {rider.licenseNumber || 'N/A'}</p>
                      </div>
                   </div>
                   {rider.licensePhotoUrl ? (
                     <a 
                       href={rider.licensePhotoUrl} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-[10px] font-black text-emerald-600 uppercase hover:underline"
                      >
                        View Document
                     </a>
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase">Not Uploaded</span>
                    )}
                </div>
             </div>
          </div>

          {/* Emergency Protocol */}
          <div className="bg-zinc-900 p-6 rounded-[32px] text-white overflow-hidden relative">
             <AlertCircle className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 -rotate-12" />
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4">Emergency Protocol</h4>
             <div className="flex gap-4">
                <div className="flex-1">
                   <p className="text-xs font-black text-zinc-500 mb-1">N.O.K. Contact</p>
                   <p className="text-lg font-black text-white">{rider.emergencyContact?.name || 'Not Listed'}</p>
                   <p className="text-xs font-bold text-blue-400 uppercase mt-1">{rider.emergencyContact?.relationship || 'Contact'}</p>
                </div>
                <div className="bg-white/10 h-auto w-[1px]" />
                <div className="flex-1">
                   <p className="text-xs font-black text-zinc-500 mb-1">Emergency Line</p>
                   <p className="text-lg font-black text-white">{rider.emergencyContact?.phone || '...'}</p>
                   <a href={`tel:${rider.emergencyContact?.phone}`} className="inline-block mt-2 px-3 py-1 bg-white text-zinc-900 rounded-lg text-[9px] font-black uppercase tracking-widest">Call Now</a>
                </div>
             </div>
          </div>

          {/* Administrative Actions */}
          {(onToggleActive || onDelete) && (
            <div className="bg-red-50/50 dark:bg-rose-950/10 p-6 rounded-[32px] border border-red-100/50 dark:border-rose-900/20 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" /> Fleet Command Administration
              </h4>
              <div className="flex flex-col sm:flex-row gap-3">
                {onToggleActive && (
                  <button
                    onClick={() => onToggleActive(rider.riderId || rider.user?._id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      rider.disabled 
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                    }`}
                  >
                    {rider.disabled ? 'Reactivate Pilot' : 'Suspend Pilot'}
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(rider.riderId || rider.user?._id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/10"
                  >
                    Remove Rider
                  </button>
                )}
              </div>
            </div>
          )}
       </div>
    </div>
  );
}
