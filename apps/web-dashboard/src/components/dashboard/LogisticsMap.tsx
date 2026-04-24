/* eslint-disable @typescript-eslint/no-explicit-any */
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Truck, Store } from 'lucide-react';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';

const ADDIS_ABABA: [number, number] = [9.0192, 38.7525];
const RIDER_MOCK: [number, number] = [9.022, 38.751];

const createLucideIcon = (IconComponent: any, color: string) => {
  return L.divIcon({
    html: renderToString(
      <div style={{ color }} className="transform -translate-x-1/2 -translate-y-1/2 drop-shadow-md">
        <IconComponent size={32} />
      </div>
    ),
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const storeIcon = createLucideIcon(Store, '#3b82f6');
const riderIcon = createLucideIcon(Truck, '#10b981');

export default function LogisticsMap() {
  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-inner border border-border/10 bg-slate-100 dark:bg-zinc-900">
      <MapContainer
        center={ADDIS_ABABA}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full z-10"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={ADDIS_ABABA} icon={storeIcon}>
          <Popup>Merchant Hub</Popup>
        </Marker>
        <Marker position={RIDER_MOCK} icon={riderIcon}>
          <Popup>Rider #284 (Online)</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
