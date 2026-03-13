"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RouteMapProps {
  points: { lat: number; lng: number }[];
  height?: string;
  interactive?: boolean;
}

function RouteMapInner({ points, height = "300px", interactive = false }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;

    // Clean up previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const latLngs = points.map((p) => [p.lat, p.lng] as L.LatLngTuple);
    const polyline = L.polyline(latLngs, {
      color: "hsl(262, 83%, 58%)",
      weight: 3,
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [points, interactive]);

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-xl"
    />
  );
}

export default RouteMapInner;
