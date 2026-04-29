/* eslint-disable @typescript-eslint/no-explicit-any */
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Store, MapPin } from 'lucide-react';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { useEffect, useState, useRef } from 'react';

const ADDIS_ABABA: [number, number] = [9.0192, 38.7525];

// Helper to center map when rider moves
function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.panTo(position, { animate: true });
    }
  }, [position, map]);
  return null;
}

/**
 * Calculates the bearing (angle) between two points
 */
function calculateBearing(start: [number, number], end: [number, number]) {
  const startLat = (Math.PI * start[0]) / 180;
  const startLng = (Math.PI * start[1]) / 180;
  const endLat = (Math.PI * end[0]) / 180;
  const endLng = (Math.PI * end[1]) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);

  return (Math.atan2(y, x) * 180) / Math.PI;
}

// Custom High-Detail Delivery Vehicle Icon (SVG)
const createDetailedRiderIcon = (rotation: number) => {
  return L.divIcon({
    html: renderToString(
      <div
        className="relative"
        style={{ transform: `rotate(${rotation}deg)`, transition: 'all 0.5s ease-out' }}
      >
        {/* Signal Pulse Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-emerald-500/20 rounded-full animate-ping" />

        {/* Detailed Scooter SVG */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          {/* Shadow */}
          <ellipse cx="24" cy="40" rx="14" ry="4" fill="black" fillOpacity="0.15" />

          {/* Bike Body */}
          <path
            d="M12 28C12 25.7909 13.7909 24 16 24H32C34.2091 24 36 25.7909 36 28V34H12V28Z"
            fill="#10B981"
          />
          <path d="M14 24V18C14 16.8954 14.8954 16 16 16H20L24 24" fill="#059669" />

          {/* Wheels */}
          <circle cx="16" cy="34" r="5" fill="#1F2937" stroke="white" strokeWidth="2" />
          <circle cx="32" cy="34" r="5" fill="#1F2937" stroke="white" strokeWidth="2" />

          {/* Delivery Box */}
          <rect
            x="14"
            y="10"
            width="12"
            height="10"
            rx="2"
            fill="#F9FAFB"
            stroke="#D1D5DB"
            strokeWidth="1"
          />
          <path d="M14 14H26" stroke="#D1D5DB" strokeWidth="1" />

          {/* Rider */}
          <circle cx="21" cy="12" r="3" fill="#374151" />

          {/* Windshield */}
          <path d="M24 24L28 16H32" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

const createLucideIcon = (IconComponent: any, color: string) => {
  return L.divIcon({
    html: renderToString(
      <div style={{ color }} className="drop-shadow-lg">
        <IconComponent size={32} strokeWidth={2.5} />
      </div>
    ),
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const storeIcon = createLucideIcon(Store, '#3b82f6');
const destinationIcon = createLucideIcon(MapPin, '#ef4444');

interface LogisticsMapProps {
  riderLocation?: [number, number] | null;
  deliveryLocation?: [number, number] | null;
}

export default function LogisticsMap({ riderLocation, deliveryLocation }: LogisticsMapProps) {
  const [rotation, setRotation] = useState(0);
  const prevPos = useRef<[number, number] | null>(null);

  // Convert [lng, lat] from API to Leaflet [lat, lng]
  const riderPos: [number, number] | null = riderLocation
    ? [riderLocation[1], riderLocation[0]]
    : null;

  const deliveryPos: [number, number] | null = deliveryLocation
    ? [deliveryLocation[1], deliveryLocation[0]]
    : null;

  useEffect(() => {
    if (riderPos && prevPos.current) {
      const angle = calculateBearing(prevPos.current, riderPos);
      if (Math.abs(angle) > 5) {
        // Only rotate if significant movement
        setRotation(angle);
      }
    }
    if (riderPos) {
      prevPos.current = riderPos;
    }
  }, [riderPos]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-inner border border-border/10 bg-slate-100 dark:bg-zinc-900">
      <MapContainer
        center={ADDIS_ABABA}
        zoom={15}
        scrollWheelZoom={true}
        className="h-full w-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={ADDIS_ABABA} icon={storeIcon}>
          <Popup>
            <div className="font-bold">Merchant Hub</div>
            <div className="text-xs text-muted-foreground">Main Distribution Center</div>
          </Popup>
        </Marker>

        {deliveryPos && (
          <Marker position={deliveryPos} icon={destinationIcon}>
            <Popup>
              <div className="font-bold text-red-500">Delivery Point</div>
            </Popup>
          </Marker>
        )}

        {riderPos ? (
          <>
            <Marker position={riderPos} icon={createDetailedRiderIcon(rotation)}>
              <Popup>
                <div className="font-bold text-green-600">Active Rider</div>
                <div className="text-[10px]">Real-time GPS tracking active</div>
              </Popup>
            </Marker>
            <RecenterMap position={riderPos} />
          </>
        ) : (
          <div className="absolute top-4 right-4 z-[1000] bg-white/90 dark:bg-zinc-800/90 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-border shadow-sm">
            WAITING FOR RIDER GPS...
          </div>
        )}
      </MapContainer>
    </div>
  );
}
