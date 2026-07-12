import { CheckCircle2, Circle, Clock, Package, MapPin, Truck, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  key: string;
  label: string;
  description: string;
  icon: any;
  timestamp?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

interface JourneyTimelineProps {
  status: string;
  history?: any[];
  createdAt?: string;
  deliveredAt?: string;
}

export default function JourneyTimeline({ status, history = [], createdAt, deliveredAt }: JourneyTimelineProps) {
  const events: TimelineEvent[] = [
    {
      key: 'PENDING',
      label: 'Order Placed',
      description: 'Your order has been received and is waiting for a rider.',
      icon: Package,
      timestamp: createdAt,
      isCompleted: true,
      isCurrent: status === 'PENDING',
    },
    {
      key: 'ACCEPTED',
      label: 'Rider Assigned',
      description: 'A rider has accepted your order and is heading to pickup.',
      icon: Navigation,
      isCompleted: !['PENDING'].includes(status),
      isCurrent: status === 'ACCEPTED',
    },
    {
      key: 'PICKED_UP',
      label: 'Picked Up',
      description: 'The rider has collected your package.',
      icon: Truck,
      isCompleted: !['PENDING', 'ACCEPTED', 'ARRIVED_PICKUP'].includes(status),
      isCurrent: status === 'PICKED_UP' || status === 'IN_TRANSIT',
    },
    {
      key: 'DELIVERED',
      label: 'Delivered',
      description: 'Package has been successfully delivered.',
      icon: CheckCircle2,
      timestamp: deliveredAt,
      isCompleted: status === 'DELIVERED',
      isCurrent: status === 'DELIVERED',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Journey Timeline</h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{history.length} path points recorded</span>
      </div>

      <div className="relative space-y-0">
        {/* Vertical Line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 z-0" />
        
        {events.map((event, idx) => {
          const Icon = event.icon;
          return (
            <div key={event.key} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Icon Circle */}
              <div className={cn(
                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                event.isCompleted 
                  ? event.isCurrent 
                    ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-100 text-white" 
                    : "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-white border-slate-200 text-slate-300"
              )}>
                <Icon size={14} className={event.isCurrent ? "animate-pulse" : ""} />
              </div>

              {/* Content */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    "text-xs font-black uppercase tracking-wider",
                    event.isCurrent ? "text-blue-600" : event.isCompleted ? "text-slate-900" : "text-slate-400"
                  )}>
                    {event.label}
                  </h4>
                  {event.timestamp && (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  {event.description}
                </p>
                
                {/* Specific additions based on status */}
                {event.isCurrent && status === 'IN_TRANSIT' && history.length > 0 && (
                   <div className="mt-2 flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-ping" />
                      <span className="text-[9px] font-bold text-blue-700 uppercase">Live Tracking Active</span>
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
