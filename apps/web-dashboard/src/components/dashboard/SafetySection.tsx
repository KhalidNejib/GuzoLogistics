import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  User as UserIcon,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button, 
  Badge,
} from '@/components/ui';
import { useSocket } from '@/hooks/useSocket';
import { toast } from 'sonner';

export default function SafetySection() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const { socket } = useSocket();

  const fetchIncidents = async () => {
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/incidents`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('emergency_sos', () => {
      // Re-fetch to get latest data with populated rider info
      fetchIncidents();
    });

    return () => {
      socket.off('emergency_sos');
    };
  }, [socket]);

  const resolveIncident = async (id: string) => {
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/incidents/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Incident marked as resolved');
        setIncidents(prev => prev.map(inc => inc._id === id ? { ...inc, status: 'RESOLVED' } : inc));
      }
    } catch (err) {
      toast.error('Failed to resolve incident');
    }
  };

  const openIncidents = incidents.filter(inc => inc.status !== 'RESOLVED');
  const sosIncidents = openIncidents.filter(inc => inc.type === 'SOS');
  const reports = openIncidents.filter(inc => inc.type !== 'SOS');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 🚨 SOS COMMAND CENTER */}
      <Card className="border-red-500/20 bg-red-50/50 dark:bg-red-950/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <ShieldAlert size={120} />
        </div>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-500 rounded-lg shadow-lg shadow-red-500/20">
                <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
             </div>
             <div>
                <CardTitle className="text-xl font-bold text-red-600 dark:text-red-400">SOS Active Hub</CardTitle>
                <p className="text-xs text-red-500/60 font-bold uppercase tracking-widest mt-0.5">Critical Priority</p>
             </div>
          </div>
          <Badge variant="destructive" className="font-black px-3 py-1">
            {sosIncidents.length} ALERTS
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto pr-4">
            {sosIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-zinc-900/40 rounded-3xl border border-dashed border-red-200 dark:border-red-900/50">
                 <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 opacity-20" />
                 <p className="text-sm font-bold text-muted-foreground/60">No active SOS alerts. Fleet secure.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sosIncidents.map((sos) => (
                  <div key={sos._id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-red-500/30 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                             <UserIcon size={18} className="text-slate-600" />
                          </div>
                          <div>
                             <p className="font-black text-slate-800 dark:text-slate-100">{sos.rider?.fullName || 'Pilot Undefined'}</p>
                             <p className="text-xs text-muted-foreground font-bold flex items-center gap-1">
                                <Phone size={10} /> {sos.rider?.phoneNumber}
                             </p>
                          </div>
                       </div>
                       <Badge className="bg-red-600 text-white font-bold text-[10px]">IMMEDIATE</Badge>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl mb-4 border border-red-100 dark:border-red-900/20">
                       <p className="text-sm text-red-800 dark:text-red-300 font-bold mb-1">Incident Intel:</p>
                       <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed italic">{sos.description}</p>
                    </div>

                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock size={12} />
                          <span className="text-[10px] font-black uppercase tracking-tighter">
                            {new Date(sos.createdAt).toLocaleTimeString()}
                          </span>
                       </div>
                       <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            className="rounded-xl h-10 font-bold px-4"
                            onClick={() => resolveIncident(sos._id)}
                          >
                             Acknowledge & Resolve
                          </Button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ⚠️ FIELD REPORTS */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-500 rounded-lg shadow-lg shadow-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-white" />
             </div>
             <div>
                <CardTitle className="text-xl font-bold">Field Incidents</CardTitle>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Operational Awareness</p>
             </div>
          </div>
          <Badge variant="secondary" className="font-black px-3 py-1">
            {reports.length} OPEN
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto pr-4">
             {reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                 <AlertTriangle className="w-12 h-12 text-slate-200 mb-4" />
                 <p className="text-sm font-bold text-muted-foreground/40 italic text-center px-10">No pending reports from the fleet. Operations proceeding as scheduled.</p>
              </div>
            ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report._id} className="p-4 rounded-2xl border border-border/60 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group">
                       <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 border-amber-200">
                                {report.type}
                             </Badge>
                             <span className="text-[10px] text-muted-foreground font-bold italic">from {report.rider?.fullName}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground font-black uppercase">{new Date(report.createdAt).toLocaleTimeString()}</span>
                       </div>
                       <p className="text-sm font-bold text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed mb-3">
                          {report.description}
                       </p>
                       <div className="flex justify-end pt-2 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase hover:bg-amber-500 hover:text-white rounded-lg transition-all"
                            onClick={() => resolveIncident(report._id)}
                          >
                            Resolve <ArrowRight size={12} className="ml-1" />
                          </Button>
                       </div>
                    </div>
                  ))}
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
