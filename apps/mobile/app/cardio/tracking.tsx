import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../App";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "@/lib/location";
import * as Battery from "@/lib/battery";
import * as SecureStore from "@/lib/secure-store";
import * as Haptics from "@/lib/haptics";
import { usePowerSync } from "@powersync/react";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { startGpsTracking, stopGpsTracking } from "@/lib/gps-task";
import {
  initGpsBuffer,
  insertBufferPoint,
  getBufferPoints,
  clearBuffer,
} from "@/lib/gps-buffer";
import { haversineDistance, calculatePace } from "@/lib/geo-utils";
import { RouteMap } from "@/components/cardio/route-map";
import { LiveStatsBar } from "@/components/cardio/live-stats-bar";
import { writeCardioToHealthKit } from "@/lib/healthkit";
import { writeCardioToGoogleFit } from "@/lib/googlefit";

const colors = {
  bg: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  muted: "hsl(215, 20%, 65%)",
  danger: "hsl(0, 72%, 51%)",
  warning: "hsl(38, 92%, 50%)",
};

interface RoutePoint {
  latitude: number;
  longitude: number;
}

export default function TrackingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CardioTracking">>();
  const type = route.params?.type;
  const resumeSessionId = route.params?.sessionId;
  const db = usePowerSync();
  const { user } = useAuth();
  const unitSystem = (user?.unitSystem as "metric" | "imperial") ?? "metric";

  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [weakSignal, setWeakSignal] = useState(false);
  const [lowBattery, setLowBattery] = useState(false);
  const [stopping, setStopping] = useState(false);

  const sessionIdRef = useRef<string | null>(resumeSessionId ?? null);
  const lastPointRef = useRef<RoutePoint | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const fgSubRef = useRef<Location.LocationSubscription | null>(null);
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const distanceRef = useRef(0);

  // Duration timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Weak signal check
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastUpdateRef.current;
      setWeakSignal(elapsed > 10000);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Battery check
  useEffect(() => {
    async function checkBattery() {
      try {
        const level = await Battery.getBatteryLevelAsync();
        setLowBattery(level > 0 && level < 0.15);
      } catch {
        // Battery API not available
      }
    }
    checkBattery();
    const interval = setInterval(checkBattery, 60000);
    return () => clearInterval(interval);
  }, []);

  // Initialize session and start tracking
  useEffect(() => {
    let cancelled = false;

    async function init() {
      await initGpsBuffer(db);

      let sid = sessionIdRef.current;
      if (!sid) {
        sid = `cardio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const now = new Date().toISOString();
        await db.execute(
          `INSERT INTO cardio_sessions (id, user_id, type, source, started_at, created_at)
           VALUES (?, ?, ?, 'gps', ?, ?)`,
          [sid, user!.id, type, now, now]
        );
        sessionIdRef.current = sid;
      }

      await SecureStore.setItemAsync("active-cardio-session", sid);

      if (cancelled) return;

      // Start background tracking
      const sub = await startGpsTracking(sid);
      fgSubRef.current = sub;

      // Foreground watch for UI updates
      const watchSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (location) => {
          if (cancelled) return;
          const point: RoutePoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          lastUpdateRef.current = Date.now();

          // Insert into buffer
          insertBufferPoint(
            db,
            sessionIdRef.current!,
            {
              latitude: point.latitude,
              longitude: point.longitude,
              altitude: location.coords.altitude,
            },
            new Date(location.timestamp).toISOString()
          );

          // Update distance
          if (lastPointRef.current) {
            const delta = haversineDistance(
              lastPointRef.current.latitude,
              lastPointRef.current.longitude,
              point.latitude,
              point.longitude
            );
            distanceRef.current += delta;
            setDistanceMeters(distanceRef.current);
          }
          lastPointRef.current = point;

          setRoutePoints((prev) => [...prev, point]);
        }
      );
      watchSubRef.current = watchSub;
    }

    init();

    return () => {
      cancelled = true;
      fgSubRef.current?.remove();
      watchSubRef.current?.remove();
    };
  }, []);

  const handleStop = useCallback(async () => {
    if (stopping) return;
    setStopping(true);

    try {
      // Stop tracking
      fgSubRef.current?.remove();
      watchSubRef.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
      await stopGpsTracking();

      const sid = sessionIdRef.current!;
      const finalDuration = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );
      const finalDistance = distanceRef.current;

      // Update session
      await db.execute(
        `UPDATE cardio_sessions SET duration_seconds = ?, distance_meters = ? WHERE id = ?`,
        [finalDuration, finalDistance, sid]
      );

      // Try uploading buffer points
      try {
        const points = await getBufferPoints(db, sid);
        await trpc.cardio.completeGpsSession.mutate({
          sessionId: sid,
          points: points.map((p) => ({
            latitude: p.latitude,
            longitude: p.longitude,
            elevation_m: p.elevation_m,
            timestamp: p.timestamp,
          })),
        });
        await clearBuffer(db, sid);
      } catch {
        // Upload failed — mark for retry
        await SecureStore.setItemAsync("pending-gps-upload", sid);
      }

      await SecureStore.deleteItemAsync("active-cardio-session");

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      writeCardioToHealthKit({
        type: type!,
        started_at: new Date(startTimeRef.current).toISOString(),
        duration_seconds: finalDuration,
        distance_meters: finalDistance,
        calories: null,
      }).catch(() => {});

      writeCardioToGoogleFit({
        type: type!,
        started_at: new Date(startTimeRef.current).toISOString(),
        duration_seconds: finalDuration,
        distance_meters: finalDistance,
        calories: null,
      }).catch(() => {});

      navigation.navigate("CardioSummary", { sessionId: sid, type: type! });
    } catch (e) {
      console.error("Failed to stop tracking:", e);
      setStopping(false);
    }
  }, [stopping, db, navigation, type]);

  const pace = calculatePace(distanceMeters, durationSeconds);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ flex: 1 }}>
        {/* Banners */}
        {weakSignal && (
          <View
            style={{
              backgroundColor: colors.warning,
              paddingVertical: 8,
              paddingHorizontal: 16,
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
            }}
          >
            <Text
              style={{
                color: colors.bg,
                fontSize: 13,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Weak GPS signal
            </Text>
          </View>
        )}
        {lowBattery && (
          <View
            style={{
              backgroundColor: colors.danger,
              paddingVertical: 8,
              paddingHorizontal: 16,
              position: "absolute",
              top: weakSignal ? 34 : 0,
              left: 0,
              right: 0,
              zIndex: 10,
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: 13,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Battery below 15%
            </Text>
          </View>
        )}

        {/* Map — top 60% */}
        <View style={{ flex: 6 }}>
          <RouteMap routePoints={routePoints} followUser interactive />
        </View>

        {/* Live Stats */}
        <LiveStatsBar
          durationSeconds={durationSeconds}
          distanceMeters={distanceMeters}
          paceSecondsPerKm={pace}
          unitSystem={unitSystem}
        />

        {/* Stop Button */}
        <View
          style={{
            flex: 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.bg,
          }}
        >
          <Pressable
            testID="stop-tracking"
            style={{
              backgroundColor: colors.danger,
              width: 72,
              height: 72,
              borderRadius: 36,
              alignItems: "center",
              justifyContent: "center",
              opacity: stopping ? 0.6 : 1,
            }}
            onPress={handleStop}
            disabled={stopping}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                backgroundColor: colors.foreground,
              }}
            />
          </Pressable>
          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              marginTop: 8,
            }}
          >
            {stopping ? "Stopping..." : "Stop"}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
