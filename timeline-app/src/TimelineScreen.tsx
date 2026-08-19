import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { parseTimeline, type Trip } from './parseTimeline';
import MapWebView, { type MapWebViewHandle } from './MapWebView';

type Phase = 'idle' | 'loading' | 'ready';

export default function TimelineScreen() {
  const mapRef = useRef<MapWebViewHandle>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loopLength, setLoopLength] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [currentTime, setCurrentTime] = useState(0);
  const [webReady, setWebReady] = useState(false);

  const formatDate = useCallback((sec: number) => {
    const d = new Date(sec * 1000);
    return d.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const progressLabel = useMemo(() => {
    const pct = loopLength > 0 ? Math.min(100, Math.round((currentTime / loopLength) * 100)) : 0;
    return `${pct}%`;
  }, [currentTime, loopLength]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setFileName(asset.name);
      setPhase('loading');
      setError(null);

      const file = new File(asset.uri);
      const text = file.textSync();
      const parsed = parseTimeline(text);
      setTrips(parsed.trips);
      setLoopLength(parsed.duration);
      setCurrentTime(0);
      setPlaying(true);

      if (webReady) {
        mapRef.current?.setTimelineData(parsed.trips, parsed.duration);
        mapRef.current?.setMode('timeline');
        mapRef.current?.setPlaying(true);
      }
      setPhase('ready');
    } catch (e) {
      setPhase('idle');
      setError(e instanceof Error ? e.message : String(e));
      Alert.alert('오류', e instanceof Error ? e.message : String(e));
    }
  };

  const handleReady = useCallback(() => {
    setWebReady(true);
    if (phase === 'ready' && trips.length > 0) {
      mapRef.current?.setTimelineData(trips, loopLength);
      mapRef.current?.setMode('timeline');
      mapRef.current?.setPlaying(playing);
      mapRef.current?.setSpeed(speed);
    }
  }, [phase, trips, loopLength, playing, speed]);

  const togglePlay = useCallback(() => {
    const next = !playing;
    setPlaying(next);
    mapRef.current?.setPlaying(next);
  }, [playing]);

  const changeSpeed = useCallback((s: number) => {
    setSpeed(s);
    mapRef.current?.setSpeed(s);
  }, []);

  const onSlider = useCallback((value: number) => {
    setCurrentTime(value);
    mapRef.current?.setCurrentTime(value);
  }, []);

  return (
    <View style={styles.container}>
      <MapWebView
        ref={mapRef}
        onReady={handleReady}
        onMessage={(msg: Record<string, unknown>) => {
          if (msg.type === 'progress') {
            setCurrentTime(Number(msg.currentTime ?? 0));
          }
        }}
      />

      <View style={styles.panel}>
        {phase === 'idle' && (
          <>
            <Text style={styles.title}>여행 타임라인 재생</Text>
            <Text style={styles.subtitle}>
              구글 타임라인에서 내보낸 Timeline.json 파일을 선택하세요.{'\n'}
              경로를 따라 움직이는 마커 애니메이션을 재생합니다.
            </Text>
            <Pressable style={styles.primaryButton} onPress={pickFile}>
              <Text style={styles.primaryButtonText}>Timeline.json 선택</Text>
            </Pressable>
            {error && <Text style={styles.error}>{error}</Text>}
          </>
        )}

        {phase === 'loading' && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.subtitle}>파일 분석 중...</Text>
          </View>
        )}

        {phase === 'ready' && (
          <ScrollView>
            <View style={styles.rowBetween}>
              <Text style={styles.fileName} numberOfLines={1}>
                {fileName}
              </Text>
              <Pressable onPress={pickFile}>
                <Text style={styles.link}>다른 파일</Text>
              </Pressable>
            </View>

            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>{progressLabel}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={Math.max(1, loopLength)}
                value={currentTime}
                onValueChange={onSlider}
                minimumTrackTintColor="#ff2d6c"
                maximumTrackTintColor="rgba(255,255,255,0.25)"
                thumbTintColor="#fff"
              />
            </View>
            <Text style={styles.timeText}>
              {formatDate(currentTime)} / {formatDate(loopLength)}
            </Text>

            <View style={styles.controls}>
              <Pressable style={styles.controlButton} onPress={togglePlay}>
                <Text style={styles.controlButtonText}>{playing ? '⏸ 일시정지' : '▶ 재생'}</Text>
              </Pressable>
              {[2, 5, 15, 40].map((s) => (
                <Pressable
                  key={s}
                  style={[styles.speedButton, speed === s && styles.speedButtonActive]}
                  onPress={() => changeSpeed(s)}
                >
                  <Text
                    style={[
                      styles.speedButtonText,
                      speed === s && styles.speedButtonTextActive,
                    ]}
                  >
                    {s}x
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
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
  primaryButton: {
    backgroundColor: '#ff2d6c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  error: { color: '#ff8080', fontSize: 12, marginTop: 10 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  fileName: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  link: { color: '#ff2d6c', fontSize: 13, fontWeight: '600' },
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  sliderLabel: { color: '#fff', fontSize: 13, width: 46, textAlign: 'right', marginRight: 10 },
  slider: { flex: 1, height: 36 },
  timeText: { color: '#8b93a5', fontSize: 11, marginBottom: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  controlButton: {
    backgroundColor: '#ff2d6c',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  controlButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  speedButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  speedButtonActive: { backgroundColor: 'rgba(255,45,108,0.25)' },
  speedButtonText: { color: '#b8c0d0', fontSize: 14, fontWeight: '600' },
  speedButtonTextActive: { color: '#ff2d6c' },
});