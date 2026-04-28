/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { MapPin, Target } from 'lucide-react';

const ADDIS_ABABA: [number, number] = [9.0192, 38.7525];

// Modern DivIcon using Lucide
const createMarkerIcon = (color: string) => {
  return L.divIcon({
    html: renderToString(
      <div className="relative flex items-center justify-center">
        <div
          className="absolute w-8 h-8 rounded-full animate-ping opacity-20"
          style={{ backgroundColor: color }}
        />
        <div className="relative drop-shadow-xl" style={{ color }}>
          <MapPin size={36} fill={color} fillOpacity={0.2} strokeWidth={2.5} />
        </div>
      </div>
    ),
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

const pickupIcon = createMarkerIcon('#10b981'); // Green
const deliveryIcon = createMarkerIcon('#ef4444'); // Red

interface MapPickerProps {
  pickup: [number, number] | null;
  delivery: [number, number] | null;
  onSelect: (type: 'pickup' | 'delivery', coords: [number, number]) => void;
}

function ClickHandler({ onSelect, mode }: { onSelect: any; mode: 'pickup' | 'delivery' }) {
  useMapEvents({
    click(e) {
      onSelect(mode, [e.latlng.lng, e.latlng.lat]); // [lng, lat]
    },
  });
  return null;
}

export default function MapPicker({ pickup, delivery, onSelect }: MapPickerProps) {
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup');

  return (
    <div className="space-y-4">
      <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-border/50">
        <button
          type="button"
          onClick={() => setMode('pickup')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
            mode === 'pickup'
              ? 'bg-white dark:bg-zinc-800 text-green-600 shadow-sm border border-border/10'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Target className="w-3.5 h-3.5" /> Pickup Point
        </button>
        <button
          type="button"
          onClick={() => setMode('delivery')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
            mode === 'delivery'
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

          {pickup && <Marker position={[pickup[1], pickup[0]]} icon={pickupIcon} />}
          {delivery && <Marker position={[delivery[1], delivery[0]]} icon={deliveryIcon} />}
        </MapContainer>

        {/* Overlay Guide */}
        <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black border border-border shadow-xl uppercase tracking-widest text-muted-foreground">
          Click map to set {mode}
        </div>
      </div>
    </div>
  );
}
