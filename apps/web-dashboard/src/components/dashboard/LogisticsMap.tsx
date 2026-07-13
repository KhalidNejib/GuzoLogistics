import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Bike, Maximize2, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet.heat';
import { useEffect, useRef, useState, useCallback } from 'react';

// ── UBER-STYLE SMOOTH RIDER MARKER ───────────────────────────────────────────
// Interpolates the Leaflet marker position between GPS pings using rAF lerp.
// This gives the same fluid glide as the Uber driver app, regardless of the
// network round-trip delay between the rider phone and the server.
function AnimatedRiderMarker({ position, icon, children }: {
  position: [number, number];
  icon: L.DivIcon;
  children?: React.ReactNode;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const animRef   = useRef<number | null>(null);
  const fromRef   = useRef<[number, number]>(position);
  const toRef     = useRef<[number, number]>(position);
  const startRef  = useRef<number>(0);
  const DURATION  = 900; // ms — slightly longer than the 2s interval so motion is always smooth

  // When a new position arrives, kick off a fresh lerp animation
  useEffect(() => {
    if (!markerRef.current) return;
    const current = markerRef.current.getLatLng();
    fromRef.current = [current.lat, current.lng];
    toRef.current   = position;
    startRef.current = performance.now();

    if (animRef.current !== null) cancelAnimationFrame(animRef.current);

    const step = (now: number) => {
      const t = Math.min((now - startRef.current) / DURATION, 1);
      // Ease-out cubic for natural deceleration
      const ease = 1 - Math.pow(1 - t, 3);
      const lat = fromRef.current[0] + (toRef.current[0] - fromRef.current[0]) * ease;
      const lng = fromRef.current[1] + (toRef.current[1] - fromRef.current[1]) * ease;
      markerRef.current?.setLatLng([lat, lng]);
      if (t < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);

    return () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current); };
  }, [position[0], position[1]]);

  return (
    <Marker
      position={position}
      icon={icon}
      ref={(m) => { if (m) markerRef.current = m; }}
    >
      {children}
    </Marker>
  );
}

const ADDIS_ABABA: [number, number] = [9.0192, 38.7525];

// ── AUTO-FOLLOW CONTROLLER (pan only — never resets zoom) ────────────────────
// We deliberately only use panTo() here, not setView(). setView() at zoom:18
// would override the user's manual zoom every 2 s when a rider is moving,
// which is the root cause of the "map keeps snapping back" bug.
function MapController({ center, following }: { center: [number, number] | null; following: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (center && following) {
      map.panTo(center, { animate: true, duration: 0.6, easeLinearity: 0.3 });
    }
  }, [center, following, map]);
  return null;
}

// ── FIT-ALL CONTROLLER ────────────────────────────────────────────────────────
function FitBoundsController({
  positions,
  trigger,
}: {
  positions: [number, number][];
  trigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [60, 60], maxZoom: 15, animate: true });
    } else if (positions.length === 1) {
      map.setView(positions[0], 15, { animate: true });
    }
  }, [trigger]);
  return null;
}

// ── 📊 HEATMAP LAYER ──────────────────────────────────────────────────────────
function HeatmapLayer({ points, visible }: { points: [number, number, number][], visible: boolean }) {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    if (visible && points.length > 0) {
      if (!heatLayerRef.current) {
        // @ts-ignore - leaflet.heat is not typed
        heatLayerRef.current = L.heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: {
            0.4: 'blue',
            0.6: 'cyan',
            0.7: 'lime',
            0.8: 'yellow',
            1.0: 'red'
          }
        });
      }
      heatLayerRef.current.addTo(map);
    } else {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points, visible]);

  return null;
}

// ── MARKER FACTORY (Elite Styling) ────────────────────────────────────────────
const createMarker = (color: string, svgInner: string, isRider = false, speed = 0) => {
  const size = isRider ? 42 : 32;
  const pulseId = `pulse-${Math.random().toString(36).substr(2, 9)}`;
  const isMoving = speed > 2;

  // ── AMBIENT HEARTBEAT ───────────────────────────────────────────
  // A subtle "ping" when moving (high speed), or a "throb" when stopped (connection is live)
  const pulseCss = isRider
    ? `
      <style>
        @keyframes ${pulseId}-ping { 0% { transform: scale(0.6); opacity: 0.8; } 100% { transform: scale(${isMoving ? 2.8 : 2.0}); opacity: 0; } }
        @keyframes ${pulseId}-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      </style>
      <div style="position:absolute; inset:-12px; border: 3.5px solid ${color}; border-radius: 50%; opacity: 0.4; animation: ${pulseId}-ping ${isMoving ? '1.5s' : '3s'} cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      ${isMoving ? `<div style="position:absolute; inset:-12px; border: 3.5px solid ${color}; border-radius: 50%; opacity: 0.2; animation: ${pulseId}-ping 1.5s cubic-bezier(0, 0, 0.2, 1) 0.75s infinite;"></div>` : ''}
    `
    : '';

  return L.divIcon({
    html: `
      <div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; animation: ${isRider ? `${pulseId}-float 3s ease-in-out infinite` : 'none'};">
        ${pulseCss}
        <div style="
          position:relative; z-index:2;
          width:${size}px; height:${size}px;
          background:${color};
          border:3px solid white;
          border-radius:${isRider ? '50%' : '14px 14px 14px 2px'};
          box-shadow:0 8px 32px ${color}44;
          display:flex; align-items:center; justify-content:center;
          ${isRider ? '' : 'transform:rotate(-45deg)'}
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <div style="${isRider ? '' : 'transform:rotate(45deg);'} display:flex; align-items:center; justify-content:center;">
            ${svgInner}
          </div>
        </div>
      </div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: isRider ? [size / 2, size / 2] : [0, size],
    popupAnchor: [size / 2, isRider ? -size / 2 : -size],
  });
};

const scooterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/><path d="M5 6h5v2H5z"/><path d="M19 13c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>`;

// Pickup pin: amber teardrop with "A" label
const createPinIcon = (color: string, label: string) => L.divIcon({
  html: `
    <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
      <div style="
        width:36px; height:36px;
        background:${color};
        border:3px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 4px 16px ${color}88;
        display:flex; align-items:center; justify-content:center;
      ">
        <span style="transform:rotate(45deg); color:white; font-size:13px; font-weight:900; font-family:system-ui,sans-serif; line-height:1;">${label}</span>
      </div>
    </div>
  `,
  className: '',
  iconSize: [36, 44],
  iconAnchor: [18, 44],   // tip of the pin points to the exact coordinate
  popupAnchor: [0, -44],
});

const pickupIcon  = createPinIcon('#f59e0b', 'A');
const deliveryIcon = createPinIcon('#10b981', 'B');

interface MapProps {
  activeOrder?: any;
  riderLocation?: [number, number] | null;
  fleet?: Record<string, [number, number]>;
  telemetry?: Record<string, { battery?: number; speed?: number; riderName?: string; riderPhone?: string }>;
  onRouteMetrics?: (distanceKm: number, durationMinutes: number) => void;
  customerMode?: boolean;
}

export default function LogisticsMap({
  activeOrder,
  riderLocation: propLocation,
  fleet = {},
  telemetry = {},
  onRouteMetrics,
  customerMode = false,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [isFollowingRider, setIsFollowingRider] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatPoints, setHeatPoints] = useState<[number, number, number][]>([]);

  const pickup = activeOrder?.pickupAddress?.coordinates || activeOrder?.pickupAddress?.location?.coordinates;
  const delivery = activeOrder?.deliveryAddress?.coordinates || activeOrder?.deliveryAddress?.location?.coordinates;

  useEffect(() => {
    const id = activeOrder?._id;
    if (id && fleet[id]) setFocusId(id);
    else if (fleet['global']) setFocusId('global');
    else if (propLocation) setFocusId(null);
  }, [fleet, activeOrder?._id, propLocation]);

  const fleetIsEmpty = Object.keys(fleet).length === 0;
  const liveRider: [number, number] | null = fleetIsEmpty
    ? (propLocation ?? (pickup ? [pickup[1], pickup[0]] : null))
    : (focusId ? fleet[focusId] : (fleet['global'] || propLocation || null));

  useEffect(() => {
    if (!delivery) { setRoutePath(null); return; }

    const fetchRoute = async () => {
      try {
        const coords: string[] = [];
        if (liveRider) coords.push(`${liveRider[1]},${liveRider[0]}`);
        if (!customerMode) {
          const hasPickedUp = ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'].includes(activeOrder?.status);
          if (!hasPickedUp && pickup) coords.push(`${pickup[0]},${pickup[1]}`);
        }
        coords.push(`${delivery[0]},${delivery[1]}`);
        if (coords.length < 2) return;

        const orsKey = import.meta.env.VITE_ORS_API_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU2MDYyYWJmMWU5NjRlNjViMDc2ZmI1YjhjODc3YzcwIiwiaCI6Im11cm11cjY0In0=';
        const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;

        const res = await fetch(orsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': orsKey },
          body: JSON.stringify({
            coordinates: coords.map(c => {
              const parts = c.split(',');
              return [parseFloat(parts[0]), parseFloat(parts[1])];
            })
          })
        });

        const data = await res.json();
        if (data.features?.[0]) {
          const feature = data.features[0];
          setRoutePath(feature.geometry.coordinates.map((c: any) => [c[1], c[0]]));
          setRouteDistance(+(feature.properties.summary.distance / 1000).toFixed(1));
          onRouteMetrics?.(feature.properties.summary.distance / 1000, feature.properties.summary.duration / 60);
        }
      } catch (err) {
        console.error('🛰️ [ORS Routing] Failed:', err);
      }
    };
    fetchRoute();
  }, [liveRider?.[0], liveRider?.[1], pickup?.toString(), delivery?.toString(), customerMode, activeOrder?.status]);

  const allPositions: [number, number][] = [
    ...Object.values(fleet),
    ...(pickup ? [[pickup[1], pickup[0]] as [number, number]] : []),
    ...(delivery ? [[delivery[1], delivery[0]] as [number, number]] : []),
    ...(propLocation ? [propLocation] : []),
  ];

  const handleFitAll = useCallback(() => setFitTrigger(n => n + 1), []);

  // ── Auto-Follow (pan only, never resets user zoom) ──────────────
  useEffect(() => {
    if (isFollowingRider && liveRider && mapRef.current) {
      mapRef.current.panTo(liveRider, { animate: true, duration: 0.6 });
    }
  }, [liveRider, isFollowingRider]);

  // Zoom/drag by user disables follow
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const disable = () => setIsFollowingRider(false);
    map.on('dragstart', disable);
    map.on('zoomstart', disable); // also disable on manual zoom
    return () => { map.off('dragstart', disable); map.off('zoomstart', disable); };
  }, [mapRef.current]);

  // ── Global Focus Listener (Street-Level Sniper Zoom) ──────────────────────
  useEffect(() => {
    const handleFocus = () => {
      if (liveRider) {
        setIsFollowingRider(true);
        mapRef.current?.setView(liveRider, 19, { animate: true });
      }
    };
    window.addEventListener('focus-rider', handleFocus);
    return () => window.removeEventListener('focus-rider', handleFocus);
  }, [liveRider]);

  const fleetCount = Object.keys(fleet).filter(k => k !== 'global').length || (propLocation ? 1 : 0);

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-100 font-sans">
      <div className={`absolute right-4 z-[1000] flex flex-col gap-3 ${customerMode ? 'top-[88px]' : 'top-4'}`}>
        {fleetCount > 0 && (
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full shadow-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 self-end border border-white/10">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            {fleetCount} {fleetCount === 1 ? 'Pilot' : 'Pilots'} Active
          </div>
        )}

        {liveRider && (
          <button
            onClick={() => {
              setIsFollowingRider(true);
              mapRef.current?.setView(liveRider!, 19, { animate: true });
            }}
            className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl transition-all duration-300 border ${isFollowingRider
                ? 'bg-blue-600 text-white border-blue-400 scale-105 shadow-blue-500/40'
                : 'bg-white/95 backdrop-blur-md text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
          >
            <div className="relative">
              <Bike className={`w-4 h-4 ${isFollowingRider ? 'animate-bounce-subtle' : ''}`} />
              {isFollowingRider && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full border-2 border-blue-600" />
              )}
            </div>
            <span className="text-[11px] font-black uppercase tracking-tight">
              {isFollowingRider ? 'Tactical Lock' : 'Follow Pilot'}
            </span>
          </button>
        )}

        <button
          onClick={() => {
            if (!showHeatmap && heatPoints.length === 0) {
              // Generate points from current view
              const pts = Object.values(fleet).map(p => [p[0], p[1], 0.8] as [number, number, number]);
              if (pickup) pts.push([pickup[1], pickup[0], 0.5]);
              if (delivery) pts.push([delivery[1], delivery[0], 0.5]);
              // Add some randomness for aesthetic if fleet is small
              if (pts.length < 5) {
                for(let i=0; i<10; i++) {
                   pts.push([9.01 + Math.random()*0.05, 38.74 + Math.random()*0.05, Math.random()]);
                }
              }
              setHeatPoints(pts);
            }
            setShowHeatmap(!showHeatmap);
          }}
          className={`group flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl transition-all duration-300 border ${showHeatmap 
            ? 'bg-orange-600 text-white border-orange-400 scale-105 shadow-orange-500/40' 
            : 'bg-white/95 backdrop-blur-md text-slate-700 border-slate-200 hover:border-orange-300'}`}
        >
          <Navigation className={`w-4 h-4 ${showHeatmap ? 'animate-pulse' : ''}`} />
          <span className="text-[11px] font-black uppercase tracking-tight">
            Thermal View
          </span>
        </button>

        {allPositions.length > 1 && (
          <button
            onClick={handleFitAll}
            className="bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-xl border border-slate-200 hover:bg-white hover:scale-105 transition-all text-slate-700 flex items-center justify-center self-end"
            title="Fit All"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {routeDistance !== null && (
        <div className="absolute bottom-8 left-4 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2">
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
            Route: {routeDistance} km
          </span>
        </div>
      )}

      {!activeOrder && Object.keys(fleet).length === 0 && (
        <div className="absolute inset-0 z-[999] pointer-events-none flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl px-6 py-4 shadow-2xl border border-slate-200 text-center">
            <Bike className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-black text-slate-700">Select an Order</p>
            <p className="text-[11px] text-slate-400 mt-0.5">to see the live route & rider</p>
          </div>
        </div>
      )}

      <MapContainer
        center={liveRider || [9.0192, 38.7525]}
        zoom={14}
        className="h-full w-full"
        zoomControl={true}
        attributionControl={true}
        ref={(map) => { if (map) mapRef.current = map; }}
      >
        <MapController center={liveRider} following={isFollowingRider} />
        <FitBoundsController positions={allPositions} trigger={fitTrigger} />
        <HeatmapLayer points={heatPoints} visible={showHeatmap} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
          url={`https://api.maptiler.com/maps/${
            document.documentElement.classList.contains('dark') ? 'streets-v4-dark' : 'streets-v4'
          }/256/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_API_KEY}`}
          maxZoom={20}
        />

        {Object.entries(fleet).map(([id, pos]) => {
          const speed = telemetry[id]?.speed || 0;
          return (
            <AnimatedRiderMarker key={id} position={pos} icon={createMarker('#2563eb', scooterSvg, true, speed)}>
              <Popup closeButton={false} minWidth={220} maxWidth={240}>
                <div className="rounded-xl overflow-hidden -m-2">
                  <div className="bg-blue-600 p-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-black">
                      {telemetry[id]?.riderName?.[0] || 'R'}
                    </div>
                    <div>
                      <div className="text-white font-black text-xs leading-tight">
                        {telemetry[id]?.riderName || 'Rider'}
                      </div>
                      <div className="text-blue-200 text-[9px] font-bold uppercase tracking-wider">
                        Active Deployment
                      </div>
                    </div>
                  </div>
                  {telemetry[id] && (
                    <div className="p-3 bg-white space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-bold uppercase">Battery</span>
                        <span className="text-slate-900 font-black">{telemetry[id].battery}%</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-bold uppercase">Speed</span>
                        <span className="text-slate-900 font-black">{telemetry[id].speed} KM/H</span>
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </AnimatedRiderMarker>
          );
        })}

        {fleetIsEmpty && liveRider && (
          <>
            {/* ── SHADOW TRACE (Trailing blur) ── */}
            {activeOrder?.routeHistory && activeOrder.routeHistory.length > 1 && (
              <Polyline
                positions={activeOrder.routeHistory.slice(-5).map((p: any) => [p.lat, p.lng])}
                color="#2563eb"
                weight={12}
                opacity={0.15}
                lineCap="round"
              />
            )}

            <AnimatedRiderMarker position={liveRider} icon={createMarker('#2563eb', scooterSvg, true, 0)}>
              <Popup closeButton={false} minWidth={200}>
                <div className="rounded-xl overflow-hidden -m-2">
                  <div className="bg-blue-600 p-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-black">
                      {(activeOrder?.rider?.fullName?.[0] || 'R').toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-black text-xs leading-tight">
                        {activeOrder?.rider?.fullName || 'Your Rider'}
                      </div>
                      <div className="text-blue-200 text-[9px] font-bold uppercase tracking-wider">
                        🛵 En Route to You
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </AnimatedRiderMarker>
          </>
        )}

        {pickup && <Marker position={[pickup[1], pickup[0]]} icon={pickupIcon} />}
        {delivery && <Marker position={[delivery[1], delivery[0]]} icon={deliveryIcon} />}

        {routePath && (
          <>
            <Polyline positions={routePath} color="white" weight={8} opacity={0.3} lineCap="round" />
            <Polyline positions={routePath} color="#2563eb" weight={4} opacity={1} lineCap="round" />
          </>
        )}

      </MapContainer>
    </div>
  );
}
