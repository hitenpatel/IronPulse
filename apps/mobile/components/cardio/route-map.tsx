import React, { useEffect, useRef } from "react";
import { Platform, View, Text, type ViewStyle } from "react-native";

let MapView: any = null;
let Polyline: any = null;
try {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Polyline = maps.Polyline;
} catch {}

const PRIMARY_COLOR = "hsl(210, 40%, 98%)";

interface RoutePoint {
  latitude: number;
  longitude: number;
}

interface RouteMapProps {
  routePoints: RoutePoint[];
  followUser?: boolean;
  interactive?: boolean;
  style?: ViewStyle;
}

export function RouteMap({
  routePoints,
  followUser = false,
  interactive = true,
  style,
}: RouteMapProps) {
  const mapRef = useRef<MapView>(null);

  // Follow user: animate to the latest point when it changes
  useEffect(() => {
    if (!followUser || routePoints.length === 0 || !mapRef.current) return;

    const last = routePoints[routePoints.length - 1];
    mapRef.current.animateToRegion(
      {
        latitude: last.latitude,
        longitude: last.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      300
    );
  }, [followUser, routePoints]);

  // Summary view: fit to all coordinates when not interactive
  useEffect(() => {
    if (interactive || routePoints.length < 2 || !mapRef.current) return;

    mapRef.current.fitToCoordinates(routePoints, {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: false,
    });
  }, [interactive, routePoints]);

  if (!MapView) {
    return (
      <View style={[{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0F1629" }, style]}>
        <Text style={{ color: "#4E6180", fontSize: 14 }}>Map not available</Text>
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      userInterfaceStyle="dark"
      showsUserLocation={interactive}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={interactive}
      pitchEnabled={interactive}
      style={[{ flex: 1 }, style]}
    >
      {routePoints.length >= 2 && Polyline && (
        <Polyline
          coordinates={routePoints}
          strokeColor={PRIMARY_COLOR}
          strokeWidth={4}
        />
      )}
    </MapView>
  );
}
