import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import type { LocationSubscription } from 'expo-location';
import MapWebView, { type MapWebViewHandle } from './MapWebView';

export default function GpsScreen() {
  const mapRef = useRef<MapWebViewHandle>(null);
  const [tracking, setTracking] = useState(false);
  const [permission, setPermission] = useState<Location.LocationPermissionResponse | null>(null);
  const [position, setPosition] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<LocationSubscription | null>(null);
  const [webReady, setWebReady] = useState(false);

  const requestPermission = useCallback(async () => {
    const res = await Location.requestForegroundPermissionsAsync();
    setPermission(res);
    if (!res.granted) {
      setError('위치 권한이 필요합니다. 설정에서 허용해주세요.');
    }
    return res.granted;
  }, []);

  const startTracking = useCallback(async () => {
    setError(null);
    let granted = permission?.granted ?? false;
    if (!granted) {
      granted = await requestPermission();
    }
    if (!granted) return;

    const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setPosition(initial);
    mapRef.current?.setMode('gps');
    mapRef.current?.setGpsPosition(initial.coords.latitude, initial.coords.longitude);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 3,
        timeInterval: 1000,
      },
      (loc) => {
        setPosition(loc);
        mapRef.current?.setGpsPosition(loc.coords.latitude, loc.coords.longitude);
      },
    );
    subscriptionRef.current = sub;
    setTracking(true);
  }, [permission, requestPermission]);

  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setTracking(false);
  }, []);

  useEffect(() => {
    return () => {
      subscriptionRef.current?.remove();
    };
  }, []);

  const handleReady = useCallback(() => {
    setWebReady(true);
    if (tracking && position) {
      mapRef.current?.setMode('gps');
      mapRef.current?.setGpsPosition(position.coords.latitude, position.coords.longitude);
    }
  }, [tracking, position]);

  useEffect(() => {
    if (webReady && tracking && position) {
      mapRef.current?.setMode('gps');
      mapRef.current?.setGpsPosition(position.coords.latitude, position.coords.longitude);
    }
  }, [webReady, tracking, position]);

  const toggleTracking = () => {
    if (tracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  return (
    <View style={styles.container}>
      <MapWebView ref={mapRef} onReady={handleReady} />

      <View style={styles.panel}>
        <Text style={styles.title}>실시간 GPS 추적</Text>
        <Text style={styles.subtitle}>
          폰의 위치를 받아 지도 위에서 움직이는 마커로 표시하고 경로를 그립니다.
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>위도</Text>
            <Text style={styles.infoValue}>
              {position ? position.coords.latitude.toFixed(6) : '-'}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>경도</Text>
            <Text style={styles.infoValue}>
              {position ? position.coords.longitude.toFixed(6) : '-'}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>속도</Text>
            <Text style={styles.infoValue}>
              {position?.coords.speed != null
                ? `${(position.coords.speed * 3.6).toFixed(1)} km/h`
                : '-'}
            </Text>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, tracking && styles.buttonStop]}
          onPress={toggleTracking}
        >
          <Text style={styles.buttonText}>
            {tracking ? '⏹ 추적 중지' : '▶ 추적 시작'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10131a' },
  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(16,19,26,0.92)',
    borderRadius: 18,
    padding: 16,
    paddingBottom: 24,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#b8c0d0', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  infoBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 10,
  },
  infoLabel: { color: '#8b93a5', fontSize: 11, marginBottom: 4 },
  infoValue: { color: '#fff', fontSize: 13, fontWeight: '700' },
  error: { color: '#ff8080', fontSize: 12, marginBottom: 10 },
  button: {
    backgroundColor: '#0096ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonStop: { backgroundColor: '#ff2d6c' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});