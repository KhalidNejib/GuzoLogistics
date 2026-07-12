/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '@/hooks/useSocket';
import { Radio, Loader2, Bike } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── MARKER FACTORY ────────────────────────────────────────────────────────────
const createMarker = (color: string, svgInner: string) => {
  const size = 36;
  return L.divIcon({
    html: `
      <style>
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:0.25} 50%{transform:scale(1.4);opacity:0} }
      </style>
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;border-radius:50%;background:${color};opacity:0.25;animation:pulse 2s ease-in-out infinite;"></div>
        <div style="
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;
          width:${size}px;height:${size}px;
          background:${color};
          border:2.5px solid white;
          border-radius:50%;
          box-shadow:0 4px 12px rgba(0,0,0,0.22);
        ">
          <div style="display:flex;align-items:center;justify-content:center;">
            ${svgInner}
          </div>
        </div>
      </div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const scooterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/><path d="M5 6h5v2H5z"/><path d="M19 13c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>`;
const riderIcon = createMarker('#2563eb', scooterSvg);

interface FleetRider {
    riderId: string;
    orderId: string;
    lat: number;
    lng: number;
    speed?: number;
    riderName: string;
    lastSeen: number;
}

function FlyToRiders({ riders, initialFit }: { riders: FleetRider[], initialFit: React.MutableRefObject<boolean> }) {
    const map = useMap();
    useEffect(() => {
        if (riders.length > 0 && !initialFit.current) {
            const bounds = L.latLngBounds(riders.map(r => [r.lat, r.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
            initialFit.current = true; // Mark as done so it doesn't interrupt manual zoom
        }
    }, [riders, map]);
    return null;
}

export default function FleetRadar() {
  const { socket } = useSocket();
  const [riders, setRiders] = useState<Record<string, FleetRider>>({});
  const initialFit = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data: FleetRider) => {
      setRiders(prev => ({
        ...prev,
        [data.riderId]: {
          ...data,
          lastSeen: Date.now()
        }
      }));
    };

    socket.on('fleet_radar_update', handleUpdate);
    return () => {
      socket.off('fleet_radar_update', handleUpdate);
    };
  }, [socket]);

  // Clean old riders (inactive for > 5 mins)
  useEffect(() => {
      const interval = setInterval(() => {
          setRiders(prev => {
              const next = { ...prev };
              const now = Date.now();
              Object.keys(next).forEach(id => {
                  if (now - next[id].lastSeen > 300000) delete next[id];
              });
              return next;
          });
      }, 30000);
      return () => clearInterval(interval);
  }, []);

  const riderList = Object.values(riders);

  return (
    <Card className="border-border/40 shadow-sm overflow-hidden h-[600px] flex flex-col">
      <CardHeader className="py-3 px-4 bg-slate-50/50 dark:bg-zinc-900 border-b border-border/40 shrink-0">
        <div className="flex items-center justify-between">
           <CardTitle className="text-sm font-black flex items-center gap-2">
             <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
             Live Fleet Radar
           </CardTitle>
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500" />
                 <span className="text-[10px] font-bold text-slate-500">{riderList.length} Active</span>
              </div>
              <button onClick={() => initialFit.current = false} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg transition-all" title="Focus Fleet">
                 <Bike className="w-4 h-4 text-slate-400" />
              </button>
           </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 relative">
        <MapContainer
          center={[9.0122, 38.7578] as any} // Addis Ababa
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
            url={`https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_API_KEY}`}
            maxZoom={20}
          />
          {riderList.map((rider) => (
            <Marker 
                key={rider.riderId} 
                position={[rider.lat, rider.lng]} 
                icon={riderIcon}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                <span className="font-extrabold text-xs text-slate-900">{rider.riderName || 'Rider'}</span>
              </Tooltip>
              <Popup className="custom-popup">
                <div className="p-1">
                  <p className="text-xs font-black text-slate-900">{rider.riderName}</p>
                  <p className="text-[10px] font-bold text-blue-600">ID: {rider.orderId.slice(-6).toUpperCase()}</p>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {rider.speed ? `${Math.round(rider.speed)} km/h` : 'Moving'}
                     </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          <FlyToRiders riders={riderList} initialFit={initialFit} />
        </MapContainer>

        {riderList.length === 0 && (
           <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] flex items-center justify-center z-[1000]">
              <div className="bg-white dark:bg-zinc-900 px-6 py-4 rounded-2xl shadow-2xl border border-border/40 text-center animate-in zoom-in-95 duration-300">
                 <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                 <h4 className="text-sm font-black text-slate-900 dark:text-white">Scanning for Active Riders...</h4>
                 <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Awaiting real-time telemetry</p>
              </div>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
