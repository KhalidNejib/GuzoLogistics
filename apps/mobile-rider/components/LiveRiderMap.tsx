import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import { Order } from '@ethio-logistics/types';

// MapTiler (https://www.maptiler.com) — replaces the old CARTO free-tier tiles.
// Free tier: 100k tile requests/month, no credit card required.
// Get a key at https://cloud.maptiler.com/account/keys/ and set it as
// EXPO_PUBLIC_MAPTILER_API_KEY in apps/mobile-rider/.env
const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY || '';
const ATTRIBUTION = '&copy; OpenStreetMap contributors &copy; MapTiler';

export interface LiveRiderMapProps {
  mapRef?: any;
  currentPosition: { lat: number; lng: number };
  focusedOrder?: Order | null;
  routeToPickup: { latitude: number; longitude: number }[];
  routeCoords: { latitude: number; longitude: number }[];
  bearing: number;
  routeMeta?: { distance: number; duration: number } | null;
  isPickedUp?: boolean;
  isDark?: boolean;
}

export const LiveRiderMap: React.FC<LiveRiderMapProps> = ({
  currentPosition,
  focusedOrder,
  routeToPickup,
  routeCoords,
  bearing,
  routeMeta,
  isPickedUp = false,
  isDark = false,
}) => {
  const webRef = useRef<WebView>(null);

  const mapHtml = useMemo(() => {
    // MapTiler bakes basemap + labels into a single raster tile (unlike CARTO,
    // which split them so we could layer/dim labels separately) — so this is
    // now one tileUrl per theme instead of a base+label pair.
    const mapId = isDark ? 'streets-v4-dark' : 'streets-v4';
    const tileUrl = `https://api.maptiler.com/maps/${mapId}/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;
    const bgColor = isDark ? '#020617' : '#f1f5f9';
    const accentColor = isDark ? '#60a5fa' : '#2563eb';
    const borderColor = isDark ? 'rgba(255,255,255,0.4)' : 'white';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; background: ${bgColor}; font-family: -apple-system, sans-serif; }
        #map { width: 100vw; height: 100vh; background: ${bgColor}; }
        
        /* 🛵 ELITE RIDER MARKER */
        .rider-marker-container {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }
        .rider-pulse {
          position: absolute; width: 60px; height: 60px;
          border: 2px solid ${accentColor}; border-radius: 50%;
          animation: pulse 1.8s infinite; opacity: 0;
        }
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .rider-core {
          width: 32px; height: 32px;
          background: ${accentColor}; border: 3px solid ${borderColor};
          border-radius: 50%; box-shadow: 0 8px 24px ${isDark ? 'rgba(96, 165, 250, 0.6)' : 'rgba(37, 99, 235, 0.5)'};
          display: flex; align-items: center; justify-content: center;
        }
        .rider-arrow {
          width: 0; height: 0;
          border-left: 6px solid transparent; border-right: 6px solid transparent;
          border-bottom: 10px solid ${borderColor};
        }

        /* 📍 WAYPOINT MARKERS */
        .waypoint {
          width: 24px; height: 32px;
          display: flex; flex-direction: column; align-items: center;
        }
        .waypoint-icon {
          width: 24px; height: 24px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 14px; font-weight: bold;
          border: 2px solid ${borderColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .waypoint-tip {
          width: 0; height: 0;
          border-left: 6px solid transparent; border-right: 6px solid transparent;
          border-top: 8px solid ${borderColor}; margin-top: -1px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', { zoomControl: false, attributionControl: false })
          .setView([${currentPosition.lat}, ${currentPosition.lng}], 18);
        
        L.tileLayer('${tileUrl}', { maxZoom: 20, attribution: '${ATTRIBUTION}' }).addTo(map);

        // Layers
        const routeLayer = L.polyline([], { color: '${accentColor}', weight: 6, opacity: 0.8, lineCap: 'round' }).addTo(map);
        const pickupMarker = L.marker([0,0], { 
          icon: L.divIcon({ className: '', html: '<div class="waypoint"><div class="waypoint-icon" style="background:#f59e0b">A</div><div class="waypoint-tip"></div></div>', iconSize:[24,32], iconAnchor:[12,32] }) 
        });
        const deliveryMarker = L.marker([0,0], { 
          icon: L.divIcon({ className: '', html: '<div class="waypoint"><div class="waypoint-icon" style="background:#10b981">B</div><div class="waypoint-tip"></div></div>', iconSize:[24,32], iconAnchor:[12,32] }) 
        });

        // Rider
        let riderMarker = L.marker([${currentPosition.lat}, ${currentPosition.lng}], {
          icon: L.divIcon({
            className: '',
            html: '<div id="rider" class="rider-marker-container"><div class="rider-pulse"></div><div class="rider-core"><div class="rider-arrow"></div></div></div>',
            iconSize: [60, 60],
            iconAnchor: [30, 30]
          })
        }).addTo(map);

        window.updateRider = (lat, lng, bearing) => {
          const pos = [lat, lng];
          riderMarker.setLatLng(pos);
          document.getElementById('rider').style.transform = 'rotate(' + bearing + 'deg)';
          map.panTo(pos, { animate: true, duration: 1.2 });
        };

        window.updateWaypoints = (pLat, pLng, dLat, dLng, showP) => {
          if(showP) {
            pickupMarker.setLatLng([pLat, pLng]).addTo(map);
          } else {
            pickupMarker.remove();
          }
          if(dLat && dLng) {
            deliveryMarker.setLatLng([dLat, dLng]).addTo(map);
          }
        };

        window.updateRoute = (coordsJson) => {
          const coords = JSON.parse(coordsJson);
          routeLayer.setLatLngs(coords.map(c => [c.latitude, c.longitude]));
        };
      </script>
    </body>
    </html>
    `;
  }, [isDark, currentPosition.lat, currentPosition.lng, bearing]);

  useEffect(() => {
    if (webRef.current) {
      webRef.current.injectJavaScript(`window.updateRider(${currentPosition.lat}, ${currentPosition.lng}, ${bearing});`);
    }
  }, [currentPosition.lat, currentPosition.lng, bearing]);

  useEffect(() => {
    if (webRef.current && focusedOrder) {
      const p = focusedOrder.pickupAddress?.location?.coordinates || focusedOrder.pickupAddress?.coordinates;
      const d = focusedOrder.deliveryAddress?.location?.coordinates || focusedOrder.deliveryAddress?.coordinates;
      if(p && d) {
        webRef.current.injectJavaScript(`window.updateWaypoints(${p[1]}, ${p[0]}, ${d[1]}, ${d[0]}, ${!isPickedUp});`);
      }
    }
  }, [focusedOrder, isPickedUp]);

  useEffect(() => {
    if (webRef.current) {
      const coords = isPickedUp ? routeCoords : routeToPickup;
      if (coords.length > 0) {
        webRef.current.injectJavaScript(`window.updateRoute('${JSON.stringify(coords)}');`);
      }
    }
  }, [routeCoords, routeToPickup, isPickedUp]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.map}
        scrollEnabled={false}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  map: { flex: 1 },
  hudContainer: { position: 'absolute', bottom: 32, alignSelf: 'center' },
  hudBlur: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  hudContent: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center' },
  hudBlock: { alignItems: 'center', minWidth: 70 },
  hudDivider: { width: 1.5, height: 32, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 20 },
  hudValue: { fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.8 },
  hudLabel: { fontSize: 9, fontWeight: '900', color: '#64748b', letterSpacing: 1.5, marginTop: 1 },
});