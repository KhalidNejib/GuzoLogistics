/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { MapPin, Target, Store } from 'lucide-react';

const ADDIS_ABABA: [number, number] = [9.0192, 38.7525];

// Modern Professional SVG Marker
const createProfessionalMarker = (color: string, isPickup: boolean) => {
  return L.divIcon({
    html: renderToString(
      <div className="relative flex items-center justify-center">
        {/* Pulse effect for better visibility */}
        <div
          className="absolute w-10 h-10 rounded-full animate-ping opacity-20"
          style={{ backgroundColor: color }}
        />

        <div className="relative drop-shadow-2xl scale-110">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 38C20 38 34 26.3556 34 16C34 8.26801 27.732 2 20 2C12.268 2 6 8.26801 6 16C6 26.3556 20 38 20 38Z"
              fill="white"
              stroke={color}
              strokeWidth="3"
            />
            <circle cx="20" cy="16" r="8" fill={color} />
            {isPickup ? (
              <path
                d="M18 13L20 11L22 13M20 11V21"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M18 19L20 21L22 19M20 11V21"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
      </div>
    ),
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 38],
  });
};

const pickupIcon = createProfessionalMarker('#10b981', true); // Green Hub Style
const deliveryIcon = createProfessionalMarker('#ef4444', false); // Red Drop Style

interface MapPickerProps {
  pickup: [number, number] | null;
  delivery: [number, number] | null;
  onSelect: (type: 'pickup' | 'delivery', coords: [number, number]) => void;
  onRouteCalculated?: (distanceKm: number, durationMinutes: number) => void;
}

function ClickHandler({ onSelect, mode }: { onSelect: any; mode: 'pickup' | 'delivery' }) {
  useMapEvents({
    click(e) {
      onSelect(mode, [e.latlng.lng, e.latlng.lat]); // [lng, lat]
    },
  });
  return null;
}

/**
 * Ensures the map centers on the selected points when they change programmatically
 */
function AutoCenter({ pickup, delivery }: { pickup: any; delivery: any }) {
  const map = useMap();

  useEffect(() => {
    if (pickup) {
      map.panTo([pickup[1], pickup[0]], { animate: true });
    }
  }, [pickup, map]);

  useEffect(() => {
    if (delivery) {
      map.panTo([delivery[1], delivery[0]], { animate: true });
    }
  }, [delivery, map]);

  return null;
}

export default function MapPicker({ pickup, delivery, onSelect, onRouteCalculated }: MapPickerProps) {
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup');
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);
  const lastFetched = useRef<string | null>(null);

  useEffect(() => {
    if (!pickup || !delivery) {
      setRoutePath(null);
      lastFetched.current = null;
      return;
    }

    const coordKey = `${pickup[0].toFixed(5)},${pickup[1].toFixed(5)}|${delivery[0].toFixed(5)},${delivery[1].toFixed(5)}`;
    if (lastFetched.current === coordKey) return;
    lastFetched.current = coordKey;

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickup[0]},${pickup[1]};${delivery[0]},${delivery[1]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes[0]) {
          const path = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setRoutePath(path);

          if (onRouteCalculated) {
            const distanceKm = data.routes[0].distance / 1000;
            const durationMinutes = data.routes[0].duration / 60;
            onRouteCalculated(distanceKm, durationMinutes);
          }
        }
      } catch (err) {
        console.error('OSRM MapPicker Routing Error:', err);
      }
    };

    fetchRoute();
  }, [pickup, delivery, onRouteCalculated]);

  return (
    <div className="space-y-4">
      <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-border/50">
        <button
          type="button"
          onClick={() => setMode('pickup')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'pickup'
            ? 'bg-white dark:bg-zinc-800 text-green-600 shadow-sm border border-border/10'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <Store className="w-3.5 h-3.5" /> Pickup Point
        </button>
        <button
          type="button"
          onClick={() => setMode('delivery')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'delivery'
            ? 'bg-white dark:bg-zinc-800 text-red-600 shadow-sm border border-border/10'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <Target className="w-3.5 h-3.5" /> Delivery Point
        </button>
      </div>

      <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-border shadow-inner group relative">
        <MapContainer center={ADDIS_ABABA} zoom={13} className="h-full w-full z-10">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler mode={mode} onSelect={onSelect} />
          <AutoCenter pickup={pickup} delivery={delivery} />

          {pickup && <Marker position={[pickup[1], pickup[0]]} icon={pickupIcon} />}
          {delivery && <Marker position={[delivery[1], delivery[0]]} icon={deliveryIcon} />}

          {routePath ? (
            <Polyline positions={routePath} color="#2563eb" weight={5} opacity={0.7} />
          ) : (
            pickup && delivery && (
              <Polyline
                positions={[[pickup[1], pickup[0]], [delivery[1], delivery[0]]]}
                color="#2563eb" dashArray="10, 8" weight={4} opacity={0.85}
              />
            )
          )}
        </MapContainer>

        {/* Overlay Guide */}
        <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black border border-border shadow-xl uppercase tracking-widest text-muted-foreground">
          Click map to set {mode}
        </div>
      </div>
    </div>
  );
}
