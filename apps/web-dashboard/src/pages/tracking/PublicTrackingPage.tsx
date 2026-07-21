/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Truck,
  ShieldCheck,
  Clock,
  Navigation,
  Phone,
  MapPin,
  Package,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Copy,
  MessageCircle,
  Star,
} from 'lucide-react';
import LogisticsMap from '@/components/dashboard/LogisticsMap';
import JourneyTimeline from '@/components/tracking/JourneyTimeline';
import { io, Socket } from 'socket.io-client';
import { Badge } from '@/components/ui';
import { toast } from 'sonner';
import { getApiUrl, formatStatus } from '@/lib/utils';

const API_URL = getApiUrl();

const STATUS_STEPS = [
  { key: 'PENDING',          label: 'Order Placed',    icon: Package },
  { key: 'ACCEPTED',         label: 'Rider Assigned',  icon: Navigation },
  { key: 'ARRIVED_PICKUP',   label: 'Rider at Pickup', icon: MapPin },
  { key: 'PICKED_UP',        label: 'Picked Up',       icon: Truck },
  { key: 'IN_TRANSIT',       label: 'In Transit',      icon: Truck },
  { key: 'ARRIVED_DELIVERY', label: 'Near You',        icon: MapPin },
  { key: 'DELIVERED',        label: 'Delivered',       icon: CheckCircle2 },
];

function getStepIndex(status: string) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

// ── Star Rating Component ─────────────────────────────────────────────────────
function StarRating({
  token,
  alreadyRated,
  existingRating,
}: {
  token: string;
  alreadyRated: boolean;
  existingRating?: number;
}) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(existingRating || 0);
  const [submitted, setSubmitted] = useState(alreadyRated);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const LABELS = ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Excellent!'];

  const handleSubmit = async (rating: number) => {
    if (submitted || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/track/${token}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Could not submit rating.');
        return;
      }
      setSelected(rating);
      setSubmitted(true);
      toast.success('Thank you for your feedback! ⭐');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Your Rating</p>
        <div className="flex items-center justify-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-6 h-6 ${s <= selected ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
            />
          ))}
        </div>
        <p className="text-sm font-black text-slate-700">{LABELS[selected]}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Thank you for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100 rounded-2xl p-5 text-center space-y-3">
      <div>
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Rate Your Delivery</p>
        <p className="text-sm font-bold text-slate-600 mt-0.5">How was your experience?</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleSubmit(star)}
            disabled={isSubmitting}
            className="transition-transform duration-150 hover:scale-125 active:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={`w-9 h-9 transition-colors duration-150 ${
                star <= (hovered || selected)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300 fill-slate-100'
              }`}
            />
          </button>
        ))}
      </div>

      {(hovered > 0 || selected > 0) && (
        <p className="text-xs font-black text-slate-500 animate-in fade-in duration-200">
          {LABELS[hovered || selected]}
        </p>
      )}

      {isSubmitting && (
        <p className="text-[10px] text-blue-500 font-bold animate-pulse">Submitting...</p>
      )}
    </div>
  );
}

export default function PublicTrackingPage() {
  const { token } = useParams();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    if (!token) return;
    const newSocket = io(API_URL, {
      auth: { trackingToken: token },
      transports: ['polling', 'websocket'],
    });

    newSocket.on('connect', () => {
      console.info('🟢 [Tracking] Live Socket Connected');
      setSocketStatus('connected');
    });
    newSocket.on('disconnect', () => setSocketStatus('disconnected'));

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const [order, setOrder] = useState<any>(null);
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);
  const [etaMins, setEtaMins] = useState<number | null>(null);
  const [liveRiderInfo, setLiveRiderInfo] = useState<{ name?: string; phone?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);

  // ── Fetch order by token ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/track/${token}`);
        if (!res.ok) throw new Error('Tracking link invalid or expired.');
        const data = await res.json();
        setOrder(data.order);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchOrder();
  }, [token]);

  // ── Seed scooter before live GPS arrives ────────────────────────
  useEffect(() => {
    if (!order || riderLocation) return;
    if (order.lastRiderLocation) {
      setRiderLocation([order.lastRiderLocation.lat, order.lastRiderLocation.lng]);
    } else {
      const isPostPickup = ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DELIVERY', 'DELIVERED'].includes(order.status);
      const coords = isPostPickup
        ? (order.deliveryAddress?.coordinates || order.deliveryAddress?.location?.coordinates)
        : (order.pickupAddress?.coordinates || order.pickupAddress?.location?.coordinates);
      if (coords) setRiderLocation([coords[1], coords[0]]); // GeoJSON [lng,lat] → Leaflet [lat,lng]
    }
  }, [order, riderLocation]);

  // ── Socket: live rider position ───────────────────────────────────────────
  useEffect(() => {
    if (!socket || !order) return;
    socket.emit('join_order', order._id);

    socket.on(
      'rider_moved',
      (data: {
        orderId: string;
        lat: number;
        lng: number;
        riderName?: string;
        riderPhone?: string;
      }) => {
        if (data.orderId === order._id) {
          setRiderLocation([data.lat, data.lng]);
          if (data.riderName)
            setLiveRiderInfo({ name: data.riderName, phone: data.riderPhone });
        }
      }
    );

    socket.on('order_status_changed', (data: any) => {
      console.info('📡 [Tracking] Live update:', data);
      
      const newStatus = data.status || data.order?.status;
      if (newStatus) {
        toast.info(`Order Status updated: ${formatStatus(newStatus)}`, {
          description: `Your delivery status is now ${formatStatus(newStatus)}.`,
          duration: 6000,
        });
      }

      // 🚀 Full update to catch POD images and rider profile changes instantly
      if (data.order) {
        setOrder((prev: any) => ({ ...prev, ...data.order }));
      } else {
        setOrder((prev: any) => ({ ...prev, status: data.status }));
      }
    });

    socket.on('notification', (data: { title: string; body: string }) => {
      toast.info(data.title, {
        description: data.body,
        duration: 8000,
      });
    });

    return () => {
      socket.off('rider_moved');
      socket.off('order_status_changed');
      socket.off('notification');
    };
  }, [socket, order]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-14 w-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white font-black text-sm uppercase tracking-widest">
            Initializing Live Tracking...
          </p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-10 text-center max-w-sm w-full shadow-2xl space-y-5">
          <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck size={36} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Link Expired</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const currentStepIdx = getStepIndex(order?.status);
  // Rider identity: prefer MongoDB database fields over live socket data to avoid Clerk email names.
  const riderName = order?.rider?.fullName || liveRiderInfo?.name;
  const riderPhone = order?.rider?.phoneNumber || liveRiderInfo?.phone;
  const isDelivered = order?.status === 'DELIVERED';
  const alreadyRated = order?.customerRating !== undefined && order?.customerRating !== null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-900 font-sans">

      {/* ── FULL-SCREEN MAP (behind everything) ─────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <LogisticsMap
          activeOrder={order}
          riderLocation={riderLocation}
          customerMode={true}
          onRouteMetrics={(_, durationMins) => setEtaMins(durationMins)}
        />
      </div>

      {/* ── TOP HEADER BAR ──────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 pb-3 bg-linear-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
            <Truck className="text-white w-4 h-4" />
          </div>
          <div>
            <h1 className="font-black text-white text-sm leading-none">Guzo</h1>
            <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest leading-none mt-0.5">
              Live Delivery Tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live socket badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg ${
              socketStatus === 'connected'
                ? 'bg-emerald-500/90 text-white'
                : 'bg-slate-700/90 text-slate-300'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                socketStatus === 'connected' ? 'bg-white animate-ping' : 'bg-slate-500'
              }`}
            />
            {socketStatus === 'connected' ? 'Live' : 'Offline'}
          </div>

          {/* Copy tracking ID */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Tracking link copied!');
            }}
            className="bg-white/10 backdrop-blur-sm p-2 rounded-xl text-white hover:bg-white/20 transition-all"
            title="Copy tracking link"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Share button */}
          {navigator.share && (
            <button
              onClick={() => {
                navigator.share({
                  title: 'Track my Guzo delivery',
                  text: `I'm tracking my order #${order?._id.slice(-8).toUpperCase()} live!`,
                  url: window.location.href,
                }).catch(() => {});
              }}
              className="bg-blue-600 p-2 rounded-xl text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
              title="Share tracking link"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── ETA PILL (floats over map) ───────────────────────────────────── */}
      {!isDelivered && (
        <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-white/20">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-black text-slate-900">
              {etaMins ? `~${Math.round(etaMins)} min away` : 'Calculating ETA...'}
            </span>
          </div>
        </div>
      )}

      {/* ── BOTTOM SHEET ────────────────────────────────────────────────── */}
      <div
        className={`absolute left-0 right-0 bottom-0 z-20 transition-transform duration-500 ease-out ${
          sheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-72px)]'
        }`}
      >
        {/* Sheet Handle / Toggle */}
        <button
          onClick={() => setSheetOpen((p) => !p)}
          className="w-full bg-white rounded-t-3xl flex flex-col items-center pt-3 pb-2 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] border-t border-slate-100"
          aria-label="Toggle tracking info"
        >
          <div className="w-10 h-1 bg-slate-200 rounded-full mb-2" />
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-black uppercase tracking-wider">
            {sheetOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            {sheetOpen ? 'Hide details' : 'View details'}
          </div>
        </button>

        {/* Sheet Body */}
        <div className="bg-white px-5 pb-10 space-y-6 max-h-[45vh] overflow-y-auto">

          {/* Order ID + Status badge */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Reference</p>
              <h2 className="text-xl font-black text-slate-900">
                #{order._id.slice(-8).toUpperCase()}
              </h2>
            </div>
            <Badge
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isDelivered
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {formatStatus(order.status)}
            </Badge>
          </div>

          {/* ── STATUS STEPPER ───────────────────────────────────────── */}
          <div className="flex items-start justify-between relative">
            {/* connecting line */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100 z-0" />
            <div
              className="absolute top-4 left-4 h-0.5 bg-blue-500 z-0 transition-all duration-700"
              style={{
                width: `${(currentStepIdx / (STATUS_STEPS.length - 1)) * (100 - (8 / STATUS_STEPS.length) * 100)}%`,
              }}
            />

            {STATUS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const done = idx <= currentStepIdx;
              const active = idx === currentStepIdx;
              return (
                <div key={step.key} className="flex flex-col items-center gap-1.5 z-10" style={{ width: `${100 / STATUS_STEPS.length}%` }}>
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      done
                        ? active
                          ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200'
                          : 'bg-emerald-500 border-emerald-500'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${done ? 'text-white' : 'text-slate-300'}`}
                    />
                  </div>
                  <p
                    className={`text-center text-[9px] font-black uppercase leading-tight ${
                      done ? (active ? 'text-blue-600' : 'text-emerald-600') : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── RIDER CARD ───────────────────────────────────────────── */}
          {riderName ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                   <ShieldCheck size={48} className="text-blue-900" />
                </div>
                <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-black shadow-md shadow-blue-200 shrink-0">
                  {riderName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Rider</p>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900 truncate">{riderName}</p>
                    {!isDelivered && (
                      <div className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter animate-pulse">Live</div>
                    )}
                  </div>
                  {riderPhone && (
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                      📞 {riderPhone}
                    </p>
                  )}
                  <p className="text-[10px] text-amber-500 font-black mt-0.5">
                    ⭐ {order?.rider?.rating || '5.0'} · {order?.rider?.vehicleType || 'Scooter'}
                  </p>
                </div>
                {riderPhone && (
                  <div className="flex flex-col items-center gap-2">
                    <a
                      href={`tel:${riderPhone}`}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2.5 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center gap-1.5"
                      title={`Call ${riderName}`}
                    >
                      <Phone className="w-4 h-4" />
                      <span className="text-[10px] font-black">Call</span>
                    </a>
                  </div>
                )}
              </div>

              {order?.verificationCode && !isDelivered && (
                <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">POD Verification Code</p>
                    <p className="text-lg font-black text-indigo-900 tracking-wider mt-1.5 leading-none">{order.verificationCode}</p>
                  </div>
                  <div className="bg-indigo-100/70 p-2 rounded-xl text-indigo-600 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
              )}
              
              {/* 🛡️ VANGUARD BIO 🛡️ */}
              {!isDelivered && (
                <div className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl">
                   <div className="flex items-center gap-2 mb-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Verified Vanguard</span>
                   </div>
                   <p className="text-xs text-slate-600 italic leading-relaxed">
                      "Committed to delivering your package safely and on time. I'm currently 
                      navigating the best route to reach you. Thank you for choosing Guzo!"
                   </p>
                   <div className="flex items-center gap-3 mt-3">
                     <button 
                       onClick={() => window.dispatchEvent(new CustomEvent('focus-rider'))}
                       className="text-[9px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1 hover:underline"
                     >
                       <Navigation className="w-2.5 h-2.5" /> Center Map
                     </button>
                     <div className="h-1 w-1 bg-slate-300 rounded-full" />
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Mission in Progress</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-amber-50 border border-amber-100 p-4 rounded-2xl">
              <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 animate-pulse">
                <Navigation size={22} />
              </div>
              <div>
                <p className="font-bold text-sm text-amber-800">Finding Your Rider</p>
                <p className="text-[11px] text-amber-600">A rider will be assigned shortly</p>
              </div>
            </div>
          )}

          {/* ── VERTICAL TIMELINE ────────────────────────────────────── */}
          <JourneyTimeline 
            status={order.status} 
            history={order.routeHistory} 
            createdAt={order.createdAt}
            deliveredAt={order.deliveredAt}
          />

          {/* ── ROUTE SUMMARY ────────────────────────────────────────── */}
          <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pickup</p>
                <p className="text-sm font-bold text-slate-900 leading-snug">{order.pickupAddress?.addressText}</p>
              </div>
            </div>
            <div className="ml-1.5 w-0.5 h-4 bg-slate-200" />
            <div className="flex items-start gap-3">
              <div className="mt-1 h-3 w-3 rounded-full bg-red-500 ring-4 ring-red-100 shrink-0">
                <MapPin className="hidden" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Address</p>
                <p className="text-sm font-bold text-slate-900 leading-snug">{order.deliveryAddress?.addressText}</p>
              </div>
            </div>
          </div>

          {/* Delivered section with rating */}
          {isDelivered && (
            <div className="space-y-6">
              <div className="bg-linear-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-center text-white shadow-xl shadow-emerald-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <ShieldCheck size={80} />
                </div>
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-90" />
                <h3 className="text-2xl font-black italic tracking-tighter">MISSION ACCOMPLISHED! 🎉</h3>
                <p className="text-sm text-white/80 mt-1 font-medium">Your package has been successfully delivered.</p>
              </div>

              {/* ⭐ CUSTOMER RATING ── */}
              {token && (
                <StarRating
                  token={token}
                  alreadyRated={alreadyRated}
                  existingRating={order?.customerRating}
                />
              )}

              {order.podImageUrl && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Delivery Snapshot
                  </p>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-xl opacity-20" />
                    <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/10 shadow-lg">
                      <img 
                        src={order.podImageUrl} 
                        alt={`Proof of Delivery — verified photo for order #${order.trackingUrlToken?.slice(-6)?.toUpperCase() || ''}`}
                        className="w-full h-auto aspect-video object-cover"
                      />
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-emerald-500 text-white border-none shadow-lg text-[9px] font-black uppercase tracking-widest">Verified POD</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
