/* eslint-disable @typescript-eslint/no-explicit-any */
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Truck, Store, MapPin } from 'lucide-react';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { useEffect } from 'react';

const ADDIS_ABABA: [number, number] = [9.0192, 38.7525];

// Helper to center map when rider moves (optional but helpful)
function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.panTo(position, { animate: true });
    }
  }, [position, map]);
  return null;
}

const createLucideIcon = (IconComponent: any, color: string, className = '') => {
  return L.divIcon({
    html: renderToString(
      <div
        style={{ color }}
        className={`transform -translate-x-1/2 -translate-y-1/2 drop-shadow-lg ${className}`}
      >
        <IconComponent size={32} strokeWidth={2.5} />
      </div>
    ),
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const storeIcon = createLucideIcon(Store, '#3b82f6'); // Blue for Merchant
const riderIcon = createLucideIcon(Truck, '#10b981', 'animate-bounce-subtle'); // Green for Rider
const destinationIcon = createLucideIcon(MapPin, '#ef4444'); // Red for Destination

interface LogisticsMapProps {
  riderLocation?: [number, number] | null; // [lng, lat] from Socket
  deliveryLocation?: [number, number] | null; // [lng, lat] from Order
}

export default function LogisticsMap({ riderLocation, deliveryLocation }: LogisticsMapProps) {
  // Convert [lng, lat] from API to Leaflet [lat, lng]
  const riderPos: [number, number] | null = riderLocation
    ? [riderLocation[1], riderLocation[0]]
    : null;

  const deliveryPos: [number, number] | null = deliveryLocation
    ? [deliveryLocation[1], deliveryLocation[0]]
    : null;

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

        {/* 1. Merchant Hub (Origin) */}
        <Marker position={ADDIS_ABABA} icon={storeIcon}>
          <Popup className="custom-popup">
            <div className="font-bold">Merchant Hub</div>
            <div className="text-xs text-muted-foreground">Main Distribution Center</div>
          </Popup>
        </Marker>

        {/* 2. Destination (If set) */}
        {deliveryPos && (
          <Marker position={deliveryPos} icon={destinationIcon}>
            <Popup>
              <div className="font-bold text-red-500">Delivery Point</div>
            </Popup>
          </Marker>
        )}

        {/* 3. Live Rider (The moving part!) */}
        {riderPos ? (
          <>
            <Marker position={riderPos} icon={riderIcon}>
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
