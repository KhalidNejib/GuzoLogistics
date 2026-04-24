/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const ADDIS_ABABA: [number, number] = [9.0192, 38.7525];

// Custom icons for Pickup (Green) and Delivery (Red)
const pickupIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  pickup: [number, number] | null;
  delivery: [number, number] | null;
  onSelect: (type: 'pickup' | 'delivery', coords: [number, number]) => void;
}

function ClickHandler({ onSelect, mode }: { onSelect: any; mode: 'pickup' | 'delivery' }) {
  useMapEvents({
    click(e) {
      onSelect(mode, [e.latlng.lng, e.latlng.lat]); // Send [lng, lat] to match Zod
    },
  });
  return null;
}

export default function MapPicker({ pickup, delivery, onSelect }: MapPickerProps) {
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('pickup')}
          className={`px-3 py-1 text-xs rounded-full border ${mode === 'pickup' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-slate-50'}`}
        >
          📍 Set Pickup
        </button>
        <button
          onClick={() => setMode('delivery')}
          className={`px-3 py-1 text-xs rounded-full border ${mode === 'delivery' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-slate-50'}`}
        >
          🚩 Set Delivery
        </button>
      </div>

      <div className="h-[250px] w-full rounded-lg overflow-hidden border border-border">
        <MapContainer center={ADDIS_ABABA} zoom={13} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler mode={mode} onSelect={onSelect} />

          {pickup && <Marker position={[pickup[1], pickup[0]]} icon={pickupIcon} />}
          {delivery && <Marker position={[delivery[1], delivery[0]]} icon={deliveryIcon} />}
        </MapContainer>
      </div>
      <p className="text-[10px] text-muted-foreground text-center italic">
        Click the map to place the {mode} marker
      </p>
    </div>
  );
}
