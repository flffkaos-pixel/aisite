import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import TimelineScreen from './src/TimelineScreen';
import GpsScreen from './src/GpsScreen';

type Tab = 'timeline' | 'gps';

export default function App() {
  const [tab, setTab] = useState<Tab>('timeline');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {tab === 'timeline' ? <TimelineScreen /> : <GpsScreen />}
      <View style={styles.tabBar}>
        <TabButton
          label="타임라인"
          active={tab === 'timeline'}
          onPress={() => setTab('timeline')}
        />
        <TabButton label="GPS 추적" active={tab === 'gps'} onPress={() => setTab('gps')} />
      </View>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <View style={[styles.tabDot, active && styles.tabDotActive]} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10131a' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1f2b',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabDotActive: { backgroundColor: '#ff2d6c' },
  tabText: { color: '#8b93a5', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
});