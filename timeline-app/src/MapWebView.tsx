import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { MAP_HTML } from './mapHtml';

export interface MapWebViewHandle {
  setTimelineData: (trips: unknown[], loopLength: number) => void;
  setPlaying: (value: boolean) => void;
  setSpeed: (value: number) => void;
  setCurrentTime: (value: number) => void;
  setGpsPosition: (lat: number, lon: number) => void;
  setMode: (mode: string) => void;
}

interface MapWebViewProps {
  onReady?: () => void;
  onMessage?: (msg: Record<string, unknown>) => void;
}

const MapWebView = forwardRef<MapWebViewHandle, MapWebViewProps>(
  ({ onReady, onMessage }, ref) => {
    const webviewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      setTimelineData: (trips, loopLength) => {
        const payload = JSON.stringify({ trips, loopLength });
        webviewRef.current?.injectJavaScript(
          `window.setTimelineData && window.setTimelineData(${payload}); true;`,
        );
      },
      setPlaying: (value) => {
        webviewRef.current?.injectJavaScript(`window.setPlaying(${value}); true;`);
      },
      setSpeed: (value) => {
        webviewRef.current?.injectJavaScript(`window.setSpeed(${value}); true;`);
      },
      setCurrentTime: (value) => {
        webviewRef.current?.injectJavaScript(`window.setCurrentTime(${value}); true;`);
      },
      setGpsPosition: (lat, lon) => {
        webviewRef.current?.injectJavaScript(
          `window.setGpsPosition(${lat}, ${lon}); true;`,
        );
      },
      setMode: (mode) => {
        webviewRef.current?.injectJavaScript(`window.setMode('${mode}'); true;`);
      },
    }));

    const handleMessage = (event: WebViewMessageEvent) => {
      let msg: Record<string, unknown> = {};
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === 'ready') {
        onReady?.();
      }
      onMessage?.(msg);
    };

    return (
      <WebView
        ref={webviewRef}
        source={{ html: MAP_HTML }}
        style={{ flex: 1, backgroundColor: '#10131a' }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        onMessage={handleMessage}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
        setSupportMultipleWindows={false}
      />
    );
  },
);

export default MapWebView;