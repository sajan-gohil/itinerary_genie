import React, { useEffect, useRef } from 'react';
import mapboxgl, { LngLatLike, Map } from 'mapbox-gl';
import polyline from 'polyline';

// Expect Vite env var: VITE_MAPBOX_TOKEN
const MAPBOX_TOKEN = (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';

const MapView: React.FC<any> = ({ itinerary, route, stops }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    if (!MAPBOX_TOKEN) {
      console.warn('Missing VITE_MAPBOX_TOKEN. Map will not render.');
      return;
    }
    mapboxgl.accessToken = MAPBOX_TOKEN;
    (mapboxgl as any).config.TELEMETRY = false;
    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/light-v10', // Light theme for new color scheme
      center: [0, 0],
      zoom: 2,
    });
    // After style loads, tweak paints for subdued labels and boosted greens
    mapInstance.current.on('load', () => {
      const map = mapInstance.current!;
      try {
        // Find all road layers and update their color
        const roadLayers = (map.getStyle().layers || [])
          .filter(l => l.id.includes('road') && l.type === 'line')
          .map(l => l.id);
        roadLayers.forEach(layerId => {
          try { map.setPaintProperty(layerId, 'line-color', '#69e4ed'); } catch {}
          try { map.setPaintProperty(layerId, 'line-opacity', 0.75); } catch {}
        });

        // Labels and parks as before
        const labelLayers = map.getStyle().layers?.filter(l => l.type === 'symbol') || [];
        labelLayers.forEach(l => {
          try { map.setPaintProperty(l.id, 'text-color', '#6F6A62'); } catch {}
          try { map.setPaintProperty(l.id, 'text-halo-color', '#FFFFFF'); } catch {}
          try { map.setPaintProperty(l.id, 'text-opacity', 0.82); } catch {}
        });

        // Parks/landcover/landuse
        const greenish = ['#eaffea', '#c8f7e0', '#a2e3d8'];
        (map.getStyle().layers || []).forEach((l, i) => {
          if (l.type === 'fill' && (l.id.includes('landcover') || l.id.includes('park') || l.id.includes('landuse'))){
            try { map.setPaintProperty(l.id, 'fill-color', greenish[i % greenish.length]); } catch {}
            try { map.setPaintProperty(l.id, 'fill-opacity', 0.6); } catch {}
          }
          if (l.type === 'fill' && l.id.includes('water')){
            try { map.setPaintProperty(l.id, 'fill-color', '#fff9e0'); } catch {}
            try { map.setPaintProperty(l.id, 'fill-opacity', 0.9); } catch {}
          }
        });
      } catch (e) {
        console.warn('Map style adjustments skipped', e);
      }
    });
  }, []);

  // Helpers
  const clearMarkers = () => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  };

  const fitBoundsIfPossible = (coords: [number, number][]) => {
    const map = mapInstance.current;
    if (!map || coords.length === 0) return;
    const b = new mapboxgl.LngLatBounds();
    coords.forEach(([lng, lat]) => b.extend([lng, lat] as LngLatLike));
    map.fitBounds(b, { padding: 40, duration: 600, maxZoom: 15 });
  };

  
  // Draw route + markers when route or stops change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !MAPBOX_TOKEN) return;

    // Remove old route layers and source immediately when route or stops change
    if (map.getLayer('route-line')) map.removeLayer('route-line');
    if (map.getLayer('route-line-glow')) map.removeLayer('route-line-glow');
    if (map.getSource('route')) map.removeSource('route');
    clearMarkers();

    // Wait for map style
    const ensureReady = () => (map as any).isStyleLoaded?.();
    const draw = () => {
      const points: [number, number][] = [];
      // Decode route polyline (Mapbox Directions returns polyline by default per server config)
      if (route?.polyline) {
        try {
          const decoded = polyline.decode(route.polyline).map(([lat, lng]: [number, number]) => [lng, lat]) as [number, number][];
          if (decoded.length) {
            map.addSource('route', {
              type: 'geojson',
              lineMetrics: true as any,
              data: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: decoded },
                properties: {},
              },
            });
            // Sage glow + gradient core (sage -> teal)
            const gradient = [
              'interpolate', ['linear'], ['line-progress'],
              0, '#A7C7A9',
              1, '#558B7C'
            ];
            map.addLayer({ id: 'route-line-glow', type: 'line', source: 'route', paint: { 'line-color': '#a0c9a3', 'line-width': 8, 'line-opacity': 0.25 } });
            map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-width': 5, 'line-opacity': 0.9 } });
            points.push(...decoded);
          }
        } catch (e) {
          console.warn('Failed to decode route polyline', e);
        }
      }

      // Origin marker
      const origin = itinerary?.routeRequest?.origin;
      if (origin && typeof origin.lat === 'number' && typeof origin.lon === 'number') {
        const el = document.createElement('div');
        el.className = 'w-8 h-8 bg-sage grid place-items-center';
        el.innerHTML = '<img src="/assets/camera.svg" alt="origin" class="w-4 h-4 opacity-90" />';
        const m = new mapboxgl.Marker({ element: el as any })
          .setLngLat([origin.lon, origin.lat])
          .addTo(map);
        markersRef.current.push(m);
        points.push([origin.lon, origin.lat]);
      }

      // Stop markers
      const stopCoords: [number, number][] = Array.isArray(stops)
        ? stops
            .map((s: any) => s?.place?.location)
            .filter((loc: any) => loc && typeof loc.lat === 'number' && typeof loc.lon === 'number')
            .map((loc: any) => [loc.lon, loc.lat] as [number, number])
        : [];
      stopCoords.forEach((lngLat, idx) => {
        const el = document.createElement('div');
        el.className = 'w-8 h-8 bg-rust grid place-items-center transition-smooth';
        el.innerHTML = '<img src="/assets/leaf.svg" alt="stop" class="w-4 h-4 opacity-95" />';
        const m = new mapboxgl.Marker({ element: el as any })
          .setLngLat(lngLat)
          .setPopup(new mapboxgl.Popup({ offset: 20, closeButton: false, className: 'rounded-panel' })
            .setHTML(`<div class="bg-panel p-3 rounded-md">
  <div class="font-lora text-body text-text-deep leading-tight">${(stops[idx]?.place?.name || `Stop ${idx + 1}`)}</div>
</div>`))
          .addTo(map);
        markersRef.current.push(m);
        points.push(lngLat);
      });

      // Fit bounds to all points
      if (points.length) fitBoundsIfPossible(points);
    };

    if (ensureReady()) {
      draw();
    } else {
      const onLoad = () => draw();
      map.once('load', onLoad);
      return () => { map.off('load', onLoad); };
    }
  }, [route, stops, itinerary]);

  return <div ref={mapRef} className="w-full h-full" />;
};

export default MapView;
