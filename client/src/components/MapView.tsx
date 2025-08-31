import React, { useEffect, useRef } from 'react';
import mapboxgl, { LngLatLike, Map } from 'mapbox-gl';
import polyline from 'polyline';

// Expect Vite env var: VITE_MAPBOX_TOKEN
const MAPBOX_TOKEN = (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';

const MapView: React.FC<any> = ({ itinerary, route, stops }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  // Keep latest props for event-driven redraws
  const latestRef = useRef<{ itinerary: any; route: any; stops: any[] }>({ itinerary, route, stops });
  useEffect(() => {
    latestRef.current = { itinerary, route, stops } as any;
  }, [itinerary, route, stops]);

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
      // Attempt to build coordinates from server route or fallback to straight lines between origin/stops
      let routeCoords: [number, number][] | null = null;
      // 1) Decode route polyline (precision 5, then 6 fallback)
      if (route?.polyline && typeof route.polyline === 'string') {
        try {
          const d5 = polyline
            .decode(route.polyline)
            .map(([lat, lng]: [number, number]) => [lng, lat]) as [number, number][];
          if (Array.isArray(d5) && d5.length > 1) routeCoords = d5;
        } catch (e) {
          // swallow, try precision 6 next
        }
        if (!routeCoords) {
          try {
            // Some APIs may return polyline6 even if not requested; try as fallback
            const d6 = (polyline as any)
              .decode(route.polyline, 6)
              .map(([lat, lng]: [number, number]) => [lng, lat]) as [number, number][];
            if (Array.isArray(d6) && d6.length > 1) routeCoords = d6;
          } catch (e) {
            console.warn('Failed to decode route polyline (p5 & p6)');
          }
        }
      }
      // 2) Optional: accept coordinates shape directly if provided by server in future
      if (!routeCoords && Array.isArray((route as any)?.coordinates)) {
        const raw = (route as any).coordinates;
        if (raw.every((p: any) => Array.isArray(p) && p.length === 2 && p.every((n: any) => typeof n === 'number')))
          routeCoords = raw as [number, number][];
      }
      // 3) Fallback to a simple polyline connecting origin and stops so users still see a path
      if (!routeCoords) {
        const origin = itinerary?.routeRequest?.origin;
        const stopCoords: [number, number][] = Array.isArray(stops)
          ? stops
              .map((s: any) => s?.place?.location)
              .filter((loc: any) => loc && typeof loc.lat === 'number' && typeof loc.lon === 'number')
              .map((loc: any) => [loc.lon, loc.lat] as [number, number])
          : [];
        if (origin && typeof origin.lat === 'number' && typeof origin.lon === 'number') {
          const simple = [[origin.lon, origin.lat] as [number, number], ...stopCoords];
          if (simple.length > 1) routeCoords = simple;
        }
      }

      if (routeCoords && routeCoords.length > 1) {
        try {
          map.addSource('route', {
            type: 'geojson',
            // required for line-gradient expressions using line-progress
            lineMetrics: true as any,
            data: {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: routeCoords },
              properties: {},
            },
          });
          // Sage glow + gradient core (sage -> teal)
          // const gradient = [
          //   'interpolate', ['linear'], ['line-progress'],
          //   0, '#A7C7A9',
          //   1, '#558B7C'
          // ];
          map.addLayer({
            id: 'route-line-glow',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#748175', 'line-width': 8, 'line-opacity': 0.8 }
          });
          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#5da692', 'line-width': 5, 'line-opacity': 0.95 }
          });
          points.push(...routeCoords);
        } catch (e) {
          console.warn('Failed to add route layer', e);
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

  // Redraw if layers/markers get dropped after zoom/style changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !MAPBOX_TOKEN) return;

    const redraw = () => {
      const isReady = (map as any).isStyleLoaded?.();
      if (!isReady) return;
      const hasRouteLayer = !!map.getLayer('route-line');
      const hasRouteSource = !!map.getSource('route');
      const hasMarkers = markersRef.current.length > 0;
      if (hasRouteLayer && hasRouteSource && hasMarkers) return; // nothing to do

      // Rebuild using latest data, without refitting bounds (avoid jarring zoom)
      const { itinerary, route, stops } = latestRef.current || {};
      // Remove existing remnants
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getLayer('route-line-glow')) map.removeLayer('route-line-glow');
      if (map.getSource('route')) map.removeSource('route');
      clearMarkers();

      // Compute coordinates
      let routeCoords: [number, number][] | null = null;
      if (route?.polyline && typeof route.polyline === 'string') {
        try {
          const d5 = polyline.decode(route.polyline).map(([lat, lng]: [number, number]) => [lng, lat]) as [number, number][];
          if (d5.length > 1) routeCoords = d5;
        } catch {}
        if (!routeCoords) {
          try {
            const d6 = (polyline as any).decode(route.polyline, 6).map(([lat, lng]: [number, number]) => [lng, lat]) as [number, number][];
            if (d6.length > 1) routeCoords = d6;
          } catch {}
        }
      }
      if (!routeCoords && Array.isArray((route as any)?.coordinates)) {
        const raw = (route as any).coordinates;
        if (raw.every((p: any) => Array.isArray(p) && p.length === 2 && p.every((n: any) => typeof n === 'number')))
          routeCoords = raw as [number, number][];
      }
      if (!routeCoords) {
        const origin = itinerary?.routeRequest?.origin;
        const stopCoords: [number, number][] = Array.isArray(stops)
          ? stops
              .map((s: any) => s?.place?.location)
              .filter((loc: any) => loc && typeof loc.lat === 'number' && typeof loc.lon === 'number')
              .map((loc: any) => [loc.lon, loc.lat] as [number, number])
          : [];
        if (origin && typeof origin.lat === 'number' && typeof origin.lon === 'number') {
          const simple = [[origin.lon, origin.lat] as [number, number], ...stopCoords];
          if (simple.length > 1) routeCoords = simple;
        }
      }

      try {
        if (routeCoords && routeCoords.length > 1) {
          map.addSource('route', {
            type: 'geojson',
            lineMetrics: true as any,
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoords }, properties: {} },
          });
          map.addLayer({ id: 'route-line-glow', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#748175', 'line-width': 8, 'line-opacity': 0.8 } });
          map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#5da692', 'line-width': 5, 'line-opacity': 0.95 } });
        }
      } catch (e) {
        console.warn('Redraw failed to add route', e);
      }

      // Origin marker
      const origin = itinerary?.routeRequest?.origin;
      const newPoints: [number, number][] = [];
      if (origin && typeof origin.lat === 'number' && typeof origin.lon === 'number') {
        const el = document.createElement('div');
        el.className = 'w-8 h-8 bg-sage grid place-items-center';
        el.innerHTML = '<img src="/assets/camera.svg" alt="origin" class="w-4 h-4 opacity-90" />';
        const m = new mapboxgl.Marker({ element: el as any }).setLngLat([origin.lon, origin.lat]).addTo(map);
        markersRef.current.push(m);
        newPoints.push([origin.lon, origin.lat]);
      }

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
        newPoints.push(lngLat);
      });
      // Do not fit bounds here to avoid interrupting user zoom
    };

    map.on('zoomend', redraw);
    map.on('styledata', redraw);
    map.on('idle', redraw);
    return () => {
      map.off('zoomend', redraw);
      map.off('styledata', redraw);
      map.off('idle', redraw);
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full" />;
};

export default MapView;
